// 商场考勤管理系统 - Cloudflare Pages Functions 后端（Vue3 重构版）
// 统一 catch-all 路由，操作 D1 数据库
// 接口契约与前端 src/api/client.ts 保持一致

interface Env {
  DB: D1Database;
  // 七牛云对象存储配置（环境变量）
  QINIU_ACCESS_KEY?: string;
  QINIU_SECRET_KEY?: string;
  QINIU_BUCKET?: string;
  QINIU_DOMAIN?: string; // 形如 https://cdn.example.com，末尾不带 /
}

interface RequestContext {
  request: Request;
  env: Env;
  params: { path?: string[] };
}

// ===== 工具函数 =====
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });

const err = (message: string, status = 400) => json({ error: message }, status);

// snake_case → camelCase
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// 对象 key 转 camelCase
const camelize = (obj: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!obj) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[toCamel(k)] = v;
  return out;
};

// camelCase → snake_case
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

// 七牛直链 → 代理 URL（解决七牛源站 HTTPS 不支持问题）
// 旧数据存的是 https://cdn.0080.cc.cd/avatars/xxx.jpg → 转成 /api/qiniu/image/avatars/xxx.jpg
function rewriteQiniuUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/api/qiniu/image/')) return url;
  if (/^https?:\/\//.test(url)) {
    try {
      const u = new URL(url);
      const key = u.pathname.slice(1);
      if (key) return `/api/qiniu/image/${key}`;
    } catch { /* 非法 URL，原样返回 */ }
  }
  return url;
}

// 商户字段映射（DB int → 前端 boolean）
function mapMerchant(r: Record<string, unknown>) {
  const c = camelize(r);
  if (!c) return c;
  c.verified = !!c.verified;
  c.signedIn = !!c.signedIn;
  c.absent = !!c.absent;
  if (c.avatar) c.avatar = rewriteQiniuUrl(c.avatar as string);
  return c;
}

// 记录字段映射
function mapRecord(r: Record<string, unknown>) {
  return camelize(r);
}

// 生成 UUID
const uuid = () => crypto.randomUUID();

// 写审计日志
async function writeAudit(
  db: D1Database,
  module: string,
  action: string,
  targetId: string,
  before: unknown,
  after: unknown,
  req: Request
) {
  const id = uuid();
  const ip = req.headers.get('cf-connecting-ip') || '';
  const ua = req.headers.get('user-agent') || '';
  await db
    .prepare(
      `INSERT INTO audit_logs (id, user, operator, action, module, target_type, target_id, before_data, after_data, ip, user_agent, created_at)
       VALUES (?, 'admin', 'admin', ?, ?, '', ?, ?, ?, ?, ?, datetime('now'))`
    )
    .bind(
      id,
      action,
      module,
      targetId,
      before ? JSON.stringify(before) : '',
      after ? JSON.stringify(after) : '',
      ip,
      ua
    )
    .run();
}

// ===== 路由分发 =====
export async function onRequest(context: RequestContext) {
  const { request, env, params } = context;
  const method = request.method;
  const path = params.path || [];
  const url = new URL(request.url);
  const pathStr = path.join('/');

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // ===== Merchants =====
    if (pathStr === 'merchants' && method === 'GET') {
      const rs = await env.DB.prepare('SELECT * FROM merchants ORDER BY floor, location').all();
      return json(rs.results.map(mapMerchant));
    }
    if (pathStr === 'merchants' && method === 'POST') {
      const body = await request.json();
      const id = body.id || uuid();
      const after = {
        ...body,
        id,
        verified: body.verified ? 1 : 0,
        signedIn: body.signedIn ? 1 : 0,
        absent: body.absent ? 1 : 0,
      };
      await env.DB.prepare(
        `INSERT INTO merchants (id, name, floor, location, verified, avatar, signed_in, absent, signed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(id, body.name, body.floor, body.location, body.verified ? 1 : 0, body.avatar || '', body.signedIn ? 1 : 0, body.absent ? 1 : 0, body.signedAt || '')
        .run();
      await writeAudit(env.DB, 'merchants', 'create', id, null, after, request);
      return json(mapMerchant(after) ?? after, 201);
    }
    if (pathStr.match(/^merchants\/[\w-]+$/) && method === 'PUT') {
      const id = path[1];
      const before = await env.DB.prepare('SELECT * FROM merchants WHERE id = ?').bind(id).first();
      if (!before) return err('商户不存在', 404);
      const body = await request.json();
      const fields: string[] = [];
      const values: unknown[] = [];
      const map: Record<string, string> = {
        name: 'name', floor: 'floor', location: 'location',
        avatar: 'avatar', signedAt: 'signed_at',
      };
      for (const [k, col] of Object.entries(map)) {
        if (k in body) { fields.push(`${col} = ?`); values.push(body[k]); }
      }
      if ('verified' in body) { fields.push('verified = ?'); values.push(body.verified ? 1 : 0); }
      if ('signedIn' in body) { fields.push('signed_in = ?'); values.push(body.signedIn ? 1 : 0); }
      if ('absent' in body) { fields.push('absent = ?'); values.push(body.absent ? 1 : 0); }
      if (!fields.length) return json({ success: true });
      values.push(id);
      await env.DB.prepare(`UPDATE merchants SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      const after = await env.DB.prepare('SELECT * FROM merchants WHERE id = ?').bind(id).first();
      await writeAudit(env.DB, 'merchants', 'update', id, before, after, request);
      return json({ success: true });
    }
    if (pathStr.match(/^merchants\/[\w-]+$/) && method === 'DELETE') {
      const id = path[1];
      const before = await env.DB.prepare('SELECT * FROM merchants WHERE id = ?').bind(id).first();
      await env.DB.prepare('DELETE FROM merchants WHERE id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM attendance_records WHERE merchant_id = ?').bind(id).run();
      await writeAudit(env.DB, 'merchants', 'delete', id, before, null, request);
      return json({ success: true });
    }

    // ===== Records =====
    if (pathStr === 'records' && method === 'GET') {
      const { date, merchantId, status, startDate, endDate } = Object.fromEntries(url.searchParams);
      let sql = 'SELECT * FROM attendance_records WHERE 1=1';
      const args: string[] = [];
      if (date) { sql += ' AND date = ?'; args.push(date); }
      if (merchantId) { sql += ' AND merchant_id = ?'; args.push(merchantId); }
      if (status) { sql += ' AND status = ?'; args.push(status); }
      if (startDate) { sql += ' AND date >= ?'; args.push(startDate); }
      if (endDate) { sql += ' AND date <= ?'; args.push(endDate); }
      sql += ' ORDER BY date DESC, id';
      const rs = await env.DB.prepare(sql).bind(...args).all();
      return json(rs.results.map(mapRecord));
    }
    if (pathStr.match(/^records\/[\w-]+$/) && method === 'PUT') {
      const id = path[1];
      const before = await env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?').bind(id).first();
      if (!before) return err('记录不存在', 404);
      const body = await request.json();
      const fields: string[] = [];
      const values: unknown[] = [];
      const map: Record<string, string> = { status: 'status', signedAt: 'signed_at', operator: 'operator', remark: 'remark' };
      for (const [k, col] of Object.entries(map)) {
        if (k in body) { fields.push(`${col} = ?`); values.push(body[k]); }
      }
      if (!fields.length) return json({ success: true });
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await env.DB.prepare(`UPDATE attendance_records SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      const after = await env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?').bind(id).first();
      await writeAudit(env.DB, 'records', 'update', id, before, after, request);
      return json({ success: true });
    }
    if (pathStr === 'records/batch-sign' && method === 'POST') {
      const body = await request.json();
      const { ids, operator } = body;
      if (!Array.isArray(ids) || !ids.length) return err('ids 不能为空');
      const now = new Date();
      const signedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const placeholders = ids.map(() => '?').join(',');
      await env.DB.prepare(
        `UPDATE attendance_records SET status = 'signedIn', signed_at = ?, operator = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
      )
        .bind(signedAt, operator || 'admin', ...ids)
        .run();
      await writeAudit(env.DB, 'records', 'batch-sign', ids.join(','), null, { ids, signedAt }, request);
      return json({ success: true });
    }
    if (pathStr === 'records/batch-update' && method === 'POST') {
      // 批量修改/删除商户
      const body = await request.json();
      const { ids, patch, action } = body;
      if (!Array.isArray(ids) || !ids.length) return err('ids 不能为空');
      const placeholders = ids.map(() => '?').join(',');
      if (action === 'delete') {
        await env.DB.prepare(`DELETE FROM merchants WHERE id IN (${placeholders})`).bind(...ids).run();
        await env.DB.prepare(`DELETE FROM attendance_records WHERE merchant_id IN (${placeholders})`).bind(...ids).run();
      } else if (action === 'update') {
        // patch 是要更新的字段对象
        const fields: string[] = [];
        const values: unknown[] = [];
        for (const [k, v] of Object.entries(patch)) {
          const col = toSnake(k);
          if (['verified', 'signed_in', 'absent'].includes(col)) {
            fields.push(`${col} = ?`); values.push(v ? 1 : 0);
          } else if (['name', 'floor', 'location', 'avatar', 'signed_at'].includes(col)) {
            fields.push(`${col} = ?`); values.push(v);
          }
        }
        if (fields.length) {
          values.push(...ids);
          await env.DB.prepare(`UPDATE merchants SET ${fields.join(', ')} WHERE id IN (${placeholders})`).bind(...values).run();
        }
      }
      await writeAudit(env.DB, 'merchants', 'batch-update', ids.join(','), null, { ids, action }, request);
      return json({ success: true, count: ids.length });
    }

    // ===== Rules =====
    if (pathStr === 'rules' && method === 'GET') {
      const r = await env.DB.prepare('SELECT * FROM roll_call_rules WHERE id = 1').first();
      if (!r) return json({});
      const c = camelize(r) || {};
      c.holidays = JSON.parse((c.holidays as string) || '[]');
      c.weeklyOff = JSON.parse((c.weeklyOff as string) || '[]');
      c.enableAutoAbsent = !!c.enableAutoAbsent;
      return json(c);
    }
    if (pathStr === 'rules' && method === 'PUT') {
      const body = await request.json();
      const before = await env.DB.prepare('SELECT * FROM roll_call_rules WHERE id = 1').first();
      const holidays = JSON.stringify(body.holidays ?? []);
      const weeklyOff = JSON.stringify(body.weeklyOff ?? [0, 6]);
      await env.DB.prepare(
        `UPDATE roll_call_rules SET daily_start_time = ?, daily_end_time = ?, absent_threshold = ?, remind_before = ?, holidays = ?, weekly_off = ?, enable_auto_absent = ?, updated_at = datetime('now') WHERE id = 1`
      )
        .bind(body.dailyStartTime, body.dailyEndTime, body.absentThreshold, body.remindBefore, holidays, weeklyOff, body.enableAutoAbsent ? 1 : 0)
        .run();
      await writeAudit(env.DB, 'rules', 'update', '1', before, body, request);
      return json({ success: true });
    }

    // ===== System Config =====
    if (pathStr === 'system-config' && method === 'GET') {
      const rs = await env.DB.prepare('SELECT key, value FROM system_config').all();
      const out: Record<string, string> = {};
      for (const r of rs.results) {
        const k = toCamel(r.key as string);
        let v = r.value as string;
        // 图片 URL 统一转代理（旧数据可能是七牛直链，HTTPS 下加载失败）
        if (k === 'homeBgUrl' || k === 'logoUrl') v = rewriteQiniuUrl(v);
        out[k] = v;
      }
      return json(out);
    }
    if (pathStr === 'system-config' && method === 'PUT') {
      const body = await request.json();
      for (const [k, v] of Object.entries(body)) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))`
        )
          .bind(toSnake(k), String(v))
          .run();
      }
      await writeAudit(env.DB, 'system-config', 'update', 'all', null, body, request);
      return json({ success: true });
    }

    // ===== Announcements =====
    if (pathStr === 'announcements' && method === 'GET') {
      const rs = await env.DB.prepare('SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC').all();
      return json(rs.results.map((r) => {
        const c = camelize(r) || {};
        c.pinned = !!c.pinned;
        c.forcePopup = !!c.forcePopup;
        try { c.scope = JSON.parse((c.scope as string) || '[]'); } catch { /* keep */ }
        return c;
      }));
    }
    if (pathStr === 'announcements' && method === 'POST') {
      const body = await request.json();
      const id = body.id || uuid();
      await env.DB.prepare(
        `INSERT INTO announcements (id, title, content, type, scope, pinned, force_popup, expire_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(id, body.title, body.content, body.type || 'global', JSON.stringify(body.scope || []), body.pinned ? 1 : 0, body.forcePopup ? 1 : 0, body.expireAt || '')
        .run();
      await writeAudit(env.DB, 'announcements', 'create', id, null, body, request);
      return json({ success: true, id });
    }
    if (pathStr.match(/^announcements\/[\w-]+$/) && method === 'PUT') {
      const id = path[1];
      const before = await env.DB.prepare('SELECT * FROM announcements WHERE id = ?').bind(id).first();
      const body = await request.json();
      await env.DB.prepare(
        `UPDATE announcements SET title = ?, content = ?, type = ?, scope = ?, pinned = ?, force_popup = ?, expire_at = ? WHERE id = ?`
      )
        .bind(body.title, body.content, body.type || 'global', JSON.stringify(body.scope || []), body.pinned ? 1 : 0, body.forcePopup ? 1 : 0, body.expireAt || '', id)
        .run();
      await writeAudit(env.DB, 'announcements', 'update', id, before, body, request);
      return json({ success: true });
    }
    if (pathStr.match(/^announcements\/[\w-]+$/) && method === 'DELETE') {
      const id = path[1];
      await env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM announcement_reads WHERE announcement_id = ?').bind(id).run();
      await writeAudit(env.DB, 'announcements', 'delete', id, null, null, request);
      return json({ success: true });
    }
    if (pathStr.match(/^announcements\/read\/[\w-]+$/) && method === 'POST') {
      const aid = path[2];
      const rid = uuid();
      await env.DB.prepare(
        `INSERT OR IGNORE INTO announcement_reads (id, announcement_id, user_id, read_at) VALUES (?, ?, 'admin', datetime('now'))`
      ).bind(rid, aid).run();
      return json({ success: true });
    }

    // ===== Floors / Areas（通用 CRUD，已移除 categories） =====
    for (const table of ['floors', 'areas']) {
      const singular = table.replace(/s$/, '');
      if (pathStr === table && method === 'GET') {
        const rs = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY sort_order, id`).all();
        return json(rs.results.map((r) => camelize(r)));
      }
      if (pathStr === table && method === 'POST') {
        const body = await request.json();
        const id = body.id || uuid();
        if (table === 'areas') {
          await env.DB.prepare(
            `INSERT INTO areas (id, floor_id, name, sort_order, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
          ).bind(id, body.floorId || '', body.name, body.sortOrder ?? 0, body.status || 'active').run();
        } else {
          await env.DB.prepare(
            `INSERT INTO ${table} (id, name, sort_order, status, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
          ).bind(id, body.name, body.sortOrder ?? 0, body.status || 'active').run();
        }
        await writeAudit(env.DB, table, 'create', id, null, body, request);
        return json({ success: true, id });
      }
      if (pathStr.match(new RegExp(`^${table}/[\\w-]+$`)) && method === 'PUT') {
        const id = path[1];
        const before = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
        const body = await request.json();
        if (table === 'areas') {
          await env.DB.prepare(`UPDATE areas SET floor_id = ?, name = ?, sort_order = ?, status = ? WHERE id = ?`)
            .bind(body.floorId || '', body.name, body.sortOrder ?? 0, body.status || 'active', id).run();
        } else {
          await env.DB.prepare(`UPDATE ${table} SET name = ?, sort_order = ?, status = ? WHERE id = ?`)
            .bind(body.name, body.sortOrder ?? 0, body.status || 'active', id).run();
        }
        await writeAudit(env.DB, table, 'update', id, before, body, request);
        return json({ success: true });
      }
      if (pathStr.match(new RegExp(`^${table}/[\\w-]+$`)) && method === 'DELETE') {
        const id = path[1];
        await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
        await writeAudit(env.DB, table, 'delete', id, null, null, request);
        return json({ success: true });
      }
    }

    // ===== Exceptions =====
    if (pathStr === 'exceptions' && method === 'GET') {
      const { date, status, merchantId, startDate, endDate, exceptionType } = Object.fromEntries(url.searchParams);
      let sql = `SELECT e.*, m.name AS merchant_name, m.floor, m.location
                 FROM exception_ledger e LEFT JOIN merchants m ON e.merchant_id = m.id WHERE 1=1`;
      const args: string[] = [];
      if (date) { sql += ' AND e.date = ?'; args.push(date); }
      if (status) { sql += ' AND e.status = ?'; args.push(status); }
      if (merchantId) { sql += ' AND e.merchant_id = ?'; args.push(merchantId); }
      if (exceptionType) { sql += ' AND e.exception_type = ?'; args.push(exceptionType); }
      if (startDate) { sql += ' AND e.date >= ?'; args.push(startDate); }
      if (endDate) { sql += ' AND e.date <= ?'; args.push(endDate); }
      sql += ' ORDER BY e.date DESC, e.created_at DESC';
      const rs = await env.DB.prepare(sql).bind(...args).all();
      return json(rs.results.map((r) => camelize(r)));
    }
    if (pathStr.match(/^exceptions\/[\w-]+$/) && method === 'PUT') {
      const id = path[1];
      const before = await env.DB.prepare('SELECT * FROM exception_ledger WHERE id = ?').bind(id).first();
      const body = await request.json();
      await env.DB.prepare(
        `UPDATE exception_ledger SET status = ?, remark = ?, handler = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(body.status, body.remark || '', body.handler || '', id).run();
      await writeAudit(env.DB, 'exceptions', 'update', id, before, body, request);
      return json({ success: true });
    }
    if (pathStr === 'exceptions/generate' && method === 'POST') {
      // 自动生成前一日异常台账
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);
      const rs = await env.DB.prepare(
        `SELECT id, merchant_id, status FROM attendance_records WHERE date = ? AND status IN ('absent', 'unsigned')`
      ).bind(dateStr).all();
      let count = 0;
      for (const r of rs.results) {
        const id = uuid();
        await env.DB.prepare(
          `INSERT OR IGNORE INTO exception_ledger (id, date, merchant_id, exception_type, status, remark, handler, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'pending', '', '', datetime('now'), datetime('now'))`
        ).bind(id, dateStr, r.merchant_id, r.status, ).run();
        count++;
      }
      await writeAudit(env.DB, 'exceptions', 'generate', dateStr, null, { count }, request);
      return json({ success: true, count, date: dateStr });
    }

    // ===== Ratings（实时计算） =====
    if (pathStr === 'ratings' && method === 'GET') {
      const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      const merchants = await env.DB.prepare('SELECT * FROM merchants').all();
      const records = await env.DB.prepare(
        `SELECT merchant_id, status FROM attendance_records WHERE date BETWEEN ? AND ?`
      ).bind(startDate, endDate).all();
      const result = [];
      for (const m of merchants.results) {
        const recs = records.results.filter((r) => r.merchant_id === m.id);
        const present = recs.filter((r) => r.status === 'signedIn').length;
        const absent = recs.filter((r) => r.status === 'absent').length;
        const total = recs.length;
        const rate = total > 0 ? present / total : 0;
        const fullScore = total > 0 && absent === 0 ? 1 : 0;
        const score = Math.round((rate * 0.7 + fullScore * 0.3) * 100);
        let level = 'watchlist';
        if (score >= 90) level = 'excellent';
        else if (score >= 75) level = 'qualified';
        else if (score >= 60) level = 'warning';
        result.push({
          merchantId: m.id,
          merchantName: m.name,
          floor: m.floor,
          location: m.location,
          month,
          score,
          level,
          attendanceRate: Math.round(rate * 100),
          absentCount: absent,
          presentCount: present,
          totalDays: total,
        });
      }
      result.sort((a, b) => b.score - a.score);
      return json(result);
    }

    // ===== Alert Rules =====
    if (pathStr === 'alert-rules' && method === 'GET') {
      const rs = await env.DB.prepare('SELECT * FROM alert_rules ORDER BY created_at DESC').all();
      return json(rs.results.map((r) => {
        const c = camelize(r) || {};
        c.enabled = !!c.enabled;
        return c;
      }));
    }
    if (pathStr === 'alert-rules' && method === 'POST') {
      const body = await request.json();
      const id = body.id || uuid();
      await env.DB.prepare(
        `INSERT INTO alert_rules (id, name, condition_type, threshold, enabled, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).bind(id, body.name, body.conditionType, body.threshold ?? 0, body.enabled === false ? 0 : 1).run();
      await writeAudit(env.DB, 'alert-rules', 'create', id, null, body, request);
      return json({ success: true, id });
    }
    if (pathStr.match(/^alert-rules\/[\w-]+$/) && method === 'PUT') {
      const id = path[1];
      const before = await env.DB.prepare('SELECT * FROM alert_rules WHERE id = ?').bind(id).first();
      const body = await request.json();
      await env.DB.prepare(
        `UPDATE alert_rules SET name = ?, condition_type = ?, threshold = ?, enabled = ? WHERE id = ?`
      ).bind(body.name, body.conditionType, body.threshold ?? 0, body.enabled === false ? 0 : 1, id).run();
      await writeAudit(env.DB, 'alert-rules', 'update', id, before, body, request);
      return json({ success: true });
    }
    if (pathStr.match(/^alert-rules\/[\w-]+$/) && method === 'DELETE') {
      const id = path[1];
      await env.DB.prepare('DELETE FROM alert_rules WHERE id = ?').bind(id).run();
      await writeAudit(env.DB, 'alert-rules', 'delete', id, null, null, request);
      return json({ success: true });
    }
    if (pathStr === 'alert-records' && method === 'GET') {
      const rs = await env.DB.prepare(
        `SELECT ar.*, r.name AS rule_name FROM alert_records ar LEFT JOIN alert_rules r ON ar.rule_id = r.id ORDER BY ar.created_at DESC LIMIT 100`
      ).all();
      return json(rs.results.map((r) => camelize(r)));
    }

    // ===== Audit Logs =====
    if (pathStr === 'audit-logs' && method === 'GET') {
      const { startDate, endDate, user, module, action, page = '1', pageSize = '20' } = Object.fromEntries(url.searchParams);
      let sql = 'SELECT * FROM audit_logs WHERE 1=1';
      const args: string[] = [];
      if (startDate) { sql += ' AND created_at >= ?'; args.push(startDate); }
      if (endDate) { sql += ' AND created_at <= ?'; args.push(endDate + ' 23:59:59'); }
      if (user) { sql += ' AND user LIKE ?'; args.push(`%${user}%`); }
      if (module) { sql += ' AND module = ?'; args.push(module); }
      if (action) { sql += ' AND action LIKE ?'; args.push(`%${action}%`); }
      const total = (await env.DB.prepare(`SELECT COUNT(*) as c FROM (${sql})`).bind(...args).first() as Record<string, unknown>)?.c as number;
      const offset = (Number(page) - 1) * Number(pageSize);
      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      args.push(String(pageSize), String(offset));
      const rs = await env.DB.prepare(sql).bind(...args).all();
      return json({ list: rs.results.map((r) => camelize(r)), total, page: Number(page), pageSize: Number(pageSize) });
    }

    // ===== Backup & Restore =====
    if (pathStr === 'backup' && method === 'GET') {
      const format = url.searchParams.get('format') || 'json';
      const tables = ['merchants', 'attendance_records', 'roll_call_rules', 'floors', 'areas', 'exception_ledger', 'alert_rules', 'alert_records', 'announcements', 'announcement_reads', 'system_config', 'email_config', 'merchant_ratings', 'import_logs', 'audit_logs'];
      if (format === 'sql') {
        let sql = '-- 商场考勤管理系统数据库备份\n-- 生成时间: ' + new Date().toISOString() + '\n\n';
        for (const t of tables) {
          sql += `-- ${t}\nDELETE FROM ${t};\n`;
          const rs = await env.DB.prepare(`SELECT * FROM ${t}`).all();
          for (const r of rs.results) {
            const cols = Object.keys(r);
            const vals = cols.map((c) => `'${String(r[c]).replace(/'/g, "''")}'`).join(',');
            sql += `INSERT INTO ${t} (${cols.join(',')}) VALUES (${vals});\n`;
          }
          sql += '\n';
        }
        return new Response(sql, { headers: { 'Content-Type': 'text/sql; charset=utf-8', 'Content-Disposition': 'attachment; filename="backup.sql"' } });
      }
      const out: Record<string, unknown[]> = {};
      for (const t of tables) {
        const rs = await env.DB.prepare(`SELECT * FROM ${t}`).all();
        out[t] = rs.results;
      }
      return json(out);
    }
    if (pathStr === 'backup' && method === 'POST') {
      const body = await request.json();
      const tables = Object.keys(body);
      for (const t of tables) {
        if (!/^[a-z_]+$/.test(t)) continue; // 防注入
        await env.DB.prepare(`DELETE FROM ${t}`).run();
        for (const row of body[t]) {
          const cols = Object.keys(row);
          if (!cols.length) continue;
          const vals = cols.map(() => '?').join(',');
          await env.DB.prepare(`INSERT OR REPLACE INTO ${t} (${cols.join(',')}) VALUES (${vals})`).bind(...cols.map((c) => row[c])).run();
        }
      }
      await writeAudit(env.DB, 'backup', 'restore', 'all', null, { tables }, request);
      return json({ success: true, message: `已还原 ${tables.length} 张表` });
    }

    // ===== Bulk Import =====
    if (pathStr === 'bulk-import' && method === 'POST') {
      const body = await request.json();
      const { merchants } = body;
      if (!Array.isArray(merchants)) return err('merchants 必须是数组');
      let successCount = 0;
      const failReasons: string[] = [];
      const existingLocs = new Set(
        (await env.DB.prepare('SELECT location FROM merchants').all()).results.map((r) => r.location)
      );
      for (let i = 0; i < merchants.length; i++) {
        const m = merchants[i];
        try {
          if (!m.name) { failReasons.push(`第${i + 1}行: 缺少商户名`); continue; }
          if (m.location && existingLocs.has(m.location)) { failReasons.push(`第${i + 1}行: 铺位号 ${m.location} 已存在`); continue; }
          const id = m.id || uuid();
          await env.DB.prepare(
            `INSERT OR REPLACE INTO merchants (id, name, floor, location, verified, avatar, signed_in, absent, signed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(id, m.name, m.floor || '1F', m.location || '', m.verified ? 1 : 0, m.avatar || '', m.signedIn ? 1 : 0, m.absent ? 1 : 0, m.signedAt || '')
            .run();
          existingLocs.add(m.location);
          successCount++;
        } catch (e) {
          failReasons.push(`第${i + 1}行: ${(e as Error).message}`);
        }
      }
      const logId = uuid();
      await env.DB.prepare(
        `INSERT INTO import_logs (id, type, total, success_count, fail_count, fail_reasons, operator, created_at)
         VALUES (?, 'merchants', ?, ?, ?, ?, 'admin', datetime('now'))`
      ).bind(logId, merchants.length, successCount, failReasons.length, JSON.stringify(failReasons)).run();
      await writeAudit(env.DB, 'bulk-import', 'import', logId, null, { total: merchants.length, successCount }, request);
      return json({ success: true, successCount, failCount: failReasons.length, failReasons });
    }
    if (pathStr === 'import-logs' && method === 'GET') {
      const rs = await env.DB.prepare('SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 50').all();
      return json(rs.results.map((r) => {
        const c = camelize(r) || {};
        try { c.failReasons = JSON.parse((c.failReasons as string) || '[]'); } catch { /* keep */ }
        return c;
      }));
    }

    // ===== 七牛云上传 Token 签发 =====
    if (pathStr === 'qiniu/token' && method === 'GET') {
      const { QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET, QINIU_DOMAIN } = env;
      if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY || !QINIU_BUCKET || !QINIU_DOMAIN) {
        return err('七牛云未配置（缺少 QINIU_ACCESS_KEY / QINIU_SECRET_KEY / QINIU_BUCKET / QINIU_DOMAIN 环境变量）', 503);
      }
      const token = await signQiniuUploadToken(QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET);
      return json({
        // 上传地址：亚太-新加坡（as0）加速上传节点
        uploadUrl: 'https://upload-as0.qiniup.com',
        token,
        domain: QINIU_DOMAIN,
        bucket: QINIU_BUCKET,
      });
    }

    // ===== 七牛云代理上传（绕过浏览器 CORS 限制） =====
    if (pathStr === 'qiniu/upload' && method === 'POST') {
      const { QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET, QINIU_DOMAIN } = env;
      if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY || !QINIU_BUCKET || !QINIU_DOMAIN) {
        return err('七牛云未配置', 503);
      }
      const formData = await request.formData();
      const file = formData.get('file');
      const prefix = (formData.get('prefix') as string) || '';
      if (!(file instanceof File)) return err('缺少 file 字段');
      if (file.size > 10 * 1024 * 1024) return err('图片不能超过 10MB');

      const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${prefix}${uuid()}${ext ? '.' + ext : ''}`;
      const token = await signQiniuUploadToken(QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET);

      // 构造七牛上传的 multipart/form-data
      const qiniuForm = new FormData();
      qiniuForm.append('key', key);
      qiniuForm.append('token', token);
      qiniuForm.append('file', file, file.name);

      const qiniuRes = await fetch('https://upload-as0.qiniup.com', {
        method: 'POST',
        body: qiniuForm,
      });
      const qiniuText = await qiniuRes.text();
      let qiniuData: unknown = null;
      try { qiniuData = JSON.parse(qiniuText); } catch { /* 非 JSON */ }
      if (!qiniuRes.ok || !qiniuData) {
        return err(`七牛上传失败: HTTP ${qiniuRes.status} - ${qiniuText.slice(0, 200)}`, 502);
      }
      // 返回 Worker 代理 URL（相对路径），前端展示用代理 URL 避免七牛源站 HTTPS 问题
      return json({ url: `/api/qiniu/image/${key}`, key, originalUrl: `${QINIU_DOMAIN}/${key}` });
    }

    // ===== 七牛云图片代理（HTTP 取图 → HTTPS 返回，解决七牛源站 HTTPS 不支持问题） =====
    if (pathStr.startsWith('qiniu/image/') && method === 'GET') {
      const { QINIU_DOMAIN } = env;
      if (!QINIU_DOMAIN) return err('七牛云未配置', 503);
      // 提取 key（pathStr 形如 "qiniu/image/backgrounds/xxx.jpg"）
      const key = pathStr.slice('qiniu/image/'.length);
      if (!key) return err('缺少图片 key', 400);
      // 强制用 HTTP 从七牛源站取图（源站 cdn.0080.cc.cd 不支持 HTTPS）
      const domain = QINIU_DOMAIN.replace(/^https?:\/\//, '');
      const qiniuUrl = `http://${domain}/${key}`;
      const upstream = await fetch(qiniuUrl);
      if (!upstream.ok) {
        return err(`图片获取失败: HTTP ${upstream.status}`, 502);
      }
      const headers = new Headers();
      // 透传图片相关头
      const ct = upstream.headers.get('content-type');
      if (ct) headers.set('Content-Type', ct);
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(upstream.body, { status: 200, headers });
    }

    // ===== Email Config（单行 id=1） =====
    if (pathStr === 'email-config' && method === 'GET') {
      const r = await env.DB.prepare('SELECT * FROM email_config WHERE id = 1').first();
      if (!r) return json({});
      const c = camelize(r) || {};
      c.enabled = !!c.enabled;
      try { c.recipients = JSON.parse((c.recipients as string) || '[]'); } catch { c.recipients = []; }
      // 不返回密码明文，仅返回是否已设置
      c.hasPassword = !!c.smtpPassword;
      delete c.smtpPassword;
      return json(c);
    }
    if (pathStr === 'email-config' && method === 'PUT') {
      const body = await request.json();
      const before = await env.DB.prepare('SELECT * FROM email_config WHERE id = 1').first();
      // 密码为空时不覆盖（保留原密码）
      const password = body.smtpPassword && body.smtpPassword.length
        ? body.smtpPassword
        : (before && before.smtp_password) || '';
      const recipients = JSON.stringify(body.recipients ?? []);
      await env.DB.prepare(
        `UPDATE email_config SET enabled = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, from_name = ?, from_email = ?, recipients = ?, updated_at = datetime('now') WHERE id = 1`
      )
        .bind(body.enabled ? 1 : 0, body.smtpHost || '', body.smtpPort ?? 465, body.smtpUser || '', password, body.fromName || '商场考勤管理系统', body.fromEmail || '', recipients)
        .run();
      await writeAudit(env.DB, 'email-config', 'update', '1', null, { ...body, smtpPassword: '***' }, request);
      return json({ success: true });
    }
    if (pathStr === 'email-config/test' && method === 'POST') {
      // 测试邮件发送（Cloudflare Pages 环境无原生 SMTP，这里仅校验配置完整性）
      const r = await env.DB.prepare('SELECT * FROM email_config WHERE id = 1').first();
      if (!r) return err('邮件配置不存在');
      const c = camelize(r) || {};
      const missing: string[] = [];
      if (!c.smtpHost) missing.push('SMTP 服务器');
      if (!c.smtpUser) missing.push('SMTP 用户名');
      if (!c.smtpPassword) missing.push('SMTP 密码/授权码');
      if (!c.fromEmail) missing.push('发件邮箱');
      if (missing.length) return err('配置不完整，缺少：' + missing.join('、'));
      return json({ success: true, message: '配置校验通过。实际 SMTP 发信需在配置完整后由服务端触发。' });
    }

    return err(`未实现的接口: ${method} /api/${pathStr}`, 404);
  } catch (e) {
    console.error('API error:', e);
    return err(`服务器错误: ${(e as Error).message}`, 500);
  }
}

// ===== 七牛云工具：URL-safe base64 + HMAC-SHA1 签名 =====

function base64UrlSafe(s: string): string {
  // 七牛 URL-safe base64：只替换 +→-、/→_，保留 = 填充（剥离 = 会导致 bad token）
  const b64 = btoa(s);
  return b64.replace(/\+/g, '-').replace(/\//g, '_');
}

async function hmacSha1(keyStr: string, data: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  // 七牛官方规范：SecretKey 直接作为字符串（UTF-8 字节）用作 HMAC key，不需要 base64 decode
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(keyStr),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
}

function bufferToUrlSafeBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // 保留 = 填充（剥离 = 会导致 bad token）
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * 生成七牛上传凭证
 * uptoken = AccessKey:EncodedSign:EncodedPutPolicy
 * SecretKey 直接作为字符串用作 HMAC-SHA1 的 key（七牛官方规范）
 */
async function signQiniuUploadToken(accessKey: string, secretKey: string, bucket: string): Promise<string> {
  const putPolicy = {
    scope: bucket,
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 小时有效
  };
  const encodedPutPolicy = base64UrlSafe(JSON.stringify(putPolicy));
  const signBuf = await hmacSha1(secretKey, encodedPutPolicy);
  const encodedSign = bufferToUrlSafeBase64(signBuf);
  return `${accessKey}:${encodedSign}:${encodedPutPolicy}`;
}
