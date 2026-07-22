import { defineStore } from 'pinia';
import type {
  Merchant,
  AttendanceRecord,
  RollCallRule,
  SystemConfig,
  Announcement,
  TodayStats,
} from '@/types';
import * as api from '@/api/client';

interface AdminState {
  merchants: Merchant[];
  records: AttendanceRecord[];
  rule: RollCallRule;
  systemConfig: SystemConfig;
  announcements: Announcement[];
  loading: boolean;
}

const defaultRule: RollCallRule = {
  dailyStartTime: '10:00',
  dailyEndTime: '11:00',
  absentThreshold: '11:30',
  remindBefore: 10,
  holidays: [],
  weeklyOff: [0, 6],
  enableAutoAbsent: true,
};

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    merchants: [],
    records: [],
    rule: { ...defaultRule },
    systemConfig: {
      mallName: '名创广场',
      logoUrl: '',
      reportHeader: '商场考勤管理报表',
      exportWatermark: '内部资料 请勿外传',
      emailNotification: '0',
      themeColor: '#165DFF',
      mallAddress: '',
      servicePhone: '',
      mallHours: '10:00-22:00',
      copyright: '',
      icp: '',
      checkinRadius: '0',
      locationEnabled: '0',
    },
    announcements: [],
    loading: false,
  }),

  getters: {
    todayStats(state): TodayStats {
      const today = new Date().toISOString().slice(0, 10);
      const todayRecords = state.records.filter((r) => r.date === today);
      const signedIn = todayRecords.filter((r) => r.status === 'signedIn').length;
      const absent = todayRecords.filter((r) => r.status === 'absent').length;
      const unsigned = todayRecords.filter((r) => r.status === 'unsigned').length;
      const total = state.merchants.length;
      const named = signedIn + absent;
      const rate = total > 0 ? Math.round((signedIn / total) * 100) : 0;
      return { total, signedIn, absent, unsigned, named, rate };
    },
  },

  actions: {
    async loadFromApi() {
      this.loading = true;
      try {
        const [merchants, records, rule, systemConfig, announcements] = await Promise.all([
          api.fetchMerchants().catch(() => [] as Merchant[]),
          api.fetchRecords().catch(() => [] as AttendanceRecord[]),
          api.fetchRules().catch(() => ({ ...defaultRule })),
          api.fetchSystemConfig().catch(() => ({} as SystemConfig)),
          api.fetchAnnouncements().catch(() => [] as Announcement[]),
        ]);
        this.merchants = merchants;
        this.records = records;
        this.rule = rule;
        // 后端 system_config 是 key-value，需做 snake_case → camelCase 映射
        this.systemConfig = {
          mallName: systemConfig.mallName ?? systemConfig.mall_name ?? '名创广场',
          logoUrl: systemConfig.logoUrl ?? systemConfig.logo_url ?? '',
          reportHeader: systemConfig.reportHeader ?? systemConfig.report_header ?? '商场考勤管理报表',
          exportWatermark: systemConfig.exportWatermark ?? systemConfig.export_watermark ?? '内部资料 请勿外传',
          emailNotification: systemConfig.emailNotification ?? systemConfig.email_notification ?? '0',
          themeColor: systemConfig.themeColor ?? systemConfig.theme_color ?? '#165DFF',
          mallAddress: systemConfig.mallAddress ?? systemConfig.mall_address ?? '',
          servicePhone: systemConfig.servicePhone ?? systemConfig.service_phone ?? '',
          mallHours: systemConfig.mallHours ?? systemConfig.mall_hours ?? '10:00-22:00',
          copyright: systemConfig.copyright ?? '',
          icp: systemConfig.icp ?? '',
          checkinRadius: systemConfig.checkinRadius ?? systemConfig.checkin_radius ?? '0',
          locationEnabled: systemConfig.locationEnabled ?? systemConfig.location_enabled ?? '0',
        };
        this.announcements = announcements;
      } finally {
        this.loading = false;
      }
    },

    async syncFromApi() {
      const [merchants, records] = await Promise.all([
        api.fetchMerchants(),
        api.fetchRecords(),
      ]);
      this.merchants = merchants;
      this.records = records;
    },

    // ===== 商户 =====
    async addMerchant(data: Omit<Merchant, 'id'>) {
      const m = await api.createMerchant(data);
      this.merchants = [...this.merchants, m];
      return m;
    },
    async updateMerchant(id: string, data: Partial<Merchant>) {
      const old = JSON.parse(JSON.stringify(this.merchants));
      // 乐观更新
      this.merchants = this.merchants.map((m) => (m.id === id ? { ...m, ...data } : m));
      try {
        await api.updateMerchant(id, data);
      } catch (e) {
        this.merchants = old;
        console.error('updateMerchant failed', e);
        throw e;
      }
    },
    async removeMerchant(id: string) {
      const old = JSON.parse(JSON.stringify(this.merchants));
      this.merchants = this.merchants.filter((m) => m.id !== id);
      try {
        await api.deleteMerchant(id);
      } catch (e) {
        this.merchants = old;
        console.error('removeMerchant failed', e);
        throw e;
      }
    },

    // ===== 考勤记录 =====
    async setRecordStatus(id: string, status: AttendanceRecord['status'], operator = 'admin', signedAt?: string) {
      const old = JSON.parse(JSON.stringify(this.records));
      this.records = this.records.map((r) =>
        r.id === id ? { ...r, status, operator, signedAt: signedAt ?? r.signedAt } : r
      );
      try {
        await api.updateRecord(id, { status, operator, signedAt });
      } catch (e) {
        this.records = old;
        console.error('setRecordStatus failed', e);
        throw e;
      }
    },
    async addRemark(id: string, remark: string, operator = 'admin') {
      const old = JSON.parse(JSON.stringify(this.records));
      this.records = this.records.map((r) => (r.id === id ? { ...r, remark, operator } : r));
      try {
        await api.updateRecord(id, { remark, operator });
      } catch (e) {
        this.records = old;
        console.error('addRemark failed', e);
        throw e;
      }
    },
    async batchSign(ids: string[], operator = 'admin') {
      const now = new Date();
      const signedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const old = JSON.parse(JSON.stringify(this.records));
      this.records = this.records.map((r) =>
        ids.includes(r.id) ? { ...r, status: 'signedIn' as const, operator, signedAt } : r
      );
      try {
        await api.batchSignRecords(ids, operator);
      } catch (e) {
        this.records = old;
        console.error('batchSign failed', e);
        throw e;
      }
    },

    // ===== 规则 =====
    async updateRule(data: Partial<RollCallRule>) {
      const old = JSON.parse(JSON.stringify(this.rule));
      this.rule = { ...this.rule, ...data };
      try {
        await api.updateRules(data);
      } catch (e) {
        this.rule = old;
        console.error('updateRule failed', e);
        throw e;
      }
    },
  },

  persist: {
    key: 'admin-store-vue',
    storage: localStorage,
    pick: ['merchants', 'records', 'rule', 'systemConfig', 'announcements'],
  },
});
