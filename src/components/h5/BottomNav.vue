<script setup lang="ts">
import { useRouter } from 'vue-router';
import { CheckCheck, Store, ClipboardList } from 'lucide-vue-next';
import { useRollCallStore } from '@/store/rollcall';

const router = useRouter();
const store = useRollCallStore();

function go(path: string, tab: 'rollcall' | 'merchants' | 'records') {
  store.setActiveTab(tab);
  router.push(path);
}
</script>

<template>
  <nav class="bottom-nav">
    <div
      class="nav-item"
      :class="{ active: store.activeTab === 'rollcall' }"
      @click="go('/', 'rollcall')"
    >
      <CheckCheck :size="22" />
      <span>点名</span>
    </div>
    <div
      class="nav-item"
      :class="{ active: store.activeTab === 'merchants' }"
      @click="go('/merchants', 'merchants')"
    >
      <Store :size="22" />
      <span>商户</span>
    </div>
    <div
      class="nav-item"
      :class="{ active: store.activeTab === 'records' }"
      @click="go('/records', 'records')"
    >
      <ClipboardList :size="22" />
      <span>记录</span>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--color-bg-1);
  border-top: 1px solid var(--color-neutral-3);
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--color-text-3);
  font-size: 11px;
  cursor: pointer;
  transition: color 0.2s;
}

.nav-item.active {
  color: rgb(var(--primary-6));
}
</style>
