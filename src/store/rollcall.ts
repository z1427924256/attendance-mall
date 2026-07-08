import { defineStore } from 'pinia';
import type { Merchant } from '@/types';
import { fetchMerchants } from '@/api/client';

interface RollCallState {
  merchants: Merchant[];
  activeFloor: string; // '全部' | '1F' | '2F' | '3F' | '4F'
  currentIndex: number;
  activeTab: 'rollcall' | 'merchants' | 'records';
}

export const useRollCallStore = defineStore('rollcall', {
  state: (): RollCallState => ({
    merchants: [],
    activeFloor: '全部',
    currentIndex: 0,
    activeTab: 'rollcall',
  }),

  getters: {
    filteredList(state): Merchant[] {
      if (state.activeFloor === '全部') return state.merchants;
      return state.merchants.filter((m) => m.floor === state.activeFloor);
    },
    currentMerchant(state): Merchant | undefined {
      const list = state.activeFloor === '全部' ? state.merchants : state.merchants.filter((m) => m.floor === state.activeFloor);
      return list[state.currentIndex];
    },
    todayStats(state) {
      const total = state.merchants.length;
      const signedIn = state.merchants.filter((m) => m.signedIn).length;
      const absent = state.merchants.filter((m) => m.absent).length;
      const unsigned = total - signedIn - absent;
      const named = signedIn + absent;
      const rate = total > 0 ? Math.round((signedIn / total) * 100) : 0;
      return { total, signedIn, absent, unsigned, named, rate };
    },
  },

  actions: {
    async loadFromApi() {
      try {
        this.merchants = await fetchMerchants();
      } catch (e) {
        console.error('load merchants failed', e);
      }
    },
    setActiveFloor(floor: string) {
      this.activeFloor = floor;
      this.currentIndex = 0;
    },
    setCurrentIndex(idx: number) {
      this.currentIndex = idx;
    },
    nextMerchant() {
      const len = this.filteredList.length;
      if (len > 0) this.currentIndex = (this.currentIndex + 1) % len;
    },
    prevMerchant() {
      const len = this.filteredList.length;
      if (len > 0) this.currentIndex = (this.currentIndex - 1 + len) % len;
    },
    setActiveTab(tab: RollCallState['activeTab']) {
      this.activeTab = tab;
    },
    updateMerchant(id: string, data: Partial<Merchant>) {
      this.merchants = this.merchants.map((m) => (m.id === id ? { ...m, ...data } : m));
    },
  },

  persist: {
    key: 'rollcall-store-vue',
    storage: localStorage,
    pick: ['merchants', 'activeFloor', 'currentIndex', 'activeTab'],
  },
});
