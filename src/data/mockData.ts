// 商户
export interface Merchant {
  id: string;
  name: string; // 商户名称
  floor: string; // 楼层 1F/2F/3F/4F
  location: string; // 铺位号 如 2F-222
  emoji: string; // 业态图标 emoji
  verified: boolean; // 是否认证
  contact: string; // 联系电话
  manager: string; // 负责人
  category: string; // 业态
  area: number; // 面积
  openHours: string; // 营业时间
  signedIn: boolean; // 今日是否已签到
  signedAt?: string; // 签到时间
  absent?: boolean; // 今日是否缺勤
  avatar?: string; // 自定义头像（base64 或 URL），为空时取商户名前两字
}

// 每日考勤记录
export interface AttendanceRecord {
  id: string;
  merchantId: string;
  date: string; // 日期 YYYY-MM-DD
  expected: number; // 应到
  actual: number; // 实到
  absent: number; // 缺勤
  rate: number; // 到岗率 %
  status: "normal" | "abnormal"; // 状态
}

export const FLOORS = ["全部", "1F", "2F", "3F", "4F"] as const;

export const merchants: Merchant[] = [
  { id: "m1", name: "喜茶", floor: "1F", location: "1F-101", emoji: "🍵", verified: true, contact: "138-0000-1001", manager: "张丽华", category: "茶饮", area: 80, openHours: "10:00-22:00", signedIn: false },
  { id: "m2", name: "星巴克", floor: "1F", location: "1F-105", emoji: "☕", verified: true, contact: "138-0000-1002", manager: "王磊", category: "咖啡", area: 120, openHours: "08:00-22:30", signedIn: true, signedAt: "09:58" },
  { id: "m3", name: "华为体验店", floor: "1F", location: "1F-108", emoji: "📱", verified: true, contact: "138-0000-1003", manager: "刘洋", category: "数码", area: 150, openHours: "10:00-22:00", signedIn: true, signedAt: "10:02" },
  { id: "m4", name: "小米之家", floor: "1F", location: "1F-112", emoji: "📲", verified: true, contact: "138-0000-1004", manager: "周婷", category: "数码", area: 200, openHours: "10:00-22:00", signedIn: true, signedAt: "10:05" },
  { id: "m5", name: "肯德基", floor: "1F", location: "1F-115", emoji: "🍗", verified: true, contact: "138-0000-1005", manager: "陈强", category: "快餐", area: 180, openHours: "10:00-22:00", signedIn: true, signedAt: "10:08" },
  { id: "m6", name: "名创优品", floor: "2F", location: "2F-201", emoji: "🛍️", verified: true, contact: "138-0000-2001", manager: "李娜", category: "生活百货", area: 280, openHours: "10:00-22:00", signedIn: true, signedAt: "09:42" },
  { id: "m7", name: "屈臣氏", floor: "2F", location: "2F-205", emoji: "💊", verified: true, contact: "138-0000-2002", manager: "郑雪", category: "美妆个护", area: 160, openHours: "10:00-22:00", signedIn: true, signedAt: "10:11" },
  { id: "m8", name: "丝芙兰", floor: "2F", location: "2F-208", emoji: "💄", verified: true, contact: "138-0000-2003", manager: "孙浩", category: "美妆个护", area: 140, openHours: "10:00-22:00", signedIn: true, signedAt: "10:15" },
  { id: "m9", name: "泡泡玛特", floor: "2F", location: "2F-212", emoji: "🎁", verified: true, contact: "138-0000-2004", manager: "吴鹏", category: "潮玩", area: 100, openHours: "10:00-22:00", signedIn: false },
  { id: "m10", name: "海底捞", floor: "3F", location: "3F-302", emoji: "🍲", verified: true, contact: "138-0000-3001", manager: "赵敏", category: "火锅", area: 420, openHours: "11:00-23:00", signedIn: false, absent: true },
  { id: "m11", name: "九毛九", floor: "3F", location: "3F-315", emoji: "🥟", verified: true, contact: "138-0000-3002", manager: "黄俊", category: "中餐", area: 260, openHours: "10:00-22:00", signedIn: false, absent: true },
  { id: "m12", name: "味千拉面", floor: "4F", location: "4F-408", emoji: "🍜", verified: true, contact: "138-0000-4001", manager: "林峰", category: "日料", area: 180, openHours: "10:00-22:00", signedIn: false, absent: true },
  { id: "m13", name: "必胜客", floor: "4F", location: "4F-412", emoji: "🍕", verified: true, contact: "138-0000-4002", manager: "何芳", category: "西餐", area: 240, openHours: "10:00-22:00", signedIn: true, signedAt: "10:20" },
  { id: "m14", name: "优衣库", floor: "3F", location: "3F-301", emoji: "👕", verified: true, contact: "138-0000-3003", manager: "陈强", category: "服装", area: 560, openHours: "10:00-22:00", signedIn: true, signedAt: "10:12" },
  { id: "m15", name: "ZARA", floor: "3F", location: "3F-305", emoji: "👗", verified: false, contact: "138-0000-3004", manager: "孙浩", category: "服装", area: 480, openHours: "10:00-22:00", signedIn: true, signedAt: "10:18" },
  { id: "m16", name: "HM", floor: "3F", location: "3F-310", emoji: "🧥", verified: false, contact: "138-0000-3005", manager: "黄俊", category: "服装", area: 380, openHours: "10:00-22:00", signedIn: false },
  { id: "m17", name: "海澜之家", floor: "2F", location: "2F-222", emoji: "👔", verified: true, contact: "138-0000-2005", manager: "张丽华", category: "服装", area: 220, openHours: "10:00-22:00", signedIn: false, absent: true },
  { id: "m18", name: "奈雪的茶", floor: "1F", location: "1F-118", emoji: "🍵", verified: true, contact: "138-0000-1006", manager: "周婷", category: "茶饮", area: 90, openHours: "10:00-22:00", signedIn: true, signedAt: "10:22" },
  { id: "m19", name: "瑞幸咖啡", floor: "1F", location: "1F-120", emoji: "☕", verified: true, contact: "138-0000-1007", manager: "王磊", category: "咖啡", area: 60, openHours: "07:00-22:00", signedIn: true, signedAt: "09:30" },
  { id: "m20", name: "麦当劳", floor: "1F", location: "1F-122", emoji: "🍔", verified: true, contact: "138-0000-1008", manager: "陈强", category: "快餐", area: 160, openHours: "10:00-22:00", signedIn: true, signedAt: "10:25" },
  { id: "m21", name: "凑凑火锅", floor: "4F", location: "4F-415", emoji: "🍲", verified: true, contact: "138-0000-4003", manager: "赵敏", category: "火锅", area: 380, openHours: "11:00-23:00", signedIn: true, signedAt: "10:30" },
  { id: "m22", name: "西贝莜面村", floor: "4F", location: "4F-418", emoji: "🥘", verified: true, contact: "138-0000-4004", manager: "林峰", category: "中餐", area: 220, openHours: "10:00-22:00", signedIn: true, signedAt: "10:35" },
  { id: "m23", name: "满记甜品", floor: "4F", location: "4F-420", emoji: "🍰", verified: true, contact: "138-0000-4005", manager: "何芳", category: "甜品", area: 80, openHours: "10:00-22:00", signedIn: true, signedAt: "10:40" },
  { id: "m24", name: "DQ冰淇淋", floor: "4F", location: "4F-422", emoji: "🍦", verified: true, contact: "138-0000-4006", manager: "何芳", category: "甜品", area: 50, openHours: "10:00-22:00", signedIn: true, signedAt: "10:42" },
  { id: "m25", name: "苹果体验店", floor: "1F", location: "1F-125", emoji: "🍏", verified: true, contact: "138-0000-1009", manager: "刘洋", category: "数码", area: 180, openHours: "10:00-22:00", signedIn: true, signedAt: "10:45" },
  { id: "m26", name: "OPPO体验店", floor: "1F", location: "1F-128", emoji: "📲", verified: true, contact: "138-0000-1010", manager: "刘洋", category: "数码", area: 100, openHours: "10:00-22:00", signedIn: true, signedAt: "10:48" },
  { id: "m27", name: "娇兰佳人", floor: "2F", location: "2F-225", emoji: "💄", verified: true, contact: "138-0000-2006", manager: "郑雪", category: "美妆个护", area: 120, openHours: "10:00-22:00", signedIn: true, signedAt: "10:50" },
  { id: "m28", name: "名创优品2", floor: "2F", location: "2F-228", emoji: "🛍️", verified: false, contact: "138-0000-2007", manager: "李娜", category: "生活百货", area: 200, openHours: "10:00-22:00", signedIn: false },
  { id: "m29", name: "乐高", floor: "2F", location: "2F-230", emoji: "🧩", verified: true, contact: "138-0000-2008", manager: "吴鹏", category: "潮玩", area: 150, openHours: "10:00-22:00", signedIn: false },
  { id: "m30", name: "耐克", floor: "3F", location: "3F-320", emoji: "👟", verified: true, contact: "138-0000-3006", manager: "陈强", category: "运动", area: 300, openHours: "10:00-22:00", signedIn: false },
  { id: "m31", name: "阿迪达斯", floor: "3F", location: "3F-322", emoji: "👟", verified: true, contact: "138-0000-3007", manager: "陈强", category: "运动", area: 280, openHours: "10:00-22:00", signedIn: false },
  { id: "m32", name: "李宁", floor: "3F", location: "3F-325", emoji: "👟", verified: true, contact: "138-0000-3008", manager: "黄俊", category: "运动", area: 240, openHours: "10:00-22:00", signedIn: false },
  { id: "m33", name: "绿茶餐厅", floor: "4F", location: "4F-425", emoji: "🥬", verified: true, contact: "138-0000-4007", manager: "林峰", category: "中餐", area: 300, openHours: "10:00-22:00", signedIn: true, signedAt: "11:05" },
  { id: "m34", name: "外婆家", floor: "4F", location: "4F-428", emoji: "🍚", verified: true, contact: "138-0000-4008", manager: "林峰", category: "中餐", area: 280, openHours: "10:00-22:00", signedIn: false, absent: true },
  { id: "m35", name: "太二酸菜鱼", floor: "4F", location: "4F-430", emoji: "🐟", verified: true, contact: "138-0000-4009", manager: "赵敏", category: "中餐", area: 240, openHours: "10:00-22:00", signedIn: true, signedAt: "11:10" },
];

// 生成某商户某月每日考勤 Mock 数据
export function generateAttendance(
  merchantId: string,
  year: number,
  month: number
): AttendanceRecord[] {
  const days = new Date(year, month, 0).getDate();
  const records: AttendanceRecord[] = [];
  const today = 7; // TODO: 硬编码日期，应改为动态获取 - 当前为 7 号
  for (let d = 1; d <= days; d++) {
    const expected = 8 + (d % 3);
    const absent = d <= today ? (d % 5 === 0 ? 2 : d % 7 === 0 ? 1 : 0) : 0;
    const actual = d <= today ? expected - absent : 0;
    const rate = d <= today ? Math.round((actual / expected) * 100) : 0;
    const status: AttendanceRecord["status"] =
      d <= today ? (absent === 0 ? "normal" : "abnormal") : "normal";
    records.push({
      id: `${merchantId}-${year}-${month}-${d}`,
      merchantId,
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`,
      expected,
      actual,
      absent,
      rate,
      status,
    });
  }
  return records;
}

// 今日点名统计
// 口径：signedIn=已到岗(22), absent=缺勤(5), unsigned=未签到(8)
// 首页"已点名 27" = signedIn + absent = 22 + 5
export const todayStats = {
  total: 35,
  signedIn: 22, // 已到岗
  absent: 5, // 缺勤
  unsigned: 8, // 未签到
  named: 27, // 已点名 = 已到岗 + 缺勤
  rate: 77, // 点名率 = named / total
};
