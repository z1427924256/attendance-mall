<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData } from '@arco-design/web-vue';
import dayjs from 'dayjs';
import { useAdminStore } from '@/store/admin';
import { exportCsv } from '@/utils/exportCsv';
import VChartView from '@/components/VChartView.vue';
import type { AttendanceRecord, Merchant } from '@/types';

const store = useAdminStore();

onMounted(() => {
  if (!store.merchants.length || !store.records.length) {
    store.loadFromApi();
  }
});

// ===== 周期与日期范围 =====
type PeriodType = 'week' | 'month' | 'quarter' | 'custom';
const periodType = ref<PeriodType>('month');
const dateRange = ref<string[]>([
  dayjs().startOf('month').format('YYYY-MM-DD'),
  dayjs().endOf('month').format('YYYY-MM-DD'),
]);

const periodOptions = [
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '季', value: 'quarter' },
  { label: '自定义', value: 'custom' },
];

function quarterStart(d: dayjs.Dayjs): dayjs.Dayjs {
  const qStart = Math.floor(d.month() / 3) * 3;
  return d.month(qStart).startOf('month');
}

watch(periodType, (t) => {
  const today = dayjs();
  let s: dayjs.Dayjs;
  let e: dayjs.Dayjs;
  switch (t) {
    case 'week':
      s = today.startOf('week');
      e = today.endOf('week');
      break;
    case 'month':
      s = today.startOf('month');
      e = today.endOf('month');
      break;
    case 'quarter':
      s = quarterStart(today);
      e = s.add(2, 'month').endOf('month');
      break;
    default:
      return; // 自定义：保留用户当前选择
  }
  dateRange.value = [s.format('YYYY-MM-DD'), e.format('YYYY-MM-DD')];
});

const start = computed(() => dateRange.value?.[0] ?? '');
const end = computed(() => dateRange.value?.[1] ?? '');

const rangeRecords = computed<AttendanceRecord[]>(() => {
  if (!start.value || !end.value) return [];
  return store.records.filter((r) => r.date >= start.value && r.date <= end.value);
});

// ===== 统计卡 =====
const stats = computed(() => {
  const recs = rangeRecords.value;
  const dates = new Set(recs.map((r) => r.date));
  const signedIn = recs.filter((r) => r.status === 'signedIn').length;
  const absent = recs.filter((r) => r.status === 'absent').length;
  const rate = recs.length > 0 ? Math.round((signedIn / recs.length) * 1000) / 10 : 0;
  return { days: dates.size, signedIn, absent, rate };
});

// ===== 每日考勤趋势线图 =====
const trendSpec = computed(() => {
  const byDate = new Map<string, { signedIn: number; absent: number; unsigned: number }>();
  rangeRecords.value.forEach((r) => {
    const d = byDate.get(r.date) ?? { signedIn: 0, absent: 0, unsigned: 0 };
    if (r.status === 'signedIn') d.signedIn++;
    else if (r.status === 'absent') d.absent++;
    else d.unsigned++;
    byDate.set(r.date, d);
  });
  const dates = Array.from(byDate.keys()).sort();
  const values: { date: string; type: string; value: number }[] = [];
  dates.forEach((d) => {
    const item = byDate.get(d)!;
    const label = dayjs(d).format('MM/DD');
    values.push({ date: label, type: '已到岗', value: item.signedIn });
    values.push({ date: label, type: '缺勤', value: item.absent });
    values.push({ date: label, type: '未签到', value: item.unsigned });
  });
  return {
    type: 'line',
    data: [{ id: 'trend', values }],
    series: [
      { type: 'line', xField: 'date', yField: 'value', seriesField: 'type', point: { visible: true }, line: { style: { lineWidth: 2 } } },
    ],
    axes: [
      { orient: 'bottom', type: 'band' },
      { orient: 'left', type: 'linear' },
    ],
    legends: { visible: true, position: 'top' },
    tooltip: { visible: true },
  };
});

// ===== 楼层考勤对比柱图 =====
const floorSpec = computed(() => {
  const floors = Array.from(new Set(store.merchants.map((m) => m.floor))).filter(Boolean).sort();
  const values: { floor: string; type: string; value: number }[] = [];
  floors.forEach((f) => {
    const mids = store.merchants.filter((m) => m.floor === f).map((m) => m.id);
    const recs = rangeRecords.value.filter((r) => mids.includes(r.merchantId));
    const signedIn = recs.filter((r) => r.status === 'signedIn').length;
    const absent = recs.filter((r) => r.status === 'absent').length;
    values.push({ floor: f, type: '已到岗', value: signedIn });
    values.push({ floor: f, type: '缺勤', value: absent });
  });
  return {
    type: 'bar',
    data: [{ id: 'floor', values }],
    series: [{ type: 'bar', xField: 'floor', yField: 'value', seriesField: 'type' }],
    axes: [
      { orient: 'bottom', type: 'band' },
      { orient: 'left', type: 'linear' },
    ],
    legends: { visible: true, position: 'top' },
    tooltip: { visible: true },
  };
});

// ===== 商户考勤明细表 =====
interface MerchantRow {
  merchantId: string;
  name: string;
  floor: string;
  expected: number;
  signedIn: number;
  absent: number;
  rate: number;
  status: string;
}

const merchantRows = computed<MerchantRow[]>(() => {
  return store.merchants
    .map((m: Merchant) => {
      const recs = rangeRecords.value.filter((r) => r.merchantId === m.id);
      const signedIn = recs.filter((r) => r.status === 'signedIn').length;
      const absent = recs.filter((r) => r.status === 'absent').length;
      const rate = recs.length > 0 ? Math.round((signedIn / recs.length) * 1000) / 10 : 0;
      const status = m.signedIn ? 'signedIn' : m.absent ? 'absent' : 'unsigned';
      return {
        merchantId: m.id,
        name: m.name,
        floor: m.floor,
        expected: recs.length,
        signedIn,
        absent,
        rate,
        status,
      };
    })
    .filter((r) => r.expected > 0)
    .sort((a, b) => b.rate - a.rate);
});

function statusText(s: string) {
  return s === 'signedIn' ? '已到岗' : s === 'absent' ? '缺勤' : '未签到';
}
function statusColor(s: string) {
  return s === 'signedIn' ? 'green' : s === 'absent' ? 'red' : '';
}

const columns: TableColumnData[] = [
  { title: '商户', dataIndex: 'name' },
  { title: '楼层', dataIndex: 'floor', width: 80, align: 'center' },
  { title: '应到', dataIndex: 'expected', width: 90, align: 'right', sortable: { sortDirections: ['descend', 'ascend'], sorter: (a, b) => a.expected - b.expected } },
  { title: '实到', dataIndex: 'signedIn', width: 90, align: 'right', sortable: { sortDirections: ['descend', 'ascend'], sorter: (a, b) => a.signedIn - b.signedIn } },
  { title: '缺勤', dataIndex: 'absent', width: 90, align: 'right', sortable: { sortDirections: ['descend', 'ascend'], sorter: (a, b) => a.absent - b.absent } },
  { title: '到岗率', slotName: 'rate', width: 200, sortable: { sortDirections: ['descend', 'ascend'], sorter: (a, b) => a.rate - b.rate } },
  { title: '状态', slotName: 'status', width: 100, align: 'center' },
];

function handleExport() {
  if (!merchantRows.value.length) {
    Message.warning('暂无可导出的数据');
    return;
  }
  exportCsv(
    `报表统计-${start.value}_${end.value}`,
    merchantRows.value.map((r) => ({
      商户: r.name,
      楼层: r.floor,
      应到: r.expected,
      实到: r.signedIn,
      缺勤: r.absent,
      到岗率: r.rate,
      状态: statusText(r.status),
    }))
  );
  Message.success('已导出');
}
</script>

<template>
  <div class="page-container">
    <!-- 顶部：周期 + 日期范围 -->
    <a-card style="margin-bottom: 16px">
      <div class="toolbar">
        <a-space wrap :size="12">
          <span class="control-label">周期</span>
          <a-radio-group v-model="periodType" type="button" size="small">
            <a-radio v-for="o in periodOptions" :key="o.value" :value="o.value">{{ o.label }}</a-radio>
          </a-radio-group>
          <a-range-picker
            v-model="dateRange"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            style="width: 280px"
            :placeholder="['开始日期', '结束日期']"
          />
        </a-space>
        <a-button type="primary" @click="handleExport">
          <template #icon><icon-download /></template>
          导出 CSV
        </a-button>
      </div>
    </a-card>

    <!-- 统计卡 -->
    <a-grid :cols="{ xs: 2, sm: 4 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
      <a-grid-item>
        <a-card>
          <div class="stat-card-value">{{ stats.days }}</div>
          <div class="stat-card-label">应到天数</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--green-6))">{{ stats.signedIn }}</div>
          <div class="stat-card-label">实到人次</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--red-6))">{{ stats.absent }}</div>
          <div class="stat-card-label">缺勤人次</div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--primary-6))">{{ stats.rate }}%</div>
          <div class="stat-card-label">平均到岗率</div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <!-- 图表区 -->
    <a-grid :cols="{ xs: 1, lg: 2 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
      <a-grid-item>
        <a-card title="每日考勤趋势">
          <div style="height: 320px"><VChartView :spec="trendSpec" /></div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card title="楼层考勤对比">
          <div style="height: 320px"><VChartView :spec="floorSpec" /></div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <!-- 商户考勤明细表 -->
    <a-card title="商户考勤明细">
      <a-table
        :data="merchantRows"
        :columns="columns"
        :pagination="{ pageSize: 15, showTotal: true }"
        :loading="store.loading"
        row-key="merchantId"
        size="medium"
        :scroll="{ x: 800 }"
      >
        <template #rate="{ record }">
          <a-progress :percent="record.rate" size="small" />
        </template>
        <template #status="{ record }">
          <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.control-label {
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
