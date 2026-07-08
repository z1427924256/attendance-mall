// 重新生成所有考勤记录（清理后重建）

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

const merchants = [
  { id: "m01", signedIn: true, absent: false, signedAt: "10:05" },
  { id: "m02", signedIn: true, absent: false, signedAt: "10:12" },
  { id: "m03", signedIn: false, absent: false, signedAt: "" },
  { id: "m04", signedIn: true, absent: false, signedAt: "10:08" },
  { id: "m05", signedIn: true, absent: false, signedAt: "10:15" },
  { id: "m06", signedIn: true, absent: false, signedAt: "10:20" },
  { id: "m07", signedIn: true, absent: false, signedAt: "10:03" },
  { id: "m08", signedIn: true, absent: false, signedAt: "10:18" },
  { id: "m09", signedIn: true, absent: false, signedAt: "10:22" },
  { id: "m10", signedIn: true, absent: false, signedAt: "10:25" },
  { id: "m11", signedIn: true, absent: false, signedAt: "09:58" },
  { id: "m12", signedIn: false, absent: true, signedAt: "" },
  { id: "m13", signedIn: true, absent: false, signedAt: "10:10" },
  { id: "m14", signedIn: true, absent: false, signedAt: "10:30" },
  { id: "m15", signedIn: true, absent: false, signedAt: "09:55" },
  { id: "m16", signedIn: true, absent: false, signedAt: "10:28" },
  { id: "m17", signedIn: false, absent: true, signedAt: "" },
  { id: "m18", signedIn: true, absent: false, signedAt: "09:50" },
  { id: "m19", signedIn: true, absent: false, signedAt: "10:15" },
  { id: "m20", signedIn: true, absent: false, signedAt: "10:18" },
  { id: "m21", signedIn: true, absent: false, signedAt: "10:33" },
  { id: "m22", signedIn: true, absent: false, signedAt: "10:20" },
  { id: "m23", signedIn: true, absent: false, signedAt: "10:02" },
  { id: "m24", signedIn: true, absent: false, signedAt: "10:16" },
  { id: "m25", signedIn: true, absent: false, signedAt: "10:28" },
  { id: "m26", signedIn: true, absent: false, signedAt: "10:08" },
  { id: "m27", signedIn: true, absent: false, signedAt: "10:22" },
  { id: "m28", signedIn: true, absent: false, signedAt: "10:25" },
  { id: "m29", signedIn: false, absent: false, signedAt: "" },
  { id: "m30", signedIn: true, absent: false, signedAt: "10:12" },
  { id: "m31", signedIn: true, absent: false, signedAt: "09:45" },
  { id: "m32", signedIn: true, absent: false, signedAt: "10:18" },
  { id: "m33", signedIn: true, absent: false, signedAt: "10:30" },
  { id: "m34", signedIn: false, absent: false, signedAt: "" },
  { id: "m35", signedIn: true, absent: false, signedAt: "10:15" },
];

async function main() {
  console.log("=== 1. 清空所有考勤记录 ===");
  await query("DELETE FROM attendance_records");
  console.log("  Cleared all records");

  console.log("\n=== 2. 生成 30 天考勤记录 ===");
  const today = new Date("2026-07-04");
  let total = 0;

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const stmts: string[] = [];
    for (const m of merchants) {
      let status = "unsigned";
      let signedAt = "";
      const seed = (parseInt(m.id.replace("m", "")) + i * 7) % 10;

      if (i === 0) {
        if (m.signedIn) { status = "signedIn"; signedAt = m.signedAt; }
        else if (m.absent) { status = "absent"; }
      } else if (i < 7) {
        if (seed < 7) { status = "signedIn"; signedAt = `10:${String(seed * 3).padStart(2, "0")}`; }
        else if (seed < 9) { status = "absent"; }
      } else {
        status = "signedIn";
        signedAt = `10:${String(seed).padStart(2, "0")}`;
      }

      stmts.push(
        `INSERT OR REPLACE INTO attendance_records (id, merchant_id, date, status, signed_at) VALUES ('${m.id}-${dateStr}', '${m.id}', '${dateStr}', '${status}', '${signedAt}')`
      );
    }

    for (let j = 0; j < stmts.length; j += 18) {
      const sql = stmts.slice(j, j + 18).join("; ");
      const r = await query(sql);
      if (!r.success) console.log(`  ERROR day ${dateStr}:`, JSON.stringify(r.errors));
    }
    total += stmts.length;
    if (i % 10 === 0) console.log(`  day ${dateStr} done (${stmts.length} records)`);
  }

  console.log(`\n=== 完成！商户: ${merchants.length}, 考勤记录: ${total} ===`);
}

main().catch(console.error);
