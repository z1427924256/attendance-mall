<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { TableColumnData } from '@arco-design/web-vue';
import dayjs from 'dayjs';
import * as api from '@/api/client';
import { exportCsv } from '@/utils/exportCsv';
import VChartView from '@/components/VChartView.vue';
import type { RatingItem } from '@/types';

const month = ref<string>(dayjs().format('YYYY-MM'));
const loading = ref(false);
const ratings = ref<RatingItem[]>([]);

async function loadRatings() {
  loading.value = true;
  try {
    ratings.value = await api.fetchRatings(month.value);
  } catch (e) {
    Message.error('评级数据加载失败');
    ratings.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadRatings);
watch(month, loadRatings);

// ===== 汇总卡 =====
const summary = computed(() => {
  const total = ratings.value.length;
  const count = (lv: RatingItem['level']) => ratings.value.filter((r) => r.level === lv).length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    total,
    excellent: count('excellent'),
    qualified: count('qualified'),
    warning: count('warning'),
    watchlist: count('watchlist'),
    pct,
  };
});

// ===== 评级分布饼图 =====
const pieSpec = computed(() => {
  const map: Record<string, number> = {
    优秀: summary.value.excellent,
    合格: summary.value.qualified,
    预警: summary.value.warning,
    重点管控: summary.value.watchlist,
  };
  const values = Object.entries(map)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
  return {
    type: 'pie',
    data: [{ id: 'pie', values }],
    valueField: 'value',
    categoryField: 'name',
    legends: { visible: true, position: 'right' },
    tooltip: { visible: true },
    label: { visible: true },
  };
});

// ===== 评分 Top10 水平柱图 =====
const top10Spec = computed(() => {
  const top = [...ratings.value].sort((a, b) => b.score - a.score).slice(0, 10).reverse();
  const values = top.map((r) => ({ name: r.merchantName, score: r.score }));
  return {
    type: 'bar',
    data: [{ id: 'top10', values }],
    series: [{ type: 'bar', xField: 'name', yField: 'score', direction: 'horizontal' }],
    axes: [
      { orient: 'left', type: 'band' },
      { orient: 'bottom', type: 'linear' },
    ],
    label: { visible: true, position: 'insideEnd' },
    tooltip: { visible: true },
  };
});

// ===== 表格 =====
const searchText = ref('');

const filteredRatings = computed(() => {
  if (!searchText.value) return ratings.value;
  const kw = searchText.value.toLowerCase();
  return ratings.value.filter(
    (r) =>
      r.merchantName.toLowerCase().includes(kw) ||
      r.floor.toLowerCase().includes(kw) ||
      r.location.toLowerCase().includes(kw)
  );
});

function levelText(lv: RatingItem['level']) {
  return lv === 'excellent' ? '优秀' : lv === 'qualified' ? '合格' : lv === 'warning' ? '预警' : '重点管控';
}
function levelColor(lv: RatingItem['level']) {
  return lv === 'excellent' ? 'green' : lv === 'qualified' ? 'blue' : lv === 'warning' ? 'orange' : 'red';
}

const columns: TableColumnData[] = [
  { title: '商户', dataIndex: 'merchantName', width: 180 },
  { title: '楼层', dataIndex: 'floor', width: 80, align: 'center' },
  { title: '铺位', dataIndex: 'location', width: 110 },
  { title: '月份', dataIndex: 'month', width: 100, align: 'center' },
  { title: '评分', slotName: 'score', width: 160, sortable: { sortDirections: ['descend', 'ascend'], sorter: (a, b) => a.score - b.score } },
  { title: '等级', slotName: 'level', width: 100, align: 'center' },
  { title: '到岗率', dataIndex: 'attendanceRate', width: 100, align: 'right', sortable: { sortDirections: ['descend', 'ascend'], sorter: (a, b) => a.attendanceRate - b.attendanceRate }, render: ({ record }) => `${record.attendanceRate}%` },
  { title: '缺勤天数', dataIndex: 'absentCount', width: 100, align: 'right', sortable: { sortDirections: ['descend', 'ascend'], sorter: (a, b) => a.absentCount - b.absentCount } },
  { title: '到岗天数', dataIndex: 'presentCount', width: 100, align: 'right' },
  { title: '总天数', dataIndex: 'totalDays', width: 90, align: 'right' },
];

function handleExport() {
  if (!filteredRatings.value.length) {
    Message.warning('暂无可导出的数据');
    return;
  }
  exportCsv(
    `商户评级-${month.value}`,
    filteredRatings.value.map((r) => ({
      商户: r.merchantName,
      楼层: r.floor,
      铺位: r.location,
      月份: r.month,
      评分: r.score,
      等级: levelText(r.level),
      到岗率: r.attendanceRate,
      缺勤天数: r.absentCount,
      到岗天数: r.presentCount,
      总天数: r.totalDays,
    }))
  );
  Message.success('已导出');
}
</script>

<template>
  <div class="page-container">
    <a-spin :loading="loading" tip="加载评级数据..." style="display: block">
      <!-- 顶部：月份选择 + 导出 -->
      <a-card style="margin-bottom: 16px">
        <div class="toolbar">
          <a-space :size="12">
            <span class="control-label">月份</span>
            <a-date-picker
              v-model="month"
              picker="month"
              value-format="YYYY-MM"
              format="YYYY-MM"
              style="width: 160px"
            />
          </a-space>
          <a-button type="primary" @click="handleExport">
            <template #icon><icon-download /></template>
            导出 CSV
          </a-button>
        </div>
      </a-card>

      <!-- 汇总卡 -->
      <a-grid :cols="{ xs: 2, sm: 3, lg: 5 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
        <a-grid-item>
          <a-card>
            <div class="stat-card-value">{{ summary.total }}</div>
            <div class="stat-card-label">商户总数</div>
          </a-card>
        </a-grid-item>
        <a-grid-item>
          <a-card>
            <div class="stat-card-value" style="color: rgb(var(--green-6))">{{ summary.excellent }}</div>
            <div class="stat-card-label">优秀 ({{ summary.pct(summary.excellent) }}%)</div>
          </a-card>
        </a-grid-item>
        <a-grid-item>
          <a-card>
            <div class="stat-card-value" style="color: rgb(var(--primary-6))">{{ summary.qualified }}</div>
            <div class="stat-card-label">合格 ({{ summary.pct(summary.qualified) }}%)</div>
          </a-card>
        </a-grid-item>
        <a-grid-item>
          <a-card>
            <div class="stat-card-value" style="color: rgb(var(--orange-6))">{{ summary.warning }}</div>
            <div class="stat-card-label">预警 ({{ summary.pct(summary.warning) }}%)</div>
          </a-card>
        </a-grid-item>
        <a-grid-item>
          <a-card>
            <div class="stat-card-value" style="color: rgb(var(--red-6))">{{ summary.watchlist }}</div>
            <div class="stat-card-label">重点管控 ({{ summary.pct(summary.watchlist) }}%)</div>
          </a-card>
        </a-grid-item>
      </a-grid>

      <!-- 图表区 -->
      <a-grid :cols="{ xs: 1, lg: 2 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
        <a-grid-item>
          <a-card title="评级分布">
            <div style="height: 320px"><VChartView :spec="pieSpec" /></div>
          </a-card>
        </a-grid-item>
        <a-grid-item>
          <a-card title="评分 Top10">
            <div style="height: 320px"><VChartView :spec="top10Spec" /></div>
          </a-card>
        </a-grid-item>
      </a-grid>

      <!-- 评级明细表 -->
      <a-card title="商户评级明细">
        <div class="toolbar">
          <a-input-search
            v-model="searchText"
            placeholder="搜索商户 / 楼层 / 铺位"
            style="width: 280px"
            allow-clear
          />
          <span class="text-secondary">共 {{ filteredRatings.length }} 条</span>
        </div>
        <a-table
          :data="filteredRatings"
          :columns="columns"
          :pagination="{ pageSize: 15, showTotal: true }"
          row-key="merchantId"
          size="medium"
          :scroll="{ x: 1300 }"
        >
          <template #score="{ record }">
            <a-progress :percent="record.score" size="small" :color="levelColor(record.level)" />
          </template>
          <template #level="{ record }">
            <a-tag :color="levelColor(record.level)">{{ levelText(record.level) }}</a-tag>
          </template>
        </a-table>
      </a-card>
    </a-spin>
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
.text-secondary {
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
