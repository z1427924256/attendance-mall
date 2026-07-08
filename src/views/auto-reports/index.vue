<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData } from '@arco-design/web-vue';
import dayjs from 'dayjs';
import { useAdminStore } from '@/store/admin';
import { exportCsv } from '@/utils/exportCsv';
import type { AttendanceRecord } from '@/types';

const store = useAdminStore();

onMounted(() => {
  if (!store.merchants.length || !store.records.length) {
    store.loadFromApi();
  }
});

type ReportType = 'daily' | 'weekly' | 'monthly';
const reportType = ref<ReportType>('daily');
const reportDate = ref<string>(dayjs().format('YYYY-MM-DD'));

const typeOptions = [
  { label: '日报', value: 'daily' },
  { label: '周报', value: 'weekly' },
  { label: '月报', value: 'monthly' },
];

// ===== 根据类型计算日期范围 =====
const period = computed(() => {
  const d = dayjs(reportDate.value);
  if (reportType.value === 'daily') {
    return { start: d.format('YYYY-MM-DD'), end: d.format('YYYY-MM-DD'), label: d.format('YYYY-MM-DD') };
  }
  if (reportType.value === 'weekly') {
    const s = d.startOf('week');
    const e = d.endOf('week');
    return { start: s.format('YYYY-MM-DD'), end: e.format('YYYY-MM-DD'), label: `${s.format('YYYY-MM-DD')} ~ ${e.format('YYYY-MM-DD')}` };
  }
  const s = d.startOf('month');
  const e = d.endOf('month');
  return { start: s.format('YYYY-MM-DD'), end: e.format('YYYY-MM-DD'), label: `${s.format('YYYY-MM')}（${s.format('YYYY-MM-DD')} ~ ${e.format('YYYY-MM-DD')}）` };
});

const typeText = computed(() => (reportType.value === 'daily' ? '日报' : reportType.value === 'weekly' ? '周报' : '月报'));
const reportTitle = computed(() => `${period.value.label} 考勤${typeText.value}`);

// ===== 报告生成（手动触发） =====
const generated = ref(false);
const periodRecords = ref<AttendanceRecord[]>([]);

function generateReport() {
  const { start, end } = period.value;
  periodRecords.value = store.records.filter((r) => r.date >= start && r.date <= end);
  generated.value = true;
  Message.success('报告已生成');
}

// ===== 概况 =====
const overview = computed(() => {
  const recs = periodRecords.value;
  const total = recs.length;
  const signedIn = recs.filter((r) => r.status === 'signedIn').length;
  const absent = recs.filter((r) => r.status === 'absent').length;
  const unsigned = recs.filter((r) => r.status === 'unsigned').length;
  const rate = total > 0 ? Math.round((signedIn / total) * 1000) / 10 : 0;
  return { total, signedIn, absent, unsigned, rate };
});

// ===== 楼层分布 =====
function merchantInfo(id: string) {
  return store.merchants.find((m) => m.id === id);
}
function merchantName(id: string) {
  return merchantInfo(id)?.name ?? id;
}
function merchantFloor(id: string) {
  return merchantInfo(id)?.floor ?? '-';
}

interface FloorRow {
  floor: string;
  expected: number;
  signedIn: number;
  rate: number;
}

const floorRows = computed<FloorRow[]>(() => {
  const floors = Array.from(new Set(store.merchants.map((m) => m.floor))).filter(Boolean).sort();
  return floors.map((f) => {
    const mids = store.merchants.filter((m) => m.floor === f).map((m) => m.id);
    const recs = periodRecords.value.filter((r) => mids.includes(r.merchantId));
    const signedIn = recs.filter((r) => r.status === 'signedIn').length;
    const rate = recs.length > 0 ? Math.round((signedIn / recs.length) * 1000) / 10 : 0;
    return { floor: f, expected: recs.length, signedIn, rate };
  });
});

const floorColumns: TableColumnData[] = [
  { title: '楼层', dataIndex: 'floor', width: 100 },
  { title: '应到(人次)', dataIndex: 'expected', width: 120, align: 'right' },
  { title: '实到(人次)', dataIndex: 'signedIn', width: 120, align: 'right' },
  { title: '到岗率', slotName: 'rate', width: 200 },
];

// ===== 重点关注商户（缺勤或未签到） =====
interface FocusRow {
  id: string;
  merchantId: string;
  name: string;
  floor: string;
  status: string;
  date: string;
}

const focusRows = computed<FocusRow[]>(() => {
  return periodRecords.value
    .filter((r) => r.status === 'absent' || r.status === 'unsigned')
    .map((r) => ({
      id: r.id,
      merchantId: r.merchantId,
      name: merchantName(r.merchantId),
      floor: merchantFloor(r.merchantId),
      status: r.status,
      date: r.date,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name)));
});

function statusText(s: string) {
  return s === 'absent' ? '缺勤' : '未签到';
}
function statusColor(s: string) {
  return s === 'absent' ? 'red' : '';
}

const focusColumns: TableColumnData[] = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '商户', dataIndex: 'name' },
  { title: '楼层', dataIndex: 'floor', width: 80, align: 'center' },
  { title: '状态', slotName: 'status', width: 100, align: 'center' },
];

// 缺勤商户列表（去重）
const absentMerchants = computed(() => {
  const set = new Map<string, number>();
  periodRecords.value
    .filter((r) => r.status === 'absent')
    .forEach((r) => set.set(r.merchantId, (set.get(r.merchantId) ?? 0) + 1));
  return Array.from(set, ([merchantId, count]) => ({
    merchantId,
    name: merchantName(merchantId),
    floor: merchantFloor(merchantId),
    count,
  })).sort((a, b) => b.count - a.count);
});

// ===== 导出 =====
function handleExport() {
  if (!generated.value) {
    Message.warning('请先生成报告');
    return;
  }
  const rows: Record<string, unknown>[] = [];
  rows.push({ 区段: '报告标题', 内容: reportTitle.value });
  rows.push({ 区段: '应到(人次)', 内容: overview.value.total });
  rows.push({ 区段: '实到(人次)', 内容: overview.value.signedIn });
  rows.push({ 区段: '缺勤(人次)', 内容: overview.value.absent });
  rows.push({ 区段: '未签到(人次)', 内容: overview.value.unsigned });
  rows.push({ 区段: '到岗率(%)', 内容: overview.value.rate });
  rows.push({ 区段: '', 内容: '' });
  rows.push({ 区段: '楼层分布', 内容: '应到 / 实到 / 到岗率%' });
  floorRows.value.forEach((f) => {
    rows.push({ 区段: f.floor, 内容: `${f.expected} / ${f.signedIn} / ${f.rate}%` });
  });
  rows.push({ 区段: '', 内容: '' });
  rows.push({ 区段: '重点关注商户', 内容: '日期 / 商户 / 楼层 / 状态' });
  focusRows.value.forEach((r) => {
    rows.push({ 区段: r.date, 内容: `${r.name} / ${r.floor} / ${statusText(r.status)}` });
  });
  exportCsv(`考勤${typeText.value}-${period.value.label}`, rows);
  Message.success('报告已导出');
}
</script>

<template>
  <div class="page-container">
    <!-- 顶部：类型 + 日期 + 生成 -->
    <a-card style="margin-bottom: 16px">
      <div class="toolbar">
        <a-space wrap :size="12">
          <span class="control-label">报告类型</span>
          <a-radio-group v-model="reportType" type="button" size="small">
            <a-radio v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</a-radio>
          </a-radio-group>
          <span class="control-label">日期</span>
          <a-date-picker
            v-model="reportDate"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            style="width: 170px"
          />
          <a-button type="primary" @click="generateReport">
            <template #icon><icon-refresh /></template>
            生成报告
          </a-button>
        </a-space>
        <a-button :disabled="!generated" @click="handleExport">
          <template #icon><icon-download /></template>
          导出 CSV
        </a-button>
      </div>
    </a-card>

    <!-- 报告预览区 -->
    <a-card v-if="!generated">
      <a-empty description="选择类型与日期后点击「生成报告」" />
    </a-card>

    <template v-else>
      <a-card :title="reportTitle" style="margin-bottom: 16px">
        <template #extra>
          <a-tag color="arcoblue">{{ typeText }}</a-tag>
        </template>

        <!-- 考勤概况 -->
        <div class="section-title">考勤概况</div>
        <a-grid :cols="{ xs: 2, sm: 3, lg: 5 }" :col-gap="12" :row-gap="12">
          <a-grid-item>
            <div class="stat-card-value">{{ overview.total }}</div>
            <div class="stat-card-label">应到(人次)</div>
          </a-grid-item>
          <a-grid-item>
            <div class="stat-card-value" style="color: rgb(var(--green-6))">{{ overview.signedIn }}</div>
            <div class="stat-card-label">实到(人次)</div>
          </a-grid-item>
          <a-grid-item>
            <div class="stat-card-value" style="color: rgb(var(--red-6))">{{ overview.absent }}</div>
            <div class="stat-card-label">缺勤(人次)</div>
          </a-grid-item>
          <a-grid-item>
            <div class="stat-card-value">{{ overview.unsigned }}</div>
            <div class="stat-card-label">未签到(人次)</div>
          </a-grid-item>
          <a-grid-item>
            <div class="stat-card-value" style="color: rgb(var(--primary-6))">{{ overview.rate }}%</div>
            <div class="stat-card-label">到岗率</div>
          </a-grid-item>
        </a-grid>

        <!-- 异常统计：缺勤商户列表 -->
        <div class="section-title" style="margin-top: 20px">异常统计 — 缺勤商户</div>
        <a-table
          v-if="absentMerchants.length"
          :data="absentMerchants"
          :columns="[
            { title: '商户', dataIndex: 'name' },
            { title: '楼层', dataIndex: 'floor', width: 100, align: 'center' },
            { title: '缺勤次数', dataIndex: 'count', width: 120, align: 'right' },
          ]"
          :pagination="false"
          row-key="merchantId"
          size="medium"
        />
        <a-empty v-else description="无缺勤商户" />

        <!-- 楼层分布表 -->
        <div class="section-title" style="margin-top: 20px">楼层分布</div>
        <a-table
          :data="floorRows"
          :columns="floorColumns"
          :pagination="false"
          row-key="floor"
          size="medium"
        >
          <template #rate="{ record }">
            <a-progress :percent="record.rate" size="small" />
          </template>
        </a-table>

        <!-- 重点关注商户表 -->
        <div class="section-title" style="margin-top: 20px">重点关注商户（缺勤 / 未签到）</div>
        <a-table
          v-if="focusRows.length"
          :data="focusRows"
          :columns="focusColumns"
          :pagination="{ pageSize: 10, showTotal: true }"
          row-key="id"
          size="medium"
          :scroll="{ x: 600 }"
        >
          <template #status="{ record }">
            <a-tag :color="statusColor(record.status)">{{ statusText(record.status) }}</a-tag>
          </template>
        </a-table>
        <a-empty v-else description="无重点关注商户" />
      </a-card>
    </template>
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
.section-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-1);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid rgb(var(--primary-6));
}
</style>
