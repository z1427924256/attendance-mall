<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData } from '@arco-design/web-vue';
import dayjs from 'dayjs';
import { useAdminStore } from '@/store/admin';
import { exportCsv } from '@/utils/exportCsv';
import VChartView from '@/components/VChartView.vue';
import type { AttendanceRecord } from '@/types';

const store = useAdminStore();

onMounted(() => {
  if (!store.merchants.length || !store.records.length) {
    store.loadFromApi();
  }
});

// ===== 粒度与日期选择 =====
type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
const granularity = ref<Granularity>('month');

const granularityOptions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '季', value: 'quarter' },
  { label: '年', value: 'year' },
];

// 单日使用 DatePicker，其余使用 RangePicker
const baseDate = ref<string>(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
const compareDate = ref<string>(dayjs().format('YYYY-MM-DD'));
const baseRange = ref<string[]>([
  dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
  dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
]);
const compareRange = ref<string[]>([
  dayjs().startOf('month').format('YYYY-MM-DD'),
  dayjs().endOf('month').format('YYYY-MM-DD'),
]);

function quarterStart(d: dayjs.Dayjs): dayjs.Dayjs {
  const qStart = Math.floor(d.month() / 3) * 3;
  return d.month(qStart).startOf('month');
}

// 切换粒度时设置合理的默认区间
watch(granularity, (g) => {
  const today = dayjs();
  if (g === 'day') {
    baseDate.value = today.subtract(1, 'day').format('YYYY-MM-DD');
    compareDate.value = today.format('YYYY-MM-DD');
    return;
  }
  let baseS: dayjs.Dayjs;
  let baseE: dayjs.Dayjs;
  let cmpS: dayjs.Dayjs;
  let cmpE: dayjs.Dayjs;
  switch (g) {
    case 'week':
      cmpS = today.startOf('week');
      cmpE = today.endOf('week');
      baseS = cmpS.subtract(1, 'week');
      baseE = cmpE.subtract(1, 'week');
      break;
    case 'month':
      cmpS = today.startOf('month');
      cmpE = today.endOf('month');
      baseS = cmpS.subtract(1, 'month');
      baseE = cmpE.subtract(1, 'month');
      break;
    case 'quarter':
      cmpS = quarterStart(today);
      cmpE = cmpS.add(2, 'month').endOf('month');
      baseS = cmpS.subtract(3, 'month');
      baseE = cmpE.subtract(3, 'month');
      break;
    case 'year':
      cmpS = today.startOf('year');
      cmpE = today.endOf('year');
      baseS = cmpS.subtract(1, 'year');
      baseE = cmpE.subtract(1, 'year');
      break;
  }
  baseRange.value = [baseS!.format('YYYY-MM-DD'), baseE!.format('YYYY-MM-DD')];
  compareRange.value = [cmpS!.format('YYYY-MM-DD'), cmpE!.format('YYYY-MM-DD')];
});

const baseStart = computed(() =>
  granularity.value === 'day' ? baseDate.value : baseRange.value?.[0] ?? ''
);
const baseEnd = computed(() =>
  granularity.value === 'day' ? baseDate.value : baseRange.value?.[1] ?? ''
);
const compareStart = computed(() =>
  granularity.value === 'day' ? compareDate.value : compareRange.value?.[0] ?? ''
);
const compareEnd = computed(() =>
  granularity.value === 'day' ? compareDate.value : compareRange.value?.[1] ?? ''
);

// ===== 比率计算 =====
function recordsInRange(start: string, end: string): AttendanceRecord[] {
  if (!start || !end) return [];
  return store.records.filter((r) => r.date >= start && r.date <= end);
}

function rateOf(recs: AttendanceRecord[]): number {
  if (!recs.length) return 0;
  const signedIn = recs.filter((r) => r.status === 'signedIn').length;
  return Math.round((signedIn / recs.length) * 1000) / 10;
}

const baseRecords = computed(() => recordsInRange(baseStart.value, baseEnd.value));
const compareRecords = computed(() => recordsInRange(compareStart.value, compareEnd.value));

const baseRate = computed(() => rateOf(baseRecords.value));
const compareRate = computed(() => rateOf(compareRecords.value));
const diffRate = computed(() => Math.round((compareRate.value - baseRate.value) * 10) / 10);
const growthRate = computed(() => {
  if (baseRate.value === 0) return 0;
  return Math.round(((compareRate.value - baseRate.value) / baseRate.value) * 1000) / 10;
});

function fmtSigned(v: number) {
  return `${v > 0 ? '+' : ''}${v}`;
}

// ===== 趋势对比：每日到岗率，按序号对齐 =====
function dailyRates(recs: AttendanceRecord[]): number[] {
  const byDate = new Map<string, AttendanceRecord[]>();
  recs.forEach((r) => {
    const arr = byDate.get(r.date) ?? [];
    arr.push(r);
    byDate.set(r.date, arr);
  });
  return Array.from(byDate.keys())
    .sort()
    .map((d) => rateOf(byDate.get(d)!));
}

const trendSpec = computed(() => {
  const baseDays = dailyRates(baseRecords.value);
  const compareDays = dailyRates(compareRecords.value);
  const maxLen = Math.max(baseDays.length, compareDays.length);
  const values: { idx: string; type: string; value: number }[] = [];
  for (let i = 0; i < maxLen; i++) {
    const label = `第${i + 1}天`;
    values.push({ idx: label, type: '基期', value: baseDays[i] ?? 0 });
    values.push({ idx: label, type: '对比期', value: compareDays[i] ?? 0 });
  }
  return {
    type: 'area',
    data: [{ id: 'trend', values }],
    series: [
      {
        type: 'area',
        xField: 'idx',
        yField: 'value',
        seriesField: 'type',
        area: { style: { fillOpacity: 0.25 } },
        line: { style: { lineWidth: 2 } },
      },
    ],
    axes: [
      { orient: 'bottom', type: 'band' },
      { orient: 'left', type: 'linear', title: { visible: true, text: '到岗率(%)' } },
    ],
    legends: { visible: true, position: 'top' },
    tooltip: { visible: true },
  };
});

// ===== 楼层对比 =====
const floorSpec = computed(() => {
  const floors = Array.from(new Set(store.merchants.map((m) => m.floor))).filter(Boolean).sort();
  const values: { floor: string; type: string; value: number }[] = [];
  floors.forEach((f) => {
    const mids = store.merchants.filter((m) => m.floor === f).map((m) => m.id);
    const base = baseRecords.value.filter((r) => mids.includes(r.merchantId));
    const comp = compareRecords.value.filter((r) => mids.includes(r.merchantId));
    values.push({ floor: f, type: '基期', value: rateOf(base) });
    values.push({ floor: f, type: '对比期', value: rateOf(comp) });
  });
  return {
    type: 'bar',
    data: [{ id: 'floor', values }],
    series: [{ type: 'bar', xField: 'floor', yField: 'value', seriesField: 'type' }],
    axes: [
      { orient: 'bottom', type: 'band' },
      { orient: 'left', type: 'linear', title: { visible: true, text: '到岗率(%)' } },
    ],
    legends: { visible: true, position: 'top' },
    tooltip: { visible: true },
  };
});

// ===== 异常商户明细表 =====
interface AbnormalRow {
  merchantId: string;
  name: string;
  floor: string;
  baseRate: number;
  compareRate: number;
  diff: number;
}

const abnormalRows = computed<AbnormalRow[]>(() => {
  const rows: AbnormalRow[] = [];
  store.merchants.forEach((m) => {
    const base = baseRecords.value.filter((r) => r.merchantId === m.id);
    const comp = compareRecords.value.filter((r) => r.merchantId === m.id);
    if (!base.length && !comp.length) return;
    const br = rateOf(base);
    const cr = rateOf(comp);
    const diff = Math.round((cr - br) * 10) / 10;
    if (Math.abs(diff) > 10) {
      rows.push({
        merchantId: m.id,
        name: m.name,
        floor: m.floor,
        baseRate: br,
        compareRate: cr,
        diff,
      });
    }
  });
  return rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
});

const columns: TableColumnData[] = [
  { title: '商户', dataIndex: 'name' },
  { title: '楼层', dataIndex: 'floor', width: 80, align: 'center' },
  { title: '基期率(%)', dataIndex: 'baseRate', width: 110, align: 'right' },
  { title: '对比期率(%)', dataIndex: 'compareRate', width: 120, align: 'right' },
  { title: '差异(%)', slotName: 'diff', width: 110, align: 'right' },
  { title: '操作', slotName: 'operation', width: 120, fixed: 'right' },
];

function diffColor(diff: number) {
  return diff > 0 ? 'green' : diff < 0 ? 'red' : '';
}

function handleExport() {
  if (!abnormalRows.value.length) {
    Message.warning('暂无可导出的数据');
    return;
  }
  exportCsv(
    `深度分析-异常商户-${dayjs().format('YYYYMMDD')}`,
    abnormalRows.value.map((r) => ({
      商户: r.name,
      楼层: r.floor,
      基期率: r.baseRate,
      对比期率: r.compareRate,
      差异: r.diff,
    }))
  );
  Message.success('已导出');
}

function handleExportRow(row: AbnormalRow) {
  const recs = store.records.filter(
    (r) =>
      r.merchantId === row.merchantId &&
      ((r.date >= baseStart.value && r.date <= baseEnd.value) ||
        (r.date >= compareStart.value && r.date <= compareEnd.value))
  );
  exportCsv(
    `深度分析-${row.name}-${dayjs().format('YYYYMMDD')}`,
    recs.map((r) => ({
      日期: r.date,
      状态: r.status === 'signedIn' ? '已到岗' : r.status === 'absent' ? '缺勤' : '未签到',
      签到时间: r.signedAt ?? '',
      操作人: r.operator ?? '',
      备注: r.remark ?? '',
    }))
  );
  Message.success('已导出该商户明细');
}
</script>

<template>
  <div class="page-container">
    <!-- 顶部条件选择 -->
    <a-card style="margin-bottom: 16px">
      <a-space wrap :size="12">
        <span class="control-label">粒度</span>
        <a-radio-group v-model="granularity" type="button" size="small">
          <a-radio v-for="o in granularityOptions" :key="o.value" :value="o.value">{{ o.label }}</a-radio>
        </a-radio-group>

        <span class="control-label">基期</span>
        <a-date-picker
          v-if="granularity === 'day'"
          v-model="baseDate"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          style="width: 160px"
        />
        <a-range-picker
          v-else
          v-model="baseRange"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          style="width: 280px"
          :placeholder="['开始日期', '结束日期']"
        />

        <span class="control-label">对比期</span>
        <a-date-picker
          v-if="granularity === 'day'"
          v-model="compareDate"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          style="width: 160px"
        />
        <a-range-picker
          v-else
          v-model="compareRange"
          value-format="YYYY-MM-DD"
          format="YYYY-MM-DD"
          style="width: 280px"
          :placeholder="['开始日期', '结束日期']"
        />
      </a-space>
    </a-card>

    <!-- 统计卡 -->
    <a-grid :cols="{ xs: 2, sm: 4 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
      <a-grid-item>
        <a-card>
          <div class="stat-card-value">{{ baseRate }}%</div>
          <div class="stat-card-label">基期到岗率</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value">{{ compareRate }}%</div>
          <div class="stat-card-label">对比期到岗率</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div
            class="stat-card-value"
            :style="{ color: diffRate > 0 ? 'rgb(var(--green-6))' : diffRate < 0 ? 'rgb(var(--red-6))' : '' }"
          >
            {{ fmtSigned(diffRate) }}%
          </div>
          <div class="stat-card-label">同比差值</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div
            class="stat-card-value"
            :style="{ color: growthRate > 0 ? 'rgb(var(--green-6))' : growthRate < 0 ? 'rgb(var(--red-6))' : '' }"
          >
            {{ fmtSigned(growthRate) }}%
          </div>
          <div class="stat-card-label">环比增长率</div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <!-- 图表对比 -->
    <a-grid :cols="{ xs: 1, lg: 2 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
      <a-grid-item>
        <a-card title="趋势对比 — 每日到岗率">
          <div style="height: 320px"><VChartView :spec="trendSpec" /></div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card title="楼层对比 — 基期 vs 对比期">
          <div style="height: 320px"><VChartView :spec="floorSpec" /></div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <!-- 异常商户明细表 -->
    <a-card title="异常商户明细（到岗率差异 > 10%）">
      <div class="toolbar">
        <span class="text-secondary">共 {{ abnormalRows.length }} 家异常商户</span>
        <a-button type="primary" @click="handleExport">
          <template #icon><icon-download /></template>
          导出 CSV
        </a-button>
      </div>
      <a-table
        :data="abnormalRows"
        :columns="columns"
        :pagination="{ pageSize: 10, showTotal: true }"
        :loading="store.loading"
        row-key="merchantId"
        size="medium"
        :scroll="{ x: 800 }"
      >
        <template #diff="{ record }">
          <a-tag :color="diffColor(record.diff)">{{ fmtSigned(record.diff) }}%</a-tag>
        </template>
        <template #operation="{ record }">
          <a-button type="text" size="small" @click="handleExportRow(record)">导出明细</a-button>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.control-label {
  color: var(--color-text-3);
  font-size: 13px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.text-secondary {
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
