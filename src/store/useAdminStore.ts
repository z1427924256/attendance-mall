import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  merchants as initialMerchants,
  type Merchant,
} from "@/data/mockData";
import * as api from "@/api/client";

// 单条考勤记录
export interface AttendanceRecord {
  id: string;
  merchantId: string;
  date: string; // YYYY-MM-DD
  status: "signedIn" | "absent" | "unsigned"; // 已到岗/缺勤/未签到
  signedAt?: string; // 签到时间 HH:mm
  operator?: string; // 操作人（补签/手动改状态时）
  remark?: string; // 备注
}

// 点名规则配置
export interface RollCallRule {
  dailyStartTime: string; // 每日点名开始时间 HH:mm
  dailyEndTime: string; // 每日点名结束时间 HH:mm
  absentThreshold: string; // 超过此时间未签到自动判为缺勤 HH:mm
  remindBefore: number; // 提前提醒分钟数
  holidays: string[]; // 节假日（免点名）YYYY-MM-DD
  weeklyOff: number[]; // 每周休息日 0=周日 6=周六
  enableAutoAbsent: boolean; // 启用自动缺勤判定
}

// 系统配置
export interface SystemConfig {
  [key: string]: string;
}

// 公告
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  scope: string | string[];
  pinned: boolean;
  forcePopup: boolean;
  expireAt: string;
  createdAt: string;
}

// snake_case → camelCase 映射：D1 system_config 表的 key 转为前端字段名
const SYSTEM_CONFIG_KEY_MAP: Record<string, string> = {
  mall_name: "mallName",
  logo_url: "logoUrl",
  report_header: "reportHeader",
  export_watermark: "exportWatermark",
  email_notification: "emailNotification",
  theme_color: "themeColor",
};

function mapSystemConfig(raw: Record<string, string>): SystemConfig {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    result[SYSTEM_CONFIG_KEY_MAP[k] || k] = v;
  }
  return result as SystemConfig;
}

interface AdminState {
  merchants: Merchant[];
  records: AttendanceRecord[];
  rule: RollCallRule;
  systemConfig: SystemConfig;
  announcements: Announcement[];
  // 商户
  addMerchant: (m: Omit<Merchant, "id">) => void;
  updateMerchant: (id: string, patch: Partial<Merchant>) => void;
  removeMerchant: (id: string) => void;
  // 考勤记录
  setRecordStatus: (
    id: string,
    status: AttendanceRecord["status"],
    operator?: string,
    remark?: string
  ) => void;
  addRemark: (id: string, remark: string) => void;
  batchSign: (ids: string[], operator: string) => void;
  // 规则
  updateRule: (patch: Partial<RollCallRule>) => void;
  // API 同步
  loadFromApi: () => Promise<void>;
  syncFromApi: () => Promise<void>;
}

// 生成最近 30 天的考勤记录 Mock
function genMockRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    initialMerchants.forEach((m) => {
      let status: AttendanceRecord["status"] = "unsigned";
      let signedAt: string | undefined;
      // 用 id 末位 + 日期生成稳定随机
      const seed =
        (parseInt(m.id.replace("m", "")) + i * 7) % 10;
      if (i === 0) {
        // 今天用商户当前状态
        if (m.signedIn) {
          status = "signedIn";
          signedAt = m.signedAt;
        } else if (m.absent) {
          status = "absent";
        } else {
          status = "unsigned";
        }
      } else if (i < 7) {
        // 近 7 天有数据
        if (seed < 7) {
          status = "signedIn";
          signedAt = `10:${String(seed * 3).padStart(2, "0")}`;
        } else if (seed < 9) {
          status = "absent";
        } else {
          status = "unsigned";
        }
      } else {
        // 更早的默认全勤
        status = "signedIn";
        signedAt = `10:${String(seed).padStart(2, "0")}`;
      }
      records.push({
        id: `${m.id}-${dateStr}`,
        merchantId: m.id,
        date: dateStr,
        status,
        signedAt,
      });
    });
  }
  return records;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      merchants: initialMerchants,
      records: genMockRecords(),
      rule: {
        dailyStartTime: "10:00",
        dailyEndTime: "11:00",
        absentThreshold: "11:00",
        remindBefore: 10,
        holidays: ["2026-01-01", "2026-02-10", "2026-05-01", "2026-06-19", "2026-10-01"],
        weeklyOff: [0],
        enableAutoAbsent: true,
      },
      systemConfig: {
        mallName: "名创广场",
        logoUrl: "",
        reportHeader: "商场考勤管理报表",
        exportWatermark: "内部资料 请勿外传",
        emailNotification: "0",
        themeColor: "#16a34a",
      },
      announcements: [],

      // ========== API Sync Actions ==========

      loadFromApi: async () => {
        try {
          const [merchants, records, rule, rawConfig, announcements] = await Promise.all([
            api.fetchMerchants(),
            api.fetchRecords(),
            api.fetchRules(),
            api.fetchSystemConfig().catch(() => get().systemConfig),
            api.fetchAnnouncements().catch(() => []),
          ]);
          // system_config API 返回 snake_case key，转换为 camelCase
          const systemConfig = rawConfig ? mapSystemConfig(rawConfig) : get().systemConfig;
          set({ merchants, records, rule, systemConfig, announcements });
        } catch {
          console.warn("[store] loadFromApi failed, using local cache");
        }
      },

      syncFromApi: async () => {
        try {
          const [merchants, records, rule, rawConfig, announcements] = await Promise.all([
            api.fetchMerchants(),
            api.fetchRecords(),
            api.fetchRules(),
            api.fetchSystemConfig().catch(() => get().systemConfig),
            api.fetchAnnouncements().catch(() => []),
          ]);
          const systemConfig = rawConfig ? mapSystemConfig(rawConfig) : get().systemConfig;
          set({ merchants, records, rule, systemConfig, announcements });
        } catch {
          console.warn("[store] syncFromApi failed, keeping current state");
        }
      },

      // ========== Merchants ==========

      addMerchant: (m) => {
        const id = `m${Date.now()}`;
        set((s) => ({
          merchants: [...s.merchants, { ...m, id }],
        }));
        // Fire-and-forget API call
        api.createMerchant(m).catch((e) => {
          console.warn("[store] createMerchant API failed:", e);
        });
      },

      updateMerchant: (id, patch) => {
        set((s) => ({
          merchants: s.merchants.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        }));
        api.updateMerchant(id, patch).catch((e) => {
          console.warn("[store] updateMerchant API failed:", e);
        });
      },

      removeMerchant: (id) => {
        set((s) => ({
          merchants: s.merchants.filter((m) => m.id !== id),
        }));
        api.deleteMerchant(id).catch((e) => {
          console.warn("[store] deleteMerchant API failed:", e);
        });
      },

      // ========== Attendance Records ==========

      setRecordStatus: (id, status, operator, remark) => {
        const signedAt =
          status === "signedIn"
            ? get().records.find((r) => r.id === id)?.signedAt ??
              new Date().toTimeString().slice(0, 5)
            : undefined;

        set((s) => ({
          records: s.records.map((r) =>
            r.id === id
              ? { ...r, status, signedAt, operator, remark }
              : r
          ),
        }));

        api.updateRecord(id, { status, signedAt, operator, remark }).catch(
          (e) => {
            console.warn("[store] setRecordStatus API failed:", e);
          }
        );
      },

      addRemark: (id, remark) => {
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id ? { ...r, remark } : r
          ),
        }));
        api.updateRecord(id, { remark }).catch((e) => {
          console.warn("[store] addRemark API failed:", e);
        });
      },

      batchSign: (ids, operator) => {
        const now = new Date().toTimeString().slice(0, 5);
        set((s) => ({
          records: s.records.map((r) =>
            ids.includes(r.id)
              ? {
                  ...r,
                  status: "signedIn" as const,
                  signedAt: r.signedAt ?? now,
                  operator,
                }
              : r
          ),
        }));
        api.batchSignRecords(ids, operator).catch((e) => {
          console.warn("[store] batchSign API failed:", e);
        });
      },

      // ========== Rules ==========

      updateRule: (patch) => {
        set((s) => ({ rule: { ...s.rule, ...patch } }));
        api.updateRules(patch).catch((e) => {
          console.warn("[store] updateRule API failed:", e);
        });
      },
    }),
    {
      name: "admin-store", // localStorage key
      // 只持久化这三个字段（actions 不需要）
      partialize: (state) => ({
        merchants: state.merchants,
        records: state.records,
        rule: state.rule,
        systemConfig: state.systemConfig,
        announcements: state.announcements,
      }),
    }
  )
);
