// 独立脚本：创建 P0/P1/P2 新增功能的数据库表
// 直接用 fetch 调 Cloudflare D1 HTTP API

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const DB_ID = process.env.CLOUDFLARE_D1_DB_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;
const TOKEN = API_TOKEN;

async function query(sql: string) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });
  return res.json();
}

async function main() {
  console.log("=== 创建 P0/P1/P2 新表 ===");

  const tables = [
    // P0-3: 审计日志（永久归档，不可删除）
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user TEXT NOT NULL DEFAULT 'admin',
      operator TEXT NOT NULL DEFAULT 'admin',
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      target_type TEXT DEFAULT '',
      target_id TEXT DEFAULT '',
      before_data TEXT DEFAULT '',
      after_data TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`,

    // P1-1: 楼层管理
    `CREATE TABLE IF NOT EXISTS floors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    )`,

    // P1-1: 区域管理
    `CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      floor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    )`,

    // P1-1: 业态分类管理
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    )`,

    // P1-2: 考勤异常整改台账
    `CREATE TABLE IF NOT EXISTS exception_ledger (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      exception_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      remark TEXT DEFAULT '',
      handler TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // P2-5: 智能预警规则
    `CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      threshold INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    )`,

    // P2-5: 预警记录
    `CREATE TABLE IF NOT EXISTS alert_records (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    )`,

    // P2-6: 公告管理
    `CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'global',
      scope TEXT DEFAULT '[]',
      pinned INTEGER DEFAULT 0,
      force_popup INTEGER DEFAULT 0,
      expire_at TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`,

    // P2-6: 公告已读记录
    `CREATE TABLE IF NOT EXISTS announcement_reads (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT NOT NULL
    )`,

    // P2-7: 系统配置
    `CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    )`,

    // P2-3: 商户考核评级
    `CREATE TABLE IF NOT EXISTS merchant_ratings (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      month TEXT NOT NULL,
      score REAL DEFAULT 0,
      level TEXT DEFAULT 'qualified',
      attendance_rate REAL DEFAULT 0,
      absent_count INTEGER DEFAULT 0,
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    )`,

    // P0-2: 批量导入日志
    `CREATE TABLE IF NOT EXISTS import_logs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      total INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      fail_reasons TEXT DEFAULT '[]',
      operator TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL
    )`,
  ];

  for (const sql of tables) {
    const r = await query(sql);
    console.log(r.success ? `  OK: ${sql.match(/CREATE TABLE.*?(\w+)/)?.[1]}` : `  FAIL: ${JSON.stringify(r.errors)}`);
  }

  // 索引
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module)",
    "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user)",
    "CREATE INDEX IF NOT EXISTS idx_exception_date ON exception_ledger(date)",
    "CREATE INDEX IF NOT EXISTS idx_exception_status ON exception_ledger(status)",
    "CREATE INDEX IF NOT EXISTS idx_exception_merchant ON exception_ledger(merchant_id)",
    "CREATE INDEX IF NOT EXISTS idx_alert_rule ON alert_records(rule_id)",
    "CREATE INDEX IF NOT EXISTS idx_announce_expire ON announcements(expire_at)",
    "CREATE INDEX IF NOT EXISTS idx_rating_merchant ON merchant_ratings(merchant_id)",
    "CREATE INDEX IF NOT EXISTS idx_rating_month ON merchant_ratings(month)",
  ];
  for (const sql of indexes) {
    await query(sql);
  }
  console.log("  indexes: OK");

  // 插入默认楼层
  console.log("\n=== 插入默认楼层/业态 ===");
  const floors = [
    ["f1", "1F", 1],
    ["f2", "2F", 2],
    ["f3", "3F", 3],
    ["f4", "4F", 4],
  ];
  for (const [id, name, sort] of floors) {
    await query(`INSERT OR REPLACE INTO floors (id, name, sort_order, status, created_at) VALUES ('${id}', '${name}', ${sort}, 'active', datetime('now'))`);
  }

  // 插入默认业态
  const cats = [
    ["c1", "餐饮", 1],
    ["c2", "零售", 2],
    ["c3", "配套服务", 3],
    ["c4", "其他", 4],
  ];
  for (const [id, name, sort] of cats) {
    await query(`INSERT OR REPLACE INTO categories (id, name, sort_order, status, created_at) VALUES ('${id}', '${name}', ${sort}, 'active', datetime('now'))`);
  }
  console.log("  默认数据: OK");

  // 插入默认系统配置
  const configs = [
    ["mall_name", "名创广场"],
    ["logo_url", ""],
    ["report_header", "商场考勤管理报表"],
    ["export_watermark", "内部资料 请勿外传"],
    ["email_notification", "0"],
    ["theme_color", "#16a34a"],
  ];
  for (const [key, value] of configs) {
    await query(`INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('${key}', '${value}', datetime('now'))`);
  }
  console.log("  系统配置: OK");

  // 插入默认预警规则
  const alerts = [
    ["ar1", "单日缺勤商户超5家", "daily_absent_count", 5, 1],
    ["ar2", "单商户月度缺勤3次", "merchant_monthly_absent", 3, 1],
  ];
  for (const [id, name, type, threshold, enabled] of alerts) {
    await query(`INSERT OR REPLACE INTO alert_rules (id, name, condition_type, threshold, enabled, created_at) VALUES ('${id}', '${name}', '${type}', ${threshold}, ${enabled}, datetime('now'))`);
  }
  console.log("  预警规则: OK");

  console.log("\n=== 完成！所有新表已创建 ===");
}

main().catch(console.error);
