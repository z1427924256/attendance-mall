<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronLeft, ChevronRight, CheckCheck } from 'lucide-vue-next';
import dayjs from 'dayjs';
import { useRollCallStore } from '@/store/rollcall';
import { useAdminStore } from '@/store/admin';
import AnnouncementPopup from '@/components/h5/AnnouncementPopup.vue';

const router = useRouter();
const store = useRollCallStore();
const adminStore = useAdminStore();

const FLOORS = ['全部', '1F', '2F', '3F', '4F'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const dateStr = computed(() => {
  const d = dayjs();
  return `${d.format('YYYY年MM月DD日')} 星期${WEEKDAYS[d.day()]}`;
});

const mallName = computed(() => adminStore.systemConfig.mallName || '名创广场');
const stats = computed(() => store.todayStats);
const current = computed(() => store.currentMerchant);
const listLen = computed(() => store.filteredList.length);
const pagerIndex = computed(() => (listLen.value > 0 ? store.currentIndex + 1 : 0));

const RADIUS = 52;
const circumference = 2 * Math.PI * RADIUS;
const ringOffset = computed(() => circumference * (1 - stats.value.rate / 100));

function selectFloor(f: string) {
  store.setActiveFloor(f);
}
function prev() {
  store.prevMerchant();
}
function next() {
  store.nextMerchant();
}
function handleSign() {
  const m = current.value;
  if (!m || m.signedIn || m.absent) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  store.updateMerchant(m.id, { signedIn: true, signedAt: `${hh}:${mm}` });
}
function goRecords() {
  store.setActiveTab('records');
  router.push('/records');
}

onMounted(() => {
  store.loadFromApi();
  adminStore.loadFromApi();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- TopBar -->
    <div class="bg-[#16a34a] px-4 pb-4 pt-3 text-white">
      <div class="text-[12px] opacity-90">{{ dateStr }}</div>
      <div class="mt-0.5 text-[18px] font-semibold">{{ mallName }}</div>
    </div>

    <div class="space-y-3 p-3">
      <!-- ProgressCard -->
      <div class="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
        <div class="relative h-[120px] w-[120px] shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" :r="RADIUS" fill="none" stroke="#e5e7eb" stroke-width="10" />
            <circle
              cx="60"
              cy="60"
              :r="RADIUS"
              fill="none"
              stroke="#16a34a"
              stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="ringOffset"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <div class="text-[11px] text-gray-400">已点名</div>
            <div class="text-[20px] font-bold text-gray-900">{{ stats.named }}/{{ stats.total }}</div>
            <div class="text-[11px] text-[#16a34a]">{{ stats.rate }}%</div>
          </div>
        </div>
        <div class="flex-1">
          <div class="text-[13px] text-gray-400">今日点名进度</div>
          <div class="mt-1 text-[14px] text-gray-600">共 {{ stats.total }} 家商户</div>
          <div class="mt-2 flex flex-wrap gap-3 text-[12px]">
            <span class="text-[#16a34a]">已到岗 {{ stats.signedIn }}</span>
            <span class="text-[#dc2626]">缺勤 {{ stats.absent }}</span>
            <span class="text-gray-400">未点名 {{ stats.unsigned }}</span>
          </div>
        </div>
      </div>

      <!-- FloorTabs -->
      <div class="flex gap-2 overflow-x-auto">
        <button
          v-for="f in FLOORS"
          :key="f"
          type="button"
          class="shrink-0 cursor-pointer rounded-full border-0 px-4 py-1.5 text-[13px] transition-colors"
          :class="store.activeFloor === f ? 'bg-[#16a34a] text-white' : 'bg-white text-gray-600'"
          @click="selectFloor(f)"
        >
          {{ f }}
        </button>
      </div>

      <!-- CheckinCard -->
      <div v-if="current" class="rounded-xl bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between text-[12px] text-gray-400">
          <span>{{ current.floor }} · {{ current.location }}</span>
          <span>第 {{ pagerIndex }} / 共 {{ listLen }}</span>
        </div>

        <div class="mt-3 flex items-center gap-3">
          <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-50 text-[28px]">
            {{ current.emoji }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1">
              <span class="truncate text-[16px] font-semibold text-gray-900">{{ current.name }}</span>
              <span v-if="current.verified" class="rounded bg-blue-500/10 px-1 text-[10px] text-blue-500">认证</span>
            </div>
            <div class="mt-0.5 text-[12px] text-gray-400">{{ current.category }}</div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <button
            type="button"
            class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-gray-100 text-gray-600 transition-transform active:scale-95"
            @click="prev"
          >
            <ChevronLeft :size="20" />
          </button>

          <button
            type="button"
            class="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-full border-0 text-white transition-transform active:scale-95"
            :class="
              current.signedIn
                ? 'bg-[#16a34a]/15 text-[#16a34a]'
                : current.absent
                  ? 'bg-gray-200 text-gray-500'
                  : 'bg-[#16a34a]'
            "
            @click="handleSign"
          >
            <CheckCheck v-if="current.signedIn" :size="26" />
            <span class="mt-1 text-[14px] font-semibold">
              <template v-if="current.signedIn">已到岗 {{ current.signedAt }}</template>
              <template v-else-if="current.absent">已缺勤</template>
              <template v-else>点击签到</template>
            </span>
          </button>

          <button
            type="button"
            class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-gray-100 text-gray-600 transition-transform active:scale-95"
            @click="next"
          >
            <ChevronRight :size="20" />
          </button>
        </div>
      </div>
      <div v-else class="rounded-xl bg-white p-8 text-center text-[14px] text-gray-400 shadow-sm">
        暂无商户数据
      </div>

      <!-- StatsBar -->
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex gap-5 text-[12px]">
            <div>
              <div class="text-[16px] font-bold text-[#16a34a]">{{ stats.signedIn }}</div>
              <div class="text-gray-400">正常</div>
            </div>
            <div>
              <div class="text-[16px] font-bold text-[#dc2626]">{{ stats.absent }}</div>
              <div class="text-gray-400">缺勤</div>
            </div>
            <div>
              <div class="text-[16px] font-bold text-gray-500">{{ stats.unsigned }}</div>
              <div class="text-gray-400">未点名</div>
            </div>
          </div>
          <button
            type="button"
            class="cursor-pointer border-0 bg-transparent text-[13px] text-[#16a34a]"
            @click="goRecords"
          >
            查看详情 ›
          </button>
        </div>
      </div>
    </div>

    <AnnouncementPopup />
  </div>
</template>
