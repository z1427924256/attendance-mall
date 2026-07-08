-- ===== 商场考勤管理系统 D1 数据库 Schema（Vue3 重构版） =====
-- 重新设计：统一命名规范、添加索引、优化字段类型

-- 商户表
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  floor TEXT NOT NULL DEFAULT '1F',
  location TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🏪',
  manager TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  area INTEGER NOT NULL DEFAULT 0,
  open_hours TEXT NOT NULL DEFAULT '10:00-22:00',
  verified INTEGER NOT NULL DEFAULT 0,
  avatar TEXT NOT NULL DEFAULT '',
  signed_in INTEGER NOT NULL DEFAULT 0,
  absent INTEGER NOT NULL DEFAULT 0,
  signed_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_merchants_floor ON merchants(floor);
CREATE INDEX IF NOT EXISTS idx_merchants_category ON merchants(category);

-- 考勤记录表
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unsigned',
  signed_at TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_records_merchant ON attendance_records(merchant_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON attendance_records(status);

-- 点名规则表（单行 id=1）
CREATE TABLE IF NOT EXISTS roll_call_rules (
  id INTEGER PRIMARY KEY DEFAULT 1,
  daily_start_time TEXT NOT NULL DEFAULT '10:00',
  daily_end_time TEXT NOT NULL DEFAULT '11:00',
  absent_threshold TEXT NOT NULL DEFAULT '11:30',
  remind_before INTEGER NOT NULL DEFAULT 10,
  holidays TEXT NOT NULL DEFAULT '[]',
  weekly_off TEXT NOT NULL DEFAULT '[0,6]',
  enable_auto_absent INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO roll_call_rules (id) VALUES (1);

-- 审计日志表（永久归档）
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL DEFAULT 'admin',
  operator TEXT NOT NULL DEFAULT 'admin',
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  before_data TEXT NOT NULL DEFAULT '',
  after_data TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user);

-- 楼层表
CREATE TABLE IF NOT EXISTS floors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 区域表
CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  floor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_areas_floor ON areas(floor_id);

-- 业态分类表
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 考勤异常整改台账
CREATE TABLE IF NOT EXISTS exception_ledger (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  exception_type TEXT NOT NULL DEFAULT 'unsigned',
  status TEXT NOT NULL DEFAULT 'pending',
  remark TEXT NOT NULL DEFAULT '',
  handler TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exception_date ON exception_ledger(date);
CREATE INDEX IF NOT EXISTS idx_exception_status ON exception_ledger(status);
CREATE INDEX IF NOT EXISTS idx_exception_merchant ON exception_ledger(merchant_id);

-- 预警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  threshold INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 预警记录表
CREATE TABLE IF NOT EXISTS alert_records (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alert_rule ON alert_records(rule_id);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'global',
  scope TEXT NOT NULL DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  force_popup INTEGER NOT NULL DEFAULT 0,
  expire_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_announce_expire ON announcements(expire_at);

-- 公告已读记录表
CREATE TABLE IF NOT EXISTS announcement_reads (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 系统配置表（key-value）
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 商户评级表
CREATE TABLE IF NOT EXISTS merchant_ratings (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  month TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'qualified',
  attendance_rate REAL NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  present_count INTEGER NOT NULL DEFAULT 0,
  total_days INTEGER NOT NULL DEFAULT 0,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rating_merchant ON merchant_ratings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_rating_month ON merchant_ratings(month);

-- 批量导入日志表
CREATE TABLE IF NOT EXISTS import_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  fail_reasons TEXT NOT NULL DEFAULT '[]',
  operator TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== 默认数据 =====
INSERT OR IGNORE INTO floors (id, name, sort_order, status) VALUES
  ('f1', '1F', 1, 'active'),
  ('f2', '2F', 2, 'active'),
  ('f3', '3F', 3, 'active'),
  ('f4', '4F', 4, 'active');

INSERT OR IGNORE INTO categories (id, name, sort_order, status) VALUES
  ('c1', '餐饮', 1, 'active'),
  ('c2', '零售', 2, 'active'),
  ('c3', '配套服务', 3, 'active'),
  ('c4', '其他', 4, 'active');

INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('mallName', '名创广场'),
  ('logoUrl', ''),
  ('reportHeader', '商场考勤管理报表'),
  ('exportWatermark', '内部资料 请勿外传'),
  ('emailNotification', '0'),
  ('themeColor', '#165DFF');

INSERT OR IGNORE INTO alert_rules (id, name, condition_type, threshold, enabled) VALUES
  ('ar1', '单日缺勤商户超5家', 'daily_absent_count', 5, 1),
  ('ar2', '单商户月度缺勤3次', 'merchant_monthly_absent', 3, 1);
