// Cloudflare Pages Functions - catch-all route handler for /api/*
// Handles all API requests to D1 database (P0/P1/P2 全功能)

interface Env {
  DB: D1Database;
}

// ========== Helper: snake_case <-> camelCase ==========

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
function rowToCamel<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}
function rowsToCamel<T>(rows: unknown[]): T[] {
  return (rows as Record<string, unknown>[]).map((row) => rowToCamel<T>(row));
}
function objToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}

// ========== JSON Response Helpers ==========

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
function error(message: string, status = 400) {
  return json({ error: message }, status);
}

// ========== Audit Log Helper ==========

async function writeAudit(env: Env, entry: {
  action: string;
  module: string;
  targetType?: string;
  targetId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  operator?: string;
  request?: Request;
}) {
  const id = `al${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const ip = entry.request?.headers.get("cf-connecting-ip") || "";
  const ua = entry.request?.headers.get("user-agent") || "";
  await env.DB.prepare(
    `INSERT INTO audit_logs (id, user, operator, action, module, target_type, target_id, before_data, after_data, ip, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, "admin", entry.operator || "admin", entry.action, entry.module,
    entry.targetType || "", entry.targetId || "",
    entry.beforeData ? JSON.stringify(entry.beforeData) : "",
    entry.afterData ? JSON.stringify(entry.afterData) : "",
    ip, ua, new Date().toISOString()
  ).run();
}

// ========== Route Parser ==========

function parsePath(url: URL): string[] {
  const pathname = url.pathname;
  const apiPrefix = "/api";
  if (!pathname.startsWith(apiPrefix)) return [];
  const rest = pathname.slice(apiPrefix.length);
  if (rest.startsWith("/")) return rest.slice(1).split("/").filter(Boolean);
  return rest.split("/").filter(Boolean);
}

// ========== Main Handler ==========

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const segments = parsePath(url);
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const seg = segments[0] || "";

    // ================================================================
    // ===== Merchants =====
    // ================================================================
    if (seg === "merchants" && segments.length === 1) {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM merchants ORDER BY id").all();
        return json(rowsToCamel(results));
      }
      if (method === "POST") {
        const body = await request.json() as Record<string, unknown>;
        const id = (body.id as string) || `m${Date.now()}`;
        const snake = objToSnake(body);
        snake.id = id;
        if (snake.verified !== undefined) snake.verified = snake.verified ? 1 : 0;
        if (snake.signed_in !== undefined) snake.signed_in = snake.signed_in ? 1 : 0;
        if (snake.absent !== undefined) snake.absent = snake.absent ? 1 : 0;
        const cols = Object.keys(snake);
        const vals = Object.values(snake);
        const placeholders = vals.map(() => "?").join(", ");
        await env.DB.prepare(`INSERT INTO merchants (${cols.join(", ")}) VALUES (${placeholders})`).bind(...vals).run();
        const { results } = await env.DB.prepare("SELECT * FROM merchants WHERE id = ?").bind(id).all();
        await writeAudit(env, { action: "create", module: "merchant", targetType: "merchant", targetId: id, afterData: results[0], request });
        return json(rowToCamel(results[0] as Record<string, unknown>), 201);
      }
    }

    if (seg === "merchants" && segments.length === 2) {
      const merchantId = segments[1];
      if (method === "PUT") {
        const before = await env.DB.prepare("SELECT * FROM merchants WHERE id = ?").bind(merchantId).all();
        const body = await request.json() as Record<string, unknown>;
        const snake = objToSnake(body);
        if (snake.verified !== undefined) snake.verified = snake.verified ? 1 : 0;
        if (snake.signed_in !== undefined) snake.signed_in = snake.signed_in ? 1 : 0;
        if (snake.absent !== undefined) snake.absent = snake.absent ? 1 : 0;
        const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
        const vals = Object.values(snake);
        await env.DB.prepare(`UPDATE merchants SET ${setParts} WHERE id = ?`).bind(...vals, merchantId).run();
        await writeAudit(env, { action: "update", module: "merchant", targetType: "merchant", targetId: merchantId, beforeData: before.results[0], afterData: body, request });
        return json({ success: true });
      }
      if (method === "DELETE") {
        const before = await env.DB.prepare("SELECT * FROM merchants WHERE id = ?").bind(merchantId).all();
        await env.DB.prepare("DELETE FROM attendance_records WHERE merchant_id = ?").bind(merchantId).run();
        await env.DB.prepare("DELETE FROM merchants WHERE id = ?").bind(merchantId).run();
        await writeAudit(env, { action: "delete", module: "merchant", targetType: "merchant", targetId: merchantId, beforeData: before.results[0], request });
        return json({ success: true });
      }
    }

    // ================================================================
    // ===== Attendance Records =====
    // ================================================================
    if (seg === "records") {
      if (segments[1] === "batch-sign" && method === "POST") {
        const body = await request.json() as { ids: string[]; operator: string };
        const { ids, operator } = body;
        const now = new Date().toTimeString().slice(0, 5);
        for (const id of ids) {
          await env.DB.prepare(`UPDATE attendance_records SET status = 'signedIn', signed_at = ?, operator = ? WHERE id = ?`).bind(now, operator, id).run();
        }
        await writeAudit(env, { action: "batch_sign", module: "attendance", targetType: "record", targetId: ids.join(","), afterData: { count: ids.length, operator }, request });
        return json({ success: true });
      }

      if (segments[1] === "batch-update" && method === "POST") {
        // 批量修改商户（P0-2 批量改/删）
        const body = await request.json() as { ids: string[]; patch: Record<string, unknown>; action: "update" | "delete" };
        const { ids, patch, action } = body;
        if (action === "delete") {
          for (const id of ids) {
            await env.DB.prepare("DELETE FROM attendance_records WHERE merchant_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM merchants WHERE id = ?").bind(id).run();
          }
          await writeAudit(env, { action: "batch_delete", module: "merchant", afterData: { count: ids.length, ids }, request });
        } else {
          const snake = objToSnake(patch);
          if (snake.verified !== undefined) snake.verified = snake.verified ? 1 : 0;
          if (snake.signed_in !== undefined) snake.signed_in = snake.signed_in ? 1 : 0;
          if (snake.absent !== undefined) snake.absent = snake.absent ? 1 : 0;
          const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
          const vals = Object.values(snake);
          for (const id of ids) {
            await env.DB.prepare(`UPDATE merchants SET ${setParts} WHERE id = ?`).bind(...vals, id).run();
          }
          await writeAudit(env, { action: "batch_update", module: "merchant", afterData: { count: ids.length, patch }, request });
        }
        return json({ success: true, count: ids.length });
      }

      if (segments.length === 2 && method === "PUT") {
        const recordId = segments[1];
        const before = await env.DB.prepare("SELECT * FROM attendance_records WHERE id = ?").bind(recordId).all();
        const body = await request.json() as Record<string, unknown>;
        const snake = objToSnake(body);
        const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
        const vals = Object.values(snake);
        await env.DB.prepare(`UPDATE attendance_records SET ${setParts} WHERE id = ?`).bind(...vals, recordId).run();
        await writeAudit(env, { action: "update", module: "attendance", targetType: "record", targetId: recordId, beforeData: before.results[0], afterData: body, request });
        return json({ success: true });
      }

      if (segments.length === 1 && method === "GET") {
        const conditions: string[] = [];
        const params: unknown[] = [];
        const date = url.searchParams.get("date");
        if (date) { conditions.push("date = ?"); params.push(date); }
        const merchantId = url.searchParams.get("merchantId");
        if (merchantId) { conditions.push("merchant_id = ?"); params.push(merchantId); }
        const status = url.searchParams.get("status");
        if (status) { conditions.push("status = ?"); params.push(status); }
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        if (startDate && endDate) { conditions.push("date >= ? AND date <= ?"); params.push(startDate, endDate); }
        else if (startDate) { conditions.push("date >= ?"); params.push(startDate); }
        else if (endDate) { conditions.push("date <= ?"); params.push(endDate); }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const { results } = await env.DB.prepare(`SELECT * FROM attendance_records ${where} ORDER BY date DESC, id`).bind(...params).all();
        return json(rowsToCamel(results));
      }
    }

    // ================================================================
    // ===== Rules =====
    // ================================================================
    if (seg === "rules" && segments.length === 1) {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM roll_call_rules WHERE id = 1").all();
        if (results.length === 0) {
          return json({ dailyStartTime: "10:00", dailyEndTime: "11:00", absentThreshold: "11:00", remindBefore: 10, holidays: [], weeklyOff: [0], enableAutoAbsent: true });
        }
        const rule = rowToCamel(results[0] as Record<string, unknown>) as Record<string, unknown>;
        rule.holidays = JSON.parse((rule.holidays as string) || "[]");
        rule.weeklyOff = JSON.parse((rule.weeklyOff as string) || "[0]");
        rule.enableAutoAbsent = rule.enableAutoAbsent === 1;
        return json(rule);
      }
      if (method === "PUT") {
        const before = await env.DB.prepare("SELECT * FROM roll_call_rules WHERE id = 1").all();
        const body = await request.json() as Record<string, unknown>;
        const snake = objToSnake(body);
        if (snake.holidays !== undefined) snake.holidays = JSON.stringify(snake.holidays);
        if (snake.weekly_off !== undefined) snake.weekly_off = JSON.stringify(snake.weekly_off);
        if (snake.enable_auto_absent !== undefined) snake.enable_auto_absent = snake.enable_auto_absent ? 1 : 0;
        const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
        const vals = Object.values(snake);
        await env.DB.prepare(`UPDATE roll_call_rules SET ${setParts} WHERE id = 1`).bind(...vals).run();
        await writeAudit(env, { action: "update", module: "rule", targetType: "rule", targetId: "1", beforeData: before.results[0], afterData: body, request });
        return json({ success: true });
      }
    }

    // ================================================================
    // ===== P0-1: Backup & Restore =====
    // ================================================================
    if (seg === "backup" && segments.length === 1) {
      if (method === "GET") {
        const format = url.searchParams.get("format") || "json";
        const tables = ["merchants", "attendance_records", "roll_call_rules", "audit_logs", "floors", "areas", "categories", "exception_ledger", "alert_rules", "alert_records", "announcements", "system_config", "merchant_ratings", "import_logs"];
        const data: Record<string, unknown[]> = {};
        for (const t of tables) {
          try {
            const { results } = await env.DB.prepare(`SELECT * FROM ${t}`).all();
            data[t] = results;
          } catch { data[t] = []; }
        }
        if (format === "sql") {
          let sql = `-- 全量数据库备份 ${new Date().toISOString()}\n\n`;
          for (const [t, rows] of Object.entries(data)) {
            sql += `-- Table: ${t}\n`;
            for (const row of rows) {
              const cols = Object.keys(row as Record<string, unknown>);
              const vals = cols.map((c) => {
                const v = (row as Record<string, unknown>)[c];
                if (v === null) return "NULL";
                if (typeof v === "number") return String(v);
                return `'${String(v).replace(/'/g, "''")}'`;
              });
              sql += `INSERT INTO ${t} (${cols.join(",")}) VALUES (${vals.join(",")});\n`;
            }
            sql += "\n";
          }
          await writeAudit(env, { action: "backup", module: "backup", afterData: { format: "sql", tables: tables.length }, request });
          return new Response(sql, { headers: { "Content-Type": "text/sql", "Content-Disposition": `attachment; filename="backup-${Date.now()}.sql"`, "Access-Control-Allow-Origin": "*" } });
        }
        await writeAudit(env, { action: "backup", module: "backup", afterData: { format: "json", tables: tables.length }, request });
        return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="backup-${Date.now()}.json"`, "Access-Control-Allow-Origin": "*" } });
      }
      if (method === "POST") {
        // Restore from JSON
        const body = await request.json() as Record<string, unknown[]>;
        const tableOrder = ["merchants", "attendance_records", "roll_call_rules", "floors", "areas", "categories", "exception_ledger", "alert_rules", "alert_records", "announcements", "system_config", "merchant_ratings", "import_logs"];
        for (const t of tableOrder) {
          if (!body[t]) continue;
          await env.DB.prepare(`DELETE FROM ${t}`).run();
          for (const row of body[t]) {
            const r = row as Record<string, unknown>;
            const cols = Object.keys(r);
            const vals = Object.values(r);
            const placeholders = vals.map(() => "?").join(", ");
            await env.DB.prepare(`INSERT INTO ${t} (${cols.join(", ")}) VALUES (${placeholders})`).bind(...vals).run();
          }
        }
        await writeAudit(env, { action: "restore", module: "backup", afterData: { tables: tableOrder.length }, request });
        return json({ success: true, message: "数据还原完成" });
      }
    }

    // ================================================================
    // ===== P0-2: Bulk Import =====
    // ================================================================
    if (seg === "bulk-import" && method === "POST") {
      const body = await request.json() as { merchants: Record<string, unknown>[] };
      const items = body.merchants;
      let success = 0, fail = 0;
      const failReasons: string[] = [];
      const existingLocations = new Set<string>();
      const { results: existing } = await env.DB.prepare("SELECT location FROM merchants").all();
      for (const r of existing) existingLocations.add((r as Record<string, unknown>).location as string);

      for (const item of items) {
        try {
          const name = item.name as string;
          const location = item.location as string;
          if (!name || !location) { fail++; failReasons.push(`缺少必填字段: ${JSON.stringify({ name, location })}`); continue; }
          if (existingLocations.has(location)) { fail++; failReasons.push(`铺位号重复: ${location}`); continue; }
          const id = `m${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
          await env.DB.prepare(
            `INSERT INTO merchants (id, name, floor, location, category, emoji, manager, contact, area, open_hours, verified, avatar, signed_in, absent, signed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(id, name, item.floor || "1F", location, item.category || "其他", item.emoji || "🏪", item.manager || "", item.contact || "", Number(item.area) || 0, item.openHours || "", item.verified ? 1 : 0, "", 0, 0, "").run();
          existingLocations.add(location);
          success++;
        } catch (e) {
          fail++;
          failReasons.push(`导入失败: ${(item.name || "未知")} - ${e instanceof Error ? e.message : "error"}`);
        }
      }
      const logId = `il${Date.now()}`;
      await env.DB.prepare(
        `INSERT INTO import_logs (id, type, total, success_count, fail_count, fail_reasons, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(logId, "merchant", items.length, success, fail, JSON.stringify(failReasons), "admin", new Date().toISOString()).run();
      await writeAudit(env, { action: "bulk_import", module: "merchant", afterData: { total: items.length, success, fail }, request });
      return json({ success: true, successCount: success, failCount: fail, failReasons });
    }

    if (seg === "import-logs") {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 50").all();
        return json(rowsToCamel(results));
      }
    }

    // ================================================================
    // ===== P0-3: Audit Logs =====
    // ================================================================
    if (seg === "audit-logs") {
      if (method === "GET") {
        const conditions: string[] = [];
        const params: unknown[] = [];
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        if (startDate && endDate) { conditions.push("created_at >= ? AND created_at <= ?"); params.push(startDate, endDate + "T23:59:59"); }
        const user = url.searchParams.get("user");
        if (user) { conditions.push("user = ?"); params.push(user); }
        const mod = url.searchParams.get("module");
        if (mod) { conditions.push("module = ?"); params.push(mod); }
        const action = url.searchParams.get("action");
        if (action) { conditions.push("action = ?"); params.push(action); }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const page = Number(url.searchParams.get("page") || "1");
        const pageSize = Number(url.searchParams.get("pageSize") || "50");
        const offset = (page - 1) * pageSize;
        const { results } = await env.DB.prepare(
          `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).bind(...params, pageSize, offset).all();
        const countRes = await env.DB.prepare(`SELECT COUNT(*) as total FROM audit_logs ${where}`).bind(...params).all();
        const total = (countRes.results[0] as Record<string, unknown>)?.total || 0;
        return json({ list: rowsToCamel(results), total, page, pageSize });
      }
    }

    // ================================================================
    // ===== P1-1: Floors / Areas / Categories =====
    // ================================================================
    if (seg === "floors" || seg === "areas" || seg === "categories") {
      const tableName = seg;
      if (segments.length === 1) {
        if (method === "GET") {
          const { results } = await env.DB.prepare(`SELECT * FROM ${tableName} ORDER BY sort_order, id`).all();
          return json(rowsToCamel(results));
        }
        if (method === "POST") {
          const body = await request.json() as Record<string, unknown>;
          const id = (body.id as string) || `${tableName[0]}${Date.now()}`;
          const snake = objToSnake(body);
          snake.id = id;
          snake.created_at = new Date().toISOString();
          const cols = Object.keys(snake);
          const vals = Object.values(snake);
          await env.DB.prepare(`INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...vals).run();
          await writeAudit(env, { action: "create", module: tableName, targetType: tableName, targetId: id, afterData: body, request });
          return json({ success: true, id });
        }
      }
      if (segments.length === 2) {
        const id = segments[1];
        if (method === "PUT") {
          const body = await request.json() as Record<string, unknown>;
          const snake = objToSnake(body);
          const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
          const vals = Object.values(snake);
          await env.DB.prepare(`UPDATE ${tableName} SET ${setParts} WHERE id = ?`).bind(...vals, id).run();
          await writeAudit(env, { action: "update", module: tableName, targetType: tableName, targetId: id, afterData: body, request });
          return json({ success: true });
        }
        if (method === "DELETE") {
          await env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run();
          await writeAudit(env, { action: "delete", module: tableName, targetType: tableName, targetId: id, request });
          return json({ success: true });
        }
      }
    }

    // ================================================================
    // ===== P1-2: Exception Ledger =====
    // ================================================================
    if (seg === "exceptions") {
      if (segments[1] === "generate" && method === "POST") {
        // 自动生成前一日异常台账
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().slice(0, 10);
        const { results } = await env.DB.prepare(
          `SELECT * FROM attendance_records WHERE date = ? AND status IN ('absent', 'unsigned')`
        ).bind(dateStr).all();
        let count = 0;
        for (const r of results) {
          const row = r as Record<string, unknown>;
          const id = `el${Date.now()}${count}`;
          await env.DB.prepare(
            `INSERT OR IGNORE INTO exception_ledger (id, date, merchant_id, exception_type, status, remark, handler, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', '', '', ?, ?)`
          ).bind(id, dateStr, row.merchant_id, row.status, new Date().toISOString(), new Date().toISOString()).run();
          count++;
        }
        await writeAudit(env, { action: "generate_exceptions", module: "exception", afterData: { date: dateStr, count }, request });
        return json({ success: true, count, date: dateStr });
      }

      if (segments.length === 2 && method === "PUT") {
        const id = segments[1];
        const before = await env.DB.prepare("SELECT * FROM exception_ledger WHERE id = ?").bind(id).all();
        const body = await request.json() as Record<string, unknown>;
        const snake = objToSnake(body);
        snake.updated_at = new Date().toISOString();
        const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
        const vals = Object.values(snake);
        await env.DB.prepare(`UPDATE exception_ledger SET ${setParts} WHERE id = ?`).bind(...vals, id).run();
        await writeAudit(env, { action: "update", module: "exception", targetType: "exception", targetId: id, beforeData: before.results[0], afterData: body, request });
        return json({ success: true });
      }

      if (method === "GET") {
        const conditions: string[] = [];
        const params: unknown[] = [];
        const date = url.searchParams.get("date");
        if (date) { conditions.push("date = ?"); params.push(date); }
        const status = url.searchParams.get("status");
        if (status) { conditions.push("status = ?"); params.push(status); }
        const merchantId = url.searchParams.get("merchantId");
        if (merchantId) { conditions.push("merchant_id = ?"); params.push(merchantId); }
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        if (startDate && endDate) { conditions.push("date >= ? AND date <= ?"); params.push(startDate, endDate); }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const { results } = await env.DB.prepare(
          `SELECT e.*, m.name as merchant_name, m.floor, m.location FROM exception_ledger e LEFT JOIN merchants m ON e.merchant_id = m.id ${where} ORDER BY e.date DESC, e.created_at DESC`
        ).bind(...params).all();
        return json(rowsToCamel(results));
      }
    }

    // ================================================================
    // ===== P2-5: Alert Rules & Records =====
    // ================================================================
    if (seg === "alert-rules") {
      if (segments.length === 1) {
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM alert_rules ORDER BY created_at DESC").all();
          return json(rowsToCamel(results));
        }
        if (method === "POST") {
          const body = await request.json() as Record<string, unknown>;
          const id = `ar${Date.now()}`;
          const snake = objToSnake(body);
          snake.id = id;
          snake.created_at = new Date().toISOString();
          if (snake.enabled !== undefined) snake.enabled = snake.enabled ? 1 : 0;
          const cols = Object.keys(snake);
          const vals = Object.values(snake);
          await env.DB.prepare(`INSERT INTO alert_rules (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...vals).run();
          await writeAudit(env, { action: "create", module: "alert_rule", targetType: "alert_rule", targetId: id, afterData: body, request });
          return json({ success: true, id });
        }
      }
      if (segments.length === 2) {
        const id = segments[1];
        if (method === "PUT") {
          const body = await request.json() as Record<string, unknown>;
          const snake = objToSnake(body);
          if (snake.enabled !== undefined) snake.enabled = snake.enabled ? 1 : 0;
          const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
          const vals = Object.values(snake);
          await env.DB.prepare(`UPDATE alert_rules SET ${setParts} WHERE id = ?`).bind(...vals, id).run();
          await writeAudit(env, { action: "update", module: "alert_rule", targetType: "alert_rule", targetId: id, afterData: body, request });
          return json({ success: true });
        }
        if (method === "DELETE") {
          await env.DB.prepare("DELETE FROM alert_rules WHERE id = ?").bind(id).run();
          await writeAudit(env, { action: "delete", module: "alert_rule", targetType: "alert_rule", targetId: id, request });
          return json({ success: true });
        }
      }
    }

    if (seg === "alert-records" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT a.*, r.name as rule_name FROM alert_records a LEFT JOIN alert_rules r ON a.rule_id = r.id ORDER BY a.created_at DESC LIMIT 100").all();
      return json(rowsToCamel(results));
    }

    // ================================================================
    // ===== P2-6: Announcements =====
    // ================================================================
    if (seg === "announcements") {
      if (segments[1] === "read" && segments.length === 3 && method === "POST") {
        const annId = segments[1] === "read" ? segments[2] : segments[1];
        const body = await request.json() as { userId: string };
        const id = `ar${Date.now()}`;
        await env.DB.prepare("INSERT INTO announcement_reads (id, announcement_id, user_id, read_at) VALUES (?, ?, ?, ?)").bind(id, annId, body.userId, new Date().toISOString()).run();
        return json({ success: true });
      }
      if (segments.length === 1) {
        if (method === "GET") {
          const { results } = await env.DB.prepare("SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC").all();
          return json(rowsToCamel(results));
        }
        if (method === "POST") {
          const body = await request.json() as Record<string, unknown>;
          const id = `an${Date.now()}`;
          const snake = objToSnake(body);
          snake.id = id;
          snake.created_at = new Date().toISOString();
          if (snake.pinned !== undefined) snake.pinned = snake.pinned ? 1 : 0;
          if (snake.force_popup !== undefined) snake.force_popup = snake.force_popup ? 1 : 0;
          if (snake.scope !== undefined) snake.scope = JSON.stringify(snake.scope);
          const cols = Object.keys(snake);
          const vals = Object.values(snake);
          await env.DB.prepare(`INSERT INTO announcements (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...vals).run();
          await writeAudit(env, { action: "create", module: "announcement", targetType: "announcement", targetId: id, afterData: body, request });
          return json({ success: true, id });
        }
      }
      if (segments.length === 2) {
        const id = segments[1];
        if (method === "PUT") {
          const body = await request.json() as Record<string, unknown>;
          const snake = objToSnake(body);
          if (snake.pinned !== undefined) snake.pinned = snake.pinned ? 1 : 0;
          if (snake.force_popup !== undefined) snake.force_popup = snake.force_popup ? 1 : 0;
          if (snake.scope !== undefined) snake.scope = JSON.stringify(snake.scope);
          const setParts = Object.keys(snake).map((k) => `${k} = ?`).join(", ");
          const vals = Object.values(snake);
          await env.DB.prepare(`UPDATE announcements SET ${setParts} WHERE id = ?`).bind(...vals, id).run();
          await writeAudit(env, { action: "update", module: "announcement", targetType: "announcement", targetId: id, afterData: body, request });
          return json({ success: true });
        }
        if (method === "DELETE") {
          await env.DB.prepare("DELETE FROM announcements WHERE id = ?").bind(id).run();
          await env.DB.prepare("DELETE FROM announcement_reads WHERE announcement_id = ?").bind(id).run();
          await writeAudit(env, { action: "delete", module: "announcement", targetType: "announcement", targetId: id, request });
          return json({ success: true });
        }
      }
    }

    // ================================================================
    // ===== P2-7: System Config =====
    // ================================================================
    if (seg === "system-config" && segments.length === 1) {
      if (method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM system_config").all();
        const config: Record<string, string> = {};
        for (const r of results) {
          const row = r as Record<string, unknown>;
          config[row.key as string] = row.value as string;
        }
        return json(config);
      }
      if (method === "PUT") {
        const body = await request.json() as Record<string, string>;
        const before = await env.DB.prepare("SELECT * FROM system_config").all();
        for (const [key, value] of Object.entries(body)) {
          await env.DB.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)").bind(key, value, new Date().toISOString()).run();
        }
        await writeAudit(env, { action: "update", module: "system_config", beforeData: before.results, afterData: body, request });
        return json({ success: true });
      }
    }

    // ================================================================
    // ===== P2-3: Merchant Ratings =====
    // ================================================================
    if (seg === "ratings" && method === "GET") {
      const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
      const { results: merchants } = await env.DB.prepare("SELECT * FROM merchants ORDER BY id").all();
      const { results: records } = await env.DB.prepare("SELECT * FROM attendance_records WHERE date LIKE ?").bind(`${month}%`).all();

      const ratings = merchants.map((m) => {
        const merchant = m as Record<string, unknown>;
        const mRecords = records.filter((r) => (r as Record<string, unknown>).merchant_id === merchant.id);
        const total = mRecords.length;
        const present = mRecords.filter((r) => (r as Record<string, unknown>).status === "signedIn").length;
        const absent = mRecords.filter((r) => (r as Record<string, unknown>).status === "absent").length;
        const rate = total > 0 ? (present / total) * 100 : 0;
        const score = rate * 0.7 + (absent === 0 ? 30 : Math.max(0, 30 - absent * 5));
        let level = "qualified";
        if (score >= 90) level = "excellent";
        else if (score >= 75) level = "qualified";
        else if (score >= 60) level = "warning";
        else level = "watchlist";
        return {
          merchantId: merchant.id,
          merchantName: merchant.name,
          floor: merchant.floor,
          location: merchant.location,
          category: merchant.category,
          month,
          score: Math.round(score * 10) / 10,
          level,
          attendanceRate: Math.round(rate * 10) / 10,
          absentCount: absent,
          presentCount: present,
          totalDays: total,
        };
      }).sort((a, b) => b.score - a.score);

      return json(ratings);
    }

    return error("Not Found", 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal Server Error";
    return json({ error: message }, 500);
  }
};
