<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useAdminStore } from '@/store/admin';
import VChartView from '@/components/VChartView.vue';
import dayjs from 'dayjs';

const store = useAdminStore();
const now = ref(dayjs());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  if (!store.merchants.length) store.loadFromApi();
  timer = setInterval(() => (now.value = dayjs()), 1000);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});

const stats = computed(() => store.todayStats);

// 1. 到岗率仪表盘
const gaugeSpec = computed(() => ({
  type: 'gauge',
  data: [{ id: 'gauge', values: [{ value: stats.value.rate, name: '到岗率' }] }],
  valueField: 'value',
  categoryField: 'name',
  radius: '80%',
  axis: { orient: 'inner', visible: true },
  gauge: {
    type: 'progress',
    progress: { style: { fill: '#3a7afe' } },
    track: { style: { fill: '#1e3a5f' } },
  },
  indicator: {
    visible: true,
    title: { style: { fontSize: 14, fill: '#86909c' } },
    content: { style: { fontSize: 28, fontWeight: 600, fill: '#fff' }, formatter: (datum: { value: number }) => `${datum.value}%` },
  },
  background: 'transparent',
}));

// 2. 近 7 天趋势面积图
const trendSpec = computed(() => {
  const days: { date: string; 到岗: number; 缺勤: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    const recs = store.records.filter((r) => r.date === dateStr);
    days.push({
      date: d.format('M/D'),
      到岗: recs.filter((r) => r.status === 'signedIn').length,
      缺勤: recs.filter((r) => r.status === 'absent').length,
    });
  }
  return {
    type: 'area',
    data: [{ id: 'trend', values: days.flatMap((d) => [
      { date: d.date, type: '到岗', value: d.到岗 },
      { date: d.date, type: '缺勤', value: d.缺勤 },
    ]) }],
    series: [{ type: 'area', xField: 'date', yField: 'value', seriesField: 'type', stack: true, area: { style: { fillOpacity: 0.4 } }, line: { style: { lineWidth: 2 } } }],
    axes: [
      { orient: 'bottom', type: 'band', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } } },
      { orient: 'left', type: 'linear', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } }, grid: { style: { stroke: '#1e3a5f' } } },
    ],
    legends: { visible: true, position: 'top', item: { label: { style: { fill: '#e5e6eb' } } } },
    tooltip: { visible: true },
    background: 'transparent',
  };
});

// 3. 楼层到岗率柱图
const floorSpec = computed(() => {
  const floors = ['1F', '2F', '3F', '4F'];
  const data = floors.map((f) => {
    const ms = store.merchants.filter((m) => m.floor === f);
    const signed = ms.filter((m) => m.signedIn).length;
    return { floor: f, 到岗: signed, 未到岗: ms.length - signed };
  });
  return {
    type: 'bar',
    data: [{ id: 'floor', values: data.flatMap((d) => [
      { floor: d.floor, type: '到岗', value: d.到岗 },
      { floor: d.floor, type: '未到岗', value: d.未到岗 },
    ]) }],
    series: [{ type: 'bar', xField: 'floor', yField: 'value', seriesField: 'type', stack: true }],
    axes: [
      { orient: 'bottom', type: 'band', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } } },
      { orient: 'left', type: 'linear', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } }, grid: { style: { stroke: '#1e3a5f' } } },
    ],
    legends: { visible: true, position: 'top', item: { label: { style: { fill: '#e5e6eb' } } } },
    tooltip: { visible: true },
    background: 'transparent',
  };
});

// 4. 认证状态环形图
const verifiedSpec = computed(() => {
  const verified = store.merchants.filter((m) => m.verified).length;
  const unverified = store.merchants.length - verified;
  const values = [
    { name: '已认证', value: verified },
    { name: '未认证', value: unverified },
  ].filter((d) => d.value > 0);
  return {
    type: 'pie',
    data: [{ id: 'cat', values }],
    valueField: 'value',
    categoryField: 'name',
    outerRadius: 0.8,
    innerRadius: 0.5,
    legends: { visible: true, position: 'right', item: { label: { style: { fill: '#e5e6eb' } } } },
    tooltip: { visible: true },
    label: { visible: true, style: { fill: '#e5e6eb' } },
    background: 'transparent',
  };
});

// 5. 商户到岗率 Top10 水平柱图
const topSpec = computed(() => {
  const today = dayjs().format('YYYY-MM-DD');
  const data = store.merchants
    .map((m) => {
      const recs = store.records.filter((r) => r.merchantId === m.id && r.date >= dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
      const signed = recs.filter((r) => r.status === 'signedIn').length;
      const rate = recs.length > 0 ? Math.round((signed / recs.length) * 100) : 0;
      return { name: m.name, rate };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
  return {
    type: 'bar',
    data: [{ id: 'top', values: data }],
    series: [{ type: 'bar', xField: 'name', yField: 'rate', direction: 'horizontal' }],
    axes: [
      { orient: 'left', type: 'band', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } } },
      { orient: 'bottom', type: 'linear', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } }, grid: { style: { stroke: '#1e3a5f' } } },
    ],
    tooltip: { visible: true },
    background: 'transparent',
  };
});

// 6. 缺勤趋势面积图
const absentTrendSpec = computed(() => {
  const days: { date: string; 缺勤: number; 未签到: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = dayjs().subtract(i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    const recs = store.records.filter((r) => r.date === dateStr);
    days.push({
      date: d.format('M/D'),
      缺勤: recs.filter((r) => r.status === 'absent').length,
      未签到: recs.filter((r) => r.status === 'unsigned').length,
    });
  }
  return {
    type: 'area',
    data: [{ id: 'absent', values: days.flatMap((d) => [
      { date: d.date, type: '缺勤', value: d.缺勤 },
      { date: d.date, type: '未签到', value: d.未签到 },
    ]) }],
    series: [{ type: 'area', xField: 'date', yField: 'value', seriesField: 'type', stack: true, area: { style: { fillOpacity: 0.4 } }, line: { style: { lineWidth: 2 } } }],
    axes: [
      { orient: 'bottom', type: 'band', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } } },
      { orient: 'left', type: 'linear', label: { style: { fill: '#86909c' } }, domainLine: { style: { stroke: '#2a4a6b' } }, grid: { style: { stroke: '#1e3a5f' } } },
    ],
    legends: { visible: true, position: 'top', item: { label: { style: { fill: '#e5e6eb' } } } },
    tooltip: { visible: true },
    background: 'transparent',
  };
});
</script>

<template>
  <div class="dashboard-large-bg">
    <!-- 顶部标题栏 -->
    <div class="large-header">
      <div class="header-title">商场考勤运营大屏</div>
      <div class="header-time">{{ now.format('YYYY-MM-DD HH:mm:ss') }}</div>
    </div>

    <!-- 统计卡 -->
    <div class="large-stats">
      <div class="stat-block">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">商户总数</div>
      </div>
      <div class="stat-block">
        <div class="stat-value" style="color: #4ade80">{{ stats.signedIn }}</div>
        <div class="stat-label">今日到岗</div>
      </div>
      <div class="stat-block">
        <div class="stat-value" style="color: #f87171">{{ stats.absent }}</div>
        <div class="stat-label">今日缺勤</div>
      </div>
      <div class="stat-block">
        <div class="stat-value" style="color: #fbbf24">{{ stats.unsigned }}</div>
        <div class="stat-label">未签到</div>
      </div>
      <div class="stat-block">
        <div class="stat-value" style="color: #60a5fa">{{ stats.rate }}%</div>
        <div class="stat-label">到岗率</div>
      </div>
    </div>

    <!-- 图表网格 -->
    <div class="large-grid">
      <div class="large-card span-2">
        <div class="card-title">到岗率仪表盘</div>
        <div class="chart-box"><VChartView :spec="gaugeSpec" /></div>
      </div>
      <div class="large-card span-4">
        <div class="card-title">近 7 天考勤趋势</div>
        <div class="chart-box"><VChartView :spec="trendSpec" /></div>
      </div>
      <div class="large-card span-3">
        <div class="card-title">楼层到岗分布</div>
        <div class="chart-box"><VChartView :spec="floorSpec" /></div>
      </div>
      <div class="large-card span-3">
        <div class="card-title">认证状态占比</div>
        <div class="chart-box"><VChartView :spec="verifiedSpec" /></div>
      </div>
      <div class="large-card span-4">
        <div class="card-title">商户到岗率 Top10</div>
        <div class="chart-box"><VChartView :spec="topSpec" /></div>
      </div>
      <div class="large-card span-2">
        <div class="card-title">缺勤趋势</div>
        <div class="chart-box"><VChartView :spec="absentTrendSpec" /></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.large-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #1e3a5f;
}

.header-title {
  font-size: 22px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 2px;
}

.header-time {
  font-size: 16px;
  color: #86909c;
  font-variant-numeric: tabular-nums;
}

.large-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding: 16px 24px;
}

.stat-block {
  background: rgba(30, 58, 95, 0.4);
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}

.large-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  padding: 0 24px 24px;
}

.large-card {
  background: rgba(30, 58, 95, 0.3);
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  padding: 12px;
  height: 280px;
  display: flex;
  flex-direction: column;
}

.span-2 { grid-column: span 2; }
.span-3 { grid-column: span 3; }
.span-4 { grid-column: span 4; }

.card-title {
  font-size: 14px;
  color: #e5e6eb;
  margin-bottom: 8px;
  font-weight: 500;
}

.chart-box {
  flex: 1;
  min-height: 0;
}

@media (max-width: 1200px) {
  .large-stats { grid-template-columns: repeat(3, 1fr); }
  .large-grid { grid-template-columns: repeat(2, 1fr); }
  .span-2, .span-3, .span-4 { grid-column: span 1; }
}
</style>
