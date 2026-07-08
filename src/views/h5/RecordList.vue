<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Download } from 'lucide-vue-next';
import dayjs from 'dayjs';
import { useAdminStore } from '@/store/admin';
import { exportCsv } from '@/utils/exportCsv';
import type { AttendanceRecord, Merchant } from '@/types';

type Period = '今日' | '本周' | '本月';
const PERIODS: Period[] = ['今日', '本周', '本月'];

const adminStore = useAdminStore();
const period = ref<Period>('今日');

const merchantMap = computed(() => {
  const map = new Map<string, Merchant>();
  adminStore.merchants.forEach((m) => map.set(m.id, m));
  return map;
});

function merchantName(id: string) {
  return merchantMap.value.get(id)?.name ?? '未知商户';
}
function merchantEmoji(id: string) {
  return merchantMap.value.get(id)?.emoji ?? '🏪';
}

const nowEndMs = dayjs().endOf('day').valueOf();

const periodStartMs = computed(() => {
  const now = dayjs();
  if (period.value === '今日') return now.startOf('day').valueOf();
  if (period.value === '本周') return now.day(0).startOf('day').valueOf();
  return now.startOf('month').valueOf();
});

function inPeriod(date: string) {
  const t = dayjs(date).valueOf();
  return t >= periodStartMs.value && t <= nowEndMs;
}

const periodRecords = computed(() => adminStore.records.filter((r) => inPeriod(r.date)));

const overview = computed(() => {
  const list = periodRecords.value;
  const total = list.length;
  const signedIn = list.filter((r) => r.status === 'signedIn').length;
  const absent = list.filter((r) => r.status === 'absent').length;
  const rate = total > 0 ? Math.round((signedIn / total) * 100) : 0;
  return { total, signedIn, absent, rate };
});

// 双榜单固定按本周统计
const weekStartMs = dayjs().day(0).startOf('day').valueOf();
const weekRecords = computed(() =>
  adminStore.records.filter((r) => {
    const t = dayjs(r.date).valueOf();
    return t >= weekStartMs && t <= nowEndMs;
  })
);

const presentRank = computed(() => {
  const counts = new Map<string, number>();
  weekRecords.value
    .filter((r) => r.status === 'signedIn')
    .forEach((r) => counts.set(r.merchantId, (counts.get(r.merchantId) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, name: merchantName(id), emoji: merchantEmoji(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
});

const absentRank = computed(() => {
  const counts = new Map<string, number>();
  weekRecords.value
    .filter((r) => r.status === 'absent')
    .forEach((r) => counts.set(r.merchantId, (counts.get(r.merchantId) ?? 0) + 1));
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, name: merchantName(id), emoji: merchantEmoji(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
});

// 按日分组（降序）
const groupedByDate = computed(() => {
  const groups = new Map<string, AttendanceRecord[]>();
  periodRecords.value.forEach((r) => {
    const arr = groups.get(r.date) ?? [];
    arr.push(r);
    groups.set(r.date, arr);
  });
  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, records]) => ({
      date,
      label: dayjs(date).format('MM月DD日'),
      records: records
        .slice()
        .sort((x, y) => (x.signedAt ?? '').localeCompare(y.signedAt ?? '')),
    }));
});

function statusTag(status: AttendanceRecord['status']) {
  if (status === 'signedIn') return { label: '已到岗', cls: 'bg-[#16a34a]/10 text-[#16a34a]' };
  if (status === 'absent') return { label: '缺勤', cls: 'bg-[#dc2626]/10 text-[#dc2626]' };
  return { label: '未签到', cls: 'bg-gray-200 text-gray-500' };
}

function handleExport() {
  const rows = periodRecords.value
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => {
      const m = merchantMap.value.get(r.merchantId);
      return {
        日期: r.date,
        商户: merchantName(r.merchantId),
        楼层: m?.floor ?? '',
        铺位: m?.location ?? '',
        业态: m?.category ?? '',
        状态: statusTag(r.status).label,
        签到时间: r.signedAt ?? '',
      };
    });
  exportCsv(`考勤记录_${period.value}_${dayjs().format('YYYYMMDD')}`, rows);
}

onMounted(() => {
  adminStore.loadFromApi();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <div class="flex items-center justify-between bg-[#16a34a] px-4 pb-4 pt-3 text-white">
      <div class="text-[18px] font-semibold">记录</div>
      <button
        type="button"
        class="flex cursor-pointer items-center gap-1 rounded-full border-0 bg-white/20 px-3 py-1 text-[12px]"
        @click="handleExport"
      >
        <Download :size="14" /> 导出CSV
      </button>
    </div>

    <div class="space-y-3 p-3">
      <!-- Period tabs -->
      <div class="flex gap-2">
        <button
          v-for="p in PERIODS"
          :key="p"
          type="button"
          class="flex-1 cursor-pointer rounded-lg border-0 py-1.5 text-[13px]"
          :class="period === p ? 'bg-[#16a34a] text-white' : 'bg-white text-gray-600'"
          @click="period = p"
        >
          {{ p }}
        </button>
      </div>

      <!-- Overview 4-grid -->
      <div class="grid grid-cols-4 gap-2">
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-gray-700">{{ overview.total }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">应到</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-[#16a34a]">{{ overview.signedIn }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">实到</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-[#dc2626]">{{ overview.absent }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">缺勤</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-gray-700">{{ overview.rate }}%</div>
          <div class="mt-0.5 text-[11px] text-gray-400">到岗率</div>
        </div>
      </div>

      <!-- Rankings -->
      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-xl bg-white p-3 shadow-sm">
          <div class="mb-2 text-[13px] font-medium text-[#16a34a]">到岗榜 Top3</div>
          <div v-if="presentRank.length" class="space-y-2">
            <div
              v-for="(item, idx) in presentRank"
              :key="item.id"
              class="flex items-center gap-2"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                :class="idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-700'"
              >{{ idx + 1 }}</span>
              <span class="text-[14px]">{{ item.emoji }}</span>
              <span class="flex-1 truncate text-[13px] text-gray-700">{{ item.name }}</span>
              <span class="text-[12px] text-[#16a34a]">{{ item.count }}次</span>
            </div>
          </div>
          <div v-else class="py-3 text-center text-[12px] text-gray-400">暂无数据</div>
        </div>
        <div class="rounded-xl bg-white p-3 shadow-sm">
          <div class="mb-2 text-[13px] font-medium text-[#dc2626]">缺勤榜 Top3</div>
          <div v-if="absentRank.length" class="space-y-2">
            <div
              v-for="(item, idx) in absentRank"
              :key="item.id"
              class="flex items-center gap-2"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                :class="idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-700'"
              >{{ idx + 1 }}</span>
              <span class="text-[14px]">{{ item.emoji }}</span>
              <span class="flex-1 truncate text-[13px] text-gray-700">{{ item.name }}</span>
              <span class="text-[12px] text-[#dc2626]">{{ item.count }}次</span>
            </div>
          </div>
          <div v-else class="py-3 text-center text-[12px] text-gray-400">暂无数据</div>
        </div>
      </div>

      <!-- Grouped records -->
      <div class="space-y-3">
        <div v-for="group in groupedByDate" :key="group.date">
          <div class="mb-1 px-1 text-[13px] font-medium text-gray-600">{{ group.label }}</div>
          <div class="space-y-2">
            <div
              v-for="r in group.records"
              :key="r.id"
              class="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-[20px]">
                {{ merchantEmoji(r.merchantId) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[14px] font-medium text-gray-900">
                  {{ merchantName(r.merchantId) }}
                </div>
                <div class="mt-0.5 text-[12px] text-gray-400">
                  {{ r.signedAt ? '签到 ' + r.signedAt : '未签到' }}
                </div>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
                :class="statusTag(r.status).cls"
              >{{ statusTag(r.status).label }}</span>
            </div>
          </div>
        </div>
        <div
          v-if="groupedByDate.length === 0"
          class="rounded-xl bg-white p-8 text-center text-[14px] text-gray-400 shadow-sm"
        >
          暂无记录
        </div>
      </div>
    </div>
  </div>
</template>
