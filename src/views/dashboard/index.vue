<script setup lang="ts">
import { computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useAdminStore } from '@/store/admin';
import VChartView from '@/components/VChartView.vue';
import { useCountUp } from '@/composables/useCountUp';
import type { Merchant } from '@/types';

const store = useAdminStore();

onMounted(() => {
  if (!store.merchants.length) store.loadFromApi();
});

const stats = computed(() => store.todayStats);

// 统计数字滚动入场
const totalDisplay = useCountUp(() => stats.value.total);
const signedInDisplay = useCountUp(() => stats.value.signedIn);
const absentDisplay = useCountUp(() => stats.value.absent);
const rateDisplay = useCountUp(() => stats.value.rate);

// 近 7 天考勤趋势
const trendSpec = computed(() => {
  const today = new Date();
  const days: { date: string; signedIn: number; absent: number; unsigned: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = dayjs(d).format('YYYY-MM-DD');
    const recs = store.records.filter((r) => r.date === dateStr);
    days.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      signedIn: recs.filter((r) => r.status === 'signedIn').length,
      absent: recs.filter((r) => r.status === 'absent').length,
      unsigned: recs.filter((r) => r.status === 'unsigned').length,
    });
  }
  return {
    type: 'area',
    data: [{ id: 'trend', values: days.flatMap((d) => [
      { date: d.date, type: '已到岗', value: d.signedIn },
      { date: d.date, type: '缺勤', value: d.absent },
      { date: d.date, type: '未签到', value: d.unsigned },
    ]) }],
    series: [{ type: 'area', xField: 'date', yField: 'value', seriesField: 'type', stack: true, area: { style: { fillOpacity: 0.3 } }, line: { style: { lineWidth: 2 } } }],
    axes: [
      { orient: 'bottom', type: 'band' },
      { orient: 'left', type: 'linear' },
    ],
    legends: { visible: true, position: 'top' },
    tooltip: { visible: true },
  };
});

// 楼层到岗分布
const floorSpec = computed(() => {
  const floors = ['1F', '2F', '3F', '4F'];
  const data = floors.map((f) => {
    const ms = store.merchants.filter((m: Merchant) => m.floor === f);
    return { floor: f, signedIn: ms.filter((m) => m.signedIn).length, total: ms.length };
  });
  return {
    type: 'bar',
    data: [{ id: 'floor', values: data.flatMap((d) => [
      { floor: d.floor, type: '已到岗', value: d.signedIn },
      { floor: d.floor, type: '未到岗', value: d.total - d.signedIn },
    ]) }],
    series: [{ type: 'bar', xField: 'floor', yField: 'value', seriesField: 'type', stack: true }],
    axes: [{ orient: 'bottom', type: 'band' }, { orient: 'left', type: 'linear' }],
    legends: { visible: true, position: 'top' },
    tooltip: { visible: true },
  };
});

// 认证状态占比
const verifiedSpec = computed(() => {
  const verified = store.merchants.filter((m: Merchant) => m.verified).length;
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
    legends: { visible: true, position: 'right' },
    tooltip: { visible: true },
    label: { visible: true },
  };
});

// 本周缺勤 Top5
const topAbsent = computed(() => {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const cnt = new Map<string, number>();
  store.records
    .filter((r) => r.status === 'absent' && r.date >= weekAgoStr)
    .forEach((r) => cnt.set(r.merchantId, (cnt.get(r.merchantId) ?? 0) + 1));
  return Array.from(cnt, ([merchantId, count]) => {
    const m = store.merchants.find((x) => x.id === merchantId);
    return { name: m?.name ?? merchantId, floor: m?.floor ?? '-', count };
  }).sort((a, b) => b.count - a.count).slice(0, 5);
});

const columns = [
  { title: '商户', dataIndex: 'name' },
  { title: '楼层', dataIndex: 'floor', width: 80 },
  { title: '缺勤次数', dataIndex: 'count', width: 100 },
];
</script>

<template>
  <div class="page-container">
    <!-- 统计卡 -->
    <a-grid :cols="{ xs: 2, sm: 4 }" :col-gap="12" :row-gap="12" style="margin-bottom: 16px">
      <a-grid-item v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 250, ease: 'easeOut', delay: 0 } }">
        <a-card>
          <div class="stat-card-value">{{ totalDisplay }}</div>
          <div class="stat-card-label">商户总数</div>
        </a-card>
      </a-grid-item>
      <a-grid-item v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 250, ease: 'easeOut', delay: 50 } }">
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--green-6))">{{ signedInDisplay }}</div>
          <div class="stat-card-label">今日到岗</div>
        </a-card>
      </a-grid-item>
      <a-grid-item v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 250, ease: 'easeOut', delay: 100 } }">
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--red-6))">{{ absentDisplay }}</div>
          <div class="stat-card-label">今日缺勤</div>
        </a-card>
      </a-grid-item>
      <a-grid-item v-motion :initial="{ opacity: 0, y: 12 }" :enter="{ opacity: 1, y: 0, transition: { duration: 250, ease: 'easeOut', delay: 150 } }">
        <a-card>
          <div class="stat-card-value" style="color: rgb(var(--primary-6))">{{ rateDisplay }}%</div>
          <div class="stat-card-label">到岗率</div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <!-- 图表区 -->
    <a-grid :cols="{ xs: 1, lg: 2 }" :col-gap="12" :row-gap="12" style="margin-bottom: 12px">
      <a-grid-item>
        <a-card title="近 7 天考勤趋势">
          <div style="height: 280px"><VChartView :spec="trendSpec" /></div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card title="楼层到岗分布">
          <div style="height: 280px"><VChartView :spec="floorSpec" /></div>
        </a-card>
      </a-grid-item>
    </a-grid>

    <a-grid :cols="{ xs: 1, lg: 2 }" :col-gap="12" :row-gap="12">
      <a-grid-item>
        <a-card title="认证状态占比">
          <div style="height: 280px"><VChartView :spec="verifiedSpec" /></div>
        </a-card>
      </a-grid-item>
      <a-grid-item>
        <a-card title="本周缺勤 Top5">
          <a-table :data="topAbsent" :columns="columns" :pagination="false" size="medium" />
        </a-card>
      </a-grid-item>
    </a-grid>
  </div>
</template>
