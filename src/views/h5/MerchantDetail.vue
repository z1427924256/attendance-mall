<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronLeft, Bell, Download } from 'lucide-vue-next';
import dayjs from 'dayjs';
import { useAdminStore } from '@/store/admin';
import { exportCsv } from '@/utils/exportCsv';

type Period = '今日' | '本周' | '本月';
const PERIODS: Period[] = ['今日', '本周', '本月'];

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();
const period = ref<Period>('今日');

const merchantId = computed(() => String(route.params.id ?? ''));
const merchant = computed(() => adminStore.merchants.find((m) => m.id === merchantId.value));

const nowEndMs = dayjs().endOf('day').valueOf();
const periodStartMs = computed(() => {
  const now = dayjs();
  if (period.value === '今日') return now.startOf('day').valueOf();
  if (period.value === '本周') return now.day(0).startOf('day').valueOf();
  return now.startOf('month').valueOf();
});

const records = computed(() =>
  adminStore.records.filter((r) => {
    if (r.merchantId !== merchantId.value) return false;
    const t = dayjs(r.date).valueOf();
    return t >= periodStartMs.value && t <= nowEndMs;
  })
);

const stats = computed(() => {
  const total = records.value.length;
  const present = records.value.filter((r) => r.status === 'signedIn').length;
  const absent = records.value.filter((r) => r.status === 'absent').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, absent, rate };
});

const absentDates = computed(() =>
  records.value
    .filter((r) => r.status === 'absent')
    .map((r) => r.date)
    .sort()
);

function statusTag(status: string) {
  if (status === 'signedIn') return { label: '已到岗', cls: 'bg-[#16a34a]/10 text-[#16a34a]' };
  if (status === 'absent') return { label: '缺勤', cls: 'bg-[#dc2626]/10 text-[#dc2626]' };
  return { label: '未签到', cls: 'bg-gray-200 text-gray-500' };
}

function goBack() {
  router.back();
}
function goRecords() {
  router.push('/records');
}

function handleExport() {
  const rows = records.value
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => ({
      日期: r.date,
      商户: merchant.value?.name ?? '',
      楼层: merchant.value?.floor ?? '',
      铺位: merchant.value?.location ?? '',
      业态: merchant.value?.category ?? '',
      状态: statusTag(r.status).label,
      签到时间: r.signedAt ?? '',
      备注: r.remark ?? '',
    }));
  exportCsv(`${merchant.value?.name ?? '商户'}_考勤明细_${period.value}`, rows);
}

onMounted(() => {
  adminStore.loadFromApi();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-10">
    <!-- 渐变头部 -->
    <div class="px-4 pb-6 pt-3 text-white" style="background: linear-gradient(135deg, #16a34a, #15803d)">
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-white/20"
          @click="goBack"
        >
          <ChevronLeft :size="20" />
        </button>
        <button
          type="button"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 bg-white/20"
          @click="goRecords"
        >
          <Bell :size="18" />
        </button>
      </div>
      <div class="mt-3 flex flex-col items-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-full bg-white/25 text-[40px]">
          {{ merchant?.emoji ?? '🏪' }}
        </div>
        <div class="mt-2 flex items-center gap-1">
          <span class="text-[18px] font-semibold">{{ merchant?.name ?? '未知商户' }}</span>
          <span v-if="merchant?.verified" class="rounded bg-white/25 px-1 text-[10px]">认证</span>
        </div>
        <div class="mt-1 text-[12px] opacity-90">
          {{ merchant?.category ?? '-' }} · {{ merchant?.floor ?? '-' }} · {{ merchant?.location ?? '-' }}
        </div>
      </div>
    </div>

    <div v-if="merchant" class="space-y-3 p-3">
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

      <!-- 考勤明细卡 -->
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <div class="mb-3 text-[14px] font-medium text-gray-700">考勤明细</div>
        <div class="flex items-center justify-around">
          <div class="text-center">
            <div class="text-[22px] font-bold text-[#16a34a]">{{ stats.present }}</div>
            <div class="text-[12px] text-gray-400">到岗天数</div>
          </div>
          <div class="h-8 w-px bg-gray-200"></div>
          <div class="text-center">
            <div class="text-[22px] font-bold text-[#dc2626]">{{ stats.absent }}</div>
            <div class="text-[12px] text-gray-400">缺勤天数</div>
          </div>
          <div class="h-8 w-px bg-gray-200"></div>
          <div class="text-center">
            <div class="text-[22px] font-bold text-gray-700">{{ stats.rate }}%</div>
            <div class="text-[12px] text-gray-400">到岗率</div>
          </div>
        </div>
      </div>

      <!-- 四宫格统计 -->
      <div class="grid grid-cols-4 gap-2">
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-gray-700">{{ stats.total }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">应签到</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-[#16a34a]">{{ stats.present }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">实际到岗</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-[#dc2626]">{{ stats.absent }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">缺勤</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-gray-700">{{ stats.rate }}%</div>
          <div class="mt-0.5 text-[11px] text-gray-400">考勤率</div>
        </div>
      </div>

      <!-- 缺勤记录汇总 -->
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <div class="mb-2 text-[14px] font-medium text-gray-700">缺勤记录汇总</div>
        <div v-if="absentDates.length" class="flex flex-wrap gap-2">
          <span
            v-for="d in absentDates"
            :key="d"
            class="rounded bg-gray-100 px-2 py-1 text-[12px] text-gray-500"
          >{{ d }}</span>
        </div>
        <div v-else class="py-2 text-center text-[13px] text-gray-400">暂无缺勤记录</div>
      </div>

      <!-- 导出 CSV -->
      <button
        type="button"
        class="flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl border-0 bg-white py-3 text-[14px] font-medium text-[#16a34a] shadow-sm active:bg-gray-50"
        @click="handleExport"
      >
        <Download :size="16" /> 导出CSV
      </button>
    </div>
    <div v-else class="p-8 text-center text-[14px] text-gray-400">商户不存在</div>
  </div>
</template>
