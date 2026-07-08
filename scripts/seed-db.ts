// 独立脚本：用新 schema 初始化 D1 数据库 + 导入 35 个商户 + 生成 30 天考勤记录
// 用法：设置环境变量后执行 npx tsx scripts/seed-db.ts

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const DB_ID = process.env.CLOUDFLARE_D1_DB_ID!;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

async function query(sql: string) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  return res.json();
}

const merchants = [
  { id: 'm01', name: '星巴克', floor: '1F', location: '1F-101', category: '咖啡', emoji: '☕', manager: '张三', contact: '138-0000-0001', area: 150, openHours: '08:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:05' },
  { id: 'm02', name: '喜茶', floor: '1F', location: '1F-108', category: '茶饮', emoji: '🍵', manager: '李四', contact: '138-0000-0002', area: 80, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:12' },
  { id: 'm03', name: '肯德基', floor: '1F', location: '1F-105', category: '快餐', emoji: '🍗', manager: '王五', contact: '138-0000-0003', area: 200, openHours: '07:00-23:00', verified: true, signedIn: false, absent: false, signedAt: '' },
  { id: 'm04', name: '优衣库', floor: '2F', location: '2F-201', category: '服装', emoji: '👕', manager: '赵六', contact: '138-0000-0004', area: 300, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:08' },
  { id: 'm05', name: '海底捞', floor: '4F', location: '4F-401', category: '火锅', emoji: '🍲', manager: '钱七', contact: '138-0000-0005', area: 500, openHours: '11:00-02:00', verified: true, signedIn: true, absent: false, signedAt: '10:15' },
  { id: 'm06', name: '丝芙兰', floor: '1F', location: '1F-120', category: '美妆个护', emoji: '💄', manager: '孙八', contact: '138-0000-0006', area: 120, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:20' },
  { id: 'm07', name: '无印良品', floor: '2F', location: '2F-205', category: '生活百货', emoji: '🛍️', manager: '周九', contact: '138-0000-0007', area: 250, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:03' },
  { id: 'm08', name: '泡泡玛特', floor: '2F', location: '2F-218', category: '潮玩', emoji: '🎁', manager: '吴十', contact: '138-0000-0008', area: 60, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:18' },
  { id: 'm09', name: '奈雪的茶', floor: '1F', location: '1F-115', category: '茶饮', emoji: '🍵', manager: '郑一', contact: '138-0000-0009', area: 90, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:22' },
  { id: 'm10', name: 'ZARA', floor: '2F', location: '2F-210', category: '服装', emoji: '👗', manager: '冯二', contact: '138-0000-0010', area: 350, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:25' },
  { id: 'm11', name: 'Apple Store', floor: '1F', location: '1F-102', category: '数码', emoji: '📱', manager: '陈三', contact: '138-0000-0011', area: 280, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '09:58' },
  { id: 'm12', name: '外婆家', floor: '4F', location: '4F-428', category: '中餐', emoji: '🥟', manager: '褚四', contact: '138-0000-0012', area: 220, openHours: '11:00-21:30', verified: true, signedIn: false, absent: true, signedAt: '' },
  { id: 'm13', name: '华为体验店', floor: '1F', location: '1F-110', category: '数码', emoji: '📲', manager: '卫五', contact: '138-0000-0013', area: 100, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:10' },
  { id: 'm14', name: 'Nike', floor: '3F', location: '3F-301', category: '运动', emoji: '👟', manager: '蒋六', contact: '138-0000-0014', area: 200, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:30' },
  { id: 'm15', name: '万达影城', floor: '4F', location: '4F-402', category: '中餐', emoji: '🎬', manager: '沈七', contact: '138-0000-0015', area: 800, openHours: '09:00-01:00', verified: true, signedIn: true, absent: false, signedAt: '09:55' },
  { id: 'm16', name: '西贝莜面村', floor: '4F', location: '4F-415', category: '中餐', emoji: '🥬', manager: '韩八', contact: '138-0000-0016', area: 180, openHours: '11:00-21:30', verified: true, signedIn: true, absent: false, signedAt: '10:28' },
  { id: 'm17', name: '海澜之家', floor: '2F', location: '2F-222', category: '服装', emoji: '👔', manager: '杨九', contact: '138-0000-0017', area: 160, openHours: '10:00-22:00', verified: false, signedIn: false, absent: true, signedAt: '' },
  { id: 'm18', name: '瑞幸咖啡', floor: '1F', location: '1F-103', category: '咖啡', emoji: '☕', manager: '秦十', contact: '138-0000-0018', area: 50, openHours: '07:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '09:50' },
  { id: 'm19', name: '必胜客', floor: '3F', location: '3F-305', category: '西餐', emoji: '🍕', manager: '许一', contact: '138-0000-0019', area: 150, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:15' },
  { id: 'm20', name: 'Adidas', floor: '3F', location: '3F-302', category: '运动', emoji: '👟', manager: '何二', contact: '138-0000-0020', area: 180, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:18' },
  { id: 'm21', name: '味千拉面', floor: '3F', location: '3F-310', category: '日料', emoji: '🍜', manager: '吕三', contact: '138-0000-0021', area: 100, openHours: '11:00-21:30', verified: false, signedIn: true, absent: false, signedAt: '10:33' },
  { id: 'm22', name: 'DQ冰雪皇后', floor: '1F', location: '1F-112', category: '甜品', emoji: '🍦', manager: '施四', contact: '138-0000-0022', area: 40, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:20' },
  { id: 'm23', name: '小米之家', floor: '1F', location: '1F-106', category: '数码', emoji: '📱', manager: '张五', contact: '138-0000-0023', area: 120, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:02' },
  { id: 'm24', name: '太平鸟', floor: '2F', location: '2F-215', category: '服装', emoji: '👗', manager: '孔六', contact: '138-0000-0024', area: 130, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:16' },
  { id: 'm25', name: '凑凑火锅', floor: '4F', location: '4F-410', category: '火锅', emoji: '🍲', manager: '曹七', contact: '138-0000-0025', area: 200, openHours: '11:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:28' },
  { id: 'm26', name: '良品铺子', floor: '1F', location: '1F-118', category: '生活百货', emoji: '🛍️', manager: '严八', contact: '138-0000-0026', area: 70, openHours: '09:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:08' },
  { id: 'm27', name: '李宁', floor: '3F', location: '3F-308', category: '运动', emoji: '👟', manager: '华九', contact: '138-0000-0027', area: 150, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:22' },
  { id: 'm28', name: 'COCO都可', floor: '1F', location: '1F-109', category: '茶饮', emoji: '🍵', manager: '金十', contact: '138-0000-0028', area: 50, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:25' },
  { id: 'm29', name: 'GAP', floor: '2F', location: '2F-220', category: '服装', emoji: '👕', manager: '魏一', contact: '138-0000-0029', area: 200, openHours: '10:00-22:00', verified: true, signedIn: false, absent: false, signedAt: '' },
  { id: 'm30', name: '汉堡王', floor: '3F', location: '3F-306', category: '快餐', emoji: '🍔', manager: '陶二', contact: '138-0000-0030', area: 120, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:12' },
  { id: 'm31', name: '全家FamilyMart', floor: '1F', location: '1F-001', category: '生活百货', emoji: '🏪', manager: '姜三', contact: '138-0000-0031', area: 60, openHours: '07:00-23:00', verified: true, signedIn: true, absent: false, signedAt: '09:45' },
  { id: 'm32', name: '花西子', floor: '1F', location: '1F-125', category: '美妆个护', emoji: '💄', manager: '戚四', contact: '138-0000-0032', area: 80, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:18' },
  { id: 'm33', name: '一芳水果茶', floor: '1F', location: '1F-113', category: '茶饮', emoji: '🍵', manager: '谢五', contact: '138-0000-0033', area: 45, openHours: '10:00-22:00', verified: false, signedIn: true, absent: false, signedAt: '10:30' },
  { id: 'm34', name: '绿茶餐厅', floor: '3F', location: '3F-320', category: '中餐', emoji: '🥬', manager: '邹六', contact: '138-0000-0034', area: 180, openHours: '11:00-21:30', verified: true, signedIn: false, absent: false, signedAt: '' },
  { id: 'm35', name: '名创优品', floor: '2F', location: '2F-230', category: '生活百货', emoji: '🛍️', manager: '喻七', contact: '138-0000-0035', area: 90, openHours: '10:00-22:00', verified: true, signedIn: true, absent: false, signedAt: '10:15' },
];

function esc(s: string) { return s.replace(/'/g, "''"); }

async function main() {
  console.log('=== 1. 执行 schema.sql 建表 ===');
  const fs = await import('fs');
  const schema = fs.readFileSync(new URL('../functions/schema.sql', import.meta.url), 'utf-8');
  // 按分号分割执行
  const stmts = schema.split(/;(?=\s*(?:--|CREATE|INSERT|CREATE INDEX|$))/).map((s) => s.trim()).filter((s) => s && !s.startsWith('--'));
  for (const sql of stmts) {
    const r = await query(sql);
    if (!r.success) console.log('  FAIL:', JSON.stringify(r.errors));
  }
  console.log('  建表完成');

  console.log('\n=== 2. 导入 35 个商户 ===');
  await query('DELETE FROM merchants');
  for (let i = 0; i < merchants.length; i += 10) {
    const batch = merchants.slice(i, i + 10);
    const sql = batch.map((m) =>
      `INSERT INTO merchants (id, name, floor, location, category, emoji, manager, contact, area, open_hours, verified, avatar, signed_in, absent, signed_at) VALUES ('${m.id}', '${esc(m.name)}', '${m.floor}', '${m.location}', '${esc(m.category)}', '${m.emoji}', '${esc(m.manager)}', '${esc(m.contact)}', ${m.area}, '${esc(m.openHours)}', ${m.verified ? 1 : 0}, '', ${m.signedIn ? 1 : 0}, ${m.absent ? 1 : 0}, '${m.signedAt || ''}')`
    ).join('; ');
    const r = await query(sql);
    console.log(`  ${i}-${i + batch.length - 1}: ${r.success ? 'OK' : 'FAIL'}`);
  }

  console.log('\n=== 3. 生成 30 天考勤记录 ===');
  await query('DELETE FROM attendance_records');
  const today = new Date();
  let total = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const stmts: string[] = [];
    for (const m of merchants) {
      let status = 'unsigned';
      let signedAt = '';
      const seed = (parseInt(m.id.replace('m', '')) + i * 7) % 10;
      if (i === 0) {
        if (m.signedIn) { status = 'signedIn'; signedAt = m.signedAt; }
        else if (m.absent) { status = 'absent'; }
      } else if (i < 7) {
        if (seed < 7) { status = 'signedIn'; signedAt = `10:${String(seed * 3).padStart(2, '0')}`; }
        else if (seed < 9) { status = 'absent'; }
      } else {
        status = 'signedIn';
        signedAt = `10:${String(seed).padStart(2, '0')}`;
      }
      stmts.push(`INSERT OR REPLACE INTO attendance_records (id, merchant_id, date, status, signed_at) VALUES ('${m.id}-${dateStr}', '${m.id}', '${dateStr}', '${status}', '${signedAt}')`);
    }
    for (let j = 0; j < stmts.length; j += 18) {
      const sql = stmts.slice(j, j + 18).join('; ');
      await query(sql);
    }
    total += stmts.length;
  }
  console.log(`  考勤记录: ${total}`);

  console.log('\n=== 完成！商户 35 + 考勤记录', total, '===');
}

main().catch(console.error);
