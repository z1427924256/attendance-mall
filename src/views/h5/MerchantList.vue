<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRollCallStore } from '@/store/rollcall';
import { useAdminStore } from '@/store/admin';
import type { Merchant } from '@/types';

const router = useRouter();
const store = useRollCallStore();
const adminStore = useAdminStore();

const FLOORS = ['全部', '1F', '2F', '3F', '4F'];
const mallName = computed(() => adminStore.systemConfig.mallName || '名创广场');

const filtered = computed(() => store.filteredList);

const overview = computed(() => {
  const list = filtered.value;
  const total = list.length;
  const signedIn = list.filter((m) => m.signedIn).length;
  const absent = list.filter((m) => m.absent).length;
  const unsigned = total - signedIn - absent;
  const absentRate = total > 0 ? Math.round((absent / total) * 100) : 0;
  return { total, signedIn, absent, unsigned, absentRate };
});

function statusOf(m: Merchant): { label: string; cls: string } {
  if (m.signedIn) return { label: '已到岗', cls: 'bg-[#16a34a]/10 text-[#16a34a]' };
  if (m.absent) return { label: '缺勤', cls: 'bg-[#dc2626]/10 text-[#dc2626]' };
  return { label: '未签到', cls: 'bg-gray-200 text-gray-500' };
}

function selectFloor(f: string) {
  store.setActiveFloor(f);
}
function goDetail(id: string) {
  router.push(`/merchant/${id}`);
}

onMounted(() => {
  store.loadFromApi();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <div class="bg-[#16a34a] px-4 pb-4 pt-3 text-white">
      <div class="text-[18px] font-semibold">商户</div>
      <div class="text-[12px] opacity-90">{{ mallName }}</div>
    </div>

    <div class="space-y-3 p-3">
      <!-- FloorTabs -->
      <div class="flex gap-2 overflow-x-auto">
        <button
          v-for="f in FLOORS"
          :key="f"
          type="button"
          class="shrink-0 cursor-pointer rounded-full border-0 px-4 py-1.5 text-[13px]"
          :class="store.activeFloor === f ? 'bg-[#16a34a] text-white' : 'bg-white text-gray-600'"
          @click="selectFloor(f)"
        >
          {{ f }}
        </button>
      </div>

      <!-- Overview 4-grid -->
      <div class="grid grid-cols-4 gap-2">
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-[#16a34a]">{{ overview.signedIn }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">已到岗</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-gray-500">{{ overview.unsigned }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">未签到</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-[#dc2626]">{{ overview.absentRate }}%</div>
          <div class="mt-0.5 text-[11px] text-gray-400">缺勤率</div>
        </div>
        <div class="rounded-xl bg-white p-3 text-center shadow-sm">
          <div class="text-[18px] font-bold text-gray-700">{{ overview.total }}</div>
          <div class="mt-0.5 text-[11px] text-gray-400">总商户</div>
        </div>
      </div>

      <!-- List -->
      <div class="space-y-2">
        <div
          v-for="m in filtered"
          :key="m.id"
          class="flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3 shadow-sm active:bg-gray-50"
          @click="goDetail(m.id)"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-[24px]">
            {{ m.emoji }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1">
              <span class="truncate text-[15px] font-medium text-gray-900">{{ m.name }}</span>
              <span v-if="m.verified" class="rounded bg-blue-500/10 px-1 text-[10px] text-blue-500">认证</span>
            </div>
            <div class="mt-0.5 text-[12px] text-gray-400">
              {{ m.floor }} · {{ m.location }} · {{ m.category }}
            </div>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
            :class="statusOf(m).cls"
          >{{ statusOf(m).label }}</span>
        </div>
        <div
          v-if="filtered.length === 0"
          class="rounded-xl bg-white p-8 text-center text-[14px] text-gray-400 shadow-sm"
        >
          暂无商户
        </div>
      </div>
    </div>
  </div>
</template>
