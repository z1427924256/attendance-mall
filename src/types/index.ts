// ===== 数据模型定义（Vue3 重构版，统一字段命名） =====

/** 商户 */
export interface Merchant {
  id: string;
  name: string;
  floor: string; // 1F / 2F / 3F / 4F
  location: string; // 铺位号 如 2F-222
  verified: boolean;
  avatar?: string;
  signedIn: boolean;
  absent?: boolean;
  signedAt?: string;
}

/** 考勤记录 */
export interface AttendanceRecord {
  id: string;
  merchantId: string;
  date: string; // YYYY-MM-DD
  status: 'signedIn' | 'absent' | 'unsigned';
  signedAt?: string; // HH:mm
  operator?: string;
  remark?: string;
}

/** 点名规则 */
export interface RollCallRule {
  dailyStartTime: string; // HH:mm
  dailyEndTime: string; // HH:mm
  absentThreshold: string; // HH:mm 自动缺勤判定时间
  remindBefore: number; // 分钟
  holidays: string[]; // YYYY-MM-DD[]
  weeklyOff: number[]; // 0=周日 ... 6=周六
  enableAutoAbsent: boolean;
}

/** 系统配置（key-value） */
export type SystemConfig = Record<string, string>;

/** 公告 */
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'global' | 'targeted';
  scope: string | string[];
  pinned: boolean;
  forcePopup: boolean;
  expireAt: string;
  createdAt: string;
}

/** 楼层/区域/业态 */
export interface StructureItem {
  id: string;
  name: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  floorId?: string; // 仅 areas
}

/** 异常台账 */
export interface ExceptionItem {
  id: string;
  date: string;
  merchantId: string;
  merchantName?: string;
  floor?: string;
  location?: string;
  exceptionType: 'absent' | 'unsigned';
  status: 'pending' | 'processing' | 'resolved' | 'watchlist';
  remark: string;
  handler: string;
  createdAt: string;
  updatedAt: string;
}

/** 商户评级 */
export interface RatingItem {
  merchantId: string;
  merchantName: string;
  floor: string;
  location: string;
  month: string; // YYYY-MM
  score: number;
  level: 'excellent' | 'qualified' | 'warning' | 'watchlist';
  attendanceRate: number;
  absentCount: number;
  presentCount: number;
  totalDays: number;
}

/** 邮件配置 */
export interface EmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string; // 写入时用，读取时不返回
  hasPassword?: boolean; // 读取时返回
  fromName: string;
  fromEmail: string;
  recipients: string[];
}

/** 预警规则 */
export interface AlertRule {
  id: string;
  name: string;
  conditionType: 'daily_absent_count' | 'merchant_monthly_absent';
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

/** 预警记录 */
export interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName?: string;
  content: string;
  status: 'pending' | 'triggered' | 'resolved' | 'notified';
  createdAt: string;
}

/** 审计日志 */
export interface AuditLog {
  id: string;
  user: string;
  operator: string;
  action: string;
  module: string;
  targetType: string;
  targetId: string;
  beforeData: string;
  afterData: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  user?: string;
  module?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogResponse {
  list: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

/** 导入日志 */
export interface ImportLog {
  id: string;
  type: string;
  total: number;
  successCount: number;
  failCount: number;
  failReasons: string[];
  operator: string;
  createdAt: string;
}

export interface ImportResult {
  success: boolean;
  successCount: number;
  failCount: number;
  failReasons: string[];
}

/** 考勤记录筛选 */
export interface RecordFilters {
  date?: string;
  merchantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/** 今日统计 */
export interface TodayStats {
  total: number;
  signedIn: number;
  absent: number;
  unsigned: number;
  named: number; // 已点名 = 已到岗 + 缺勤
  rate: number;
}

/** 楼层常量 */
export const FLOORS = ['全部', '1F', '2F', '3F', '4F'] as const;
