<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAdminStore } from '@/store/admin';
import type { Announcement } from '@/types';
import dayjs from 'dayjs';

const STORAGE_KEY = 'read_announcements';
const adminStore = useAdminStore();

const queue = ref<Announcement[]>([]);
const cursor = ref(0);

const visible = computed(() => cursor.value < queue.value.length);
const current = computed<Announcement | null>(() => queue.value[cursor.value] ?? null);
const total = computed(() => queue.value.length);

function readIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

function markRead(id: string) {
  const ids = readIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}

function buildQueue() {
  const now = dayjs();
  const seen = readIds();
  const active = adminStore.announcements.filter((a) => {
    if (!a.forcePopup) return false;
    if (a.expireAt) {
      const end = dayjs(a.expireAt).endOf('day');
      if (now.isAfter(end)) return false;
    }
    return !seen.includes(a.id);
  });
  queue.value = active;
  cursor.value = 0;
}

watch(() => adminStore.announcements, buildQueue, { immediate: true });

function handleConfirm() {
  if (current.value) markRead(current.value.id);
  cursor.value += 1;
}
</script>

<template>
  <div
    v-if="visible && current"
    class="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-6"
  >
    <div class="w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl">
      <div class="mb-3 flex items-center justify-between">
        <span class="rounded bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-500">
          📢 公告通知
        </span>
        <span v-if="total > 1" class="text-[11px] text-gray-400">{{ cursor + 1 }} / {{ total }}</span>
      </div>
      <h3 class="mb-2 text-[16px] font-bold text-gray-900">{{ current.title }}</h3>
      <p class="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-500">{{ current.content }}</p>
      <button
        type="button"
        class="mt-4 w-full cursor-pointer rounded-lg border-0 bg-[#16a34a] py-2.5 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
        @click="handleConfirm"
      >
        我知道了
      </button>
    </div>
  </div>
</template>
