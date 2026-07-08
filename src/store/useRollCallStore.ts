import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  todayStats,
  type Merchant,
} from "@/data/mockData";
import { fetchMerchants } from "@/api/client";

interface RollCallState {
  merchants: Merchant[];
  activeFloor: string;
  currentIndex: number; // 当前签到卡片索引（基于筛选后的列表）
  stats: typeof todayStats;
  // 底部导航激活项
  activeTab: "rollcall" | "merchant" | "record";
  setActiveFloor: (floor: string) => void;
  setCurrentIndex: (i: number) => void;
  nextMerchant: () => void;
  prevMerchant: () => void;
  setActiveTab: (tab: "rollcall" | "merchant" | "record") => void;
  updateMerchant: (id: string, patch: Partial<Merchant>) => void;
  loadFromApi: () => Promise<void>;
}

export const useRollCallStore = create<RollCallState>()(
  persist(
    (set, get) => ({
      merchants: [],
      activeFloor: "全部",
      currentIndex: 0,
      stats: todayStats,
      activeTab: "rollcall",
      setActiveFloor: (floor) => set({ activeFloor: floor, currentIndex: 0 }),
      setCurrentIndex: (i) => set({ currentIndex: i }),
      nextMerchant: () => {
        const { currentIndex, merchants, activeFloor } = get();
        const list = filteredList(merchants, activeFloor);
        if (list.length === 0) return;
        set({ currentIndex: (currentIndex + 1) % list.length });
      },
      prevMerchant: () => {
        const { currentIndex, merchants, activeFloor } = get();
        const list = filteredList(merchants, activeFloor);
        if (list.length === 0) return;
        set({ currentIndex: (currentIndex - 1 + list.length) % list.length });
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      updateMerchant: (id, patch) =>
        set((state) => ({
          merchants: state.merchants.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        })),
      loadFromApi: async () => {
        try {
          const merchants = await fetchMerchants();
          set({ merchants });
        } catch {
          console.warn("[rollcall] loadFromApi failed");
        }
      },
    }),
    {
      name: "rollcall-store",
      partialize: (state) => ({
        merchants: state.merchants,
      }),
    }
  )
);

export function filteredList(
  merchants: Merchant[],
  floor: string
): Merchant[] {
  if (floor === "全部") return merchants;
  return merchants.filter((m) => m.floor === floor);
}
