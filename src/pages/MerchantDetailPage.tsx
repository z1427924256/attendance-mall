import { useNavigate, useParams } from "react-router-dom";
import { useRollCallStore } from "@/store/useRollCallStore";
import { useAdminStore } from "@/store/useAdminStore";
import { exportCsv } from "@/utils/exportCsv";
import {
  ArrowLeft,
  Download,
} from "lucide-react";
import { useState, useMemo } from "react";
import dayjs from "dayjs";

// 每日考勤记录
interface DayAtt {
  date: string;
  weekday: string;
  status: "signedIn" | "absent";
  time?: string; // 签到时间
}

const STATUS_STYLE = {
  signedIn: { bg: "#F0FDF4", text: "#22C55E", label: "已到岗" },
  absent: { bg: "#FEF2F2", text: "#EF4444", label: "缺勤" },
};

const avatarText = (name: string) => name.slice(0, 2);
const AVATAR_COLOR = "#E53E3E";

type Period = "today" | "week" | "month";

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
];

// 日期格式转换：YYYY-MM-DD → "M月D日"
const WEEKDAY_MAP = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function formatDateCN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getWeekdayCN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return WEEKDAY_MAP[d.getDay()];
}

const PERIOD_LABEL: Record<Period, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
};

export default function MerchantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { merchants, updateMerchant } = useRollCallStore();
  const { records } = useAdminStore();
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [period, setPeriod] = useState<Period>("week");

  const merchant = merchants.find((m) => m.id === id);

  // 按商户过滤考勤记录
  const merchantRecords = useMemo(
    () => records.filter((r) => r.merchantId === id),
    [records, id]
  );

  // 基准日期
  const BASE_DATE = dayjs().format("YYYY-MM-DD");

  // 按周期过滤并计算考勤数据
  const periodData = useMemo(() => {
    const base = new Date(BASE_DATE + "T00:00:00");

    const filterByPeriod = (p: Period) => {
      if (p === "today") {
        return merchantRecords.filter((r) => r.date === BASE_DATE);
      }
      const days = p === "week" ? 7 : 30;
      const start = new Date(base);
      start.setDate(start.getDate() - (days - 1));
      const startStr = start.toISOString().slice(0, 10);
      return merchantRecords.filter((r) => r.date >= startStr && r.date <= BASE_DATE);
    };

    const calcStats = (
      filtered: typeof merchantRecords
    ): { total: number; present: number; absent: number; rate: number; days: DayAtt[] } => {
      // 只统计 signedIn 和 absent 的记录（排除 unsigned）
      const active = filtered.filter(
        (r) => r.status === "signedIn" || r.status === "absent"
      );
      const total = active.length;
      const present = active.filter((r) => r.status === "signedIn").length;
      const absent = active.filter((r) => r.status === "absent").length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      // 按日期降序排列，映射为 DayAtt
      const days: DayAtt[] = active
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => ({
          date: formatDateCN(r.date),
          weekday: getWeekdayCN(r.date),
          status: r.status === "signedIn" ? "signedIn" : "absent",
          time: r.signedAt,
          isToday: r.date === BASE_DATE,
        }));

      return { total, present, absent, rate, days };
    };

    return {
      today: calcStats(filterByPeriod("today")),
      week: calcStats(filterByPeriod("week")),
      month: calcStats(filterByPeriod("month")),
    };
  }, [merchantRecords, BASE_DATE]);

  // 缺勤汇总：从 month 数据中提取 absent 日期
  const absentDates = useMemo(
    () => periodData.month.days.filter((d) => d.status === "absent").map((d) => d.date),
    [periodData.month.days]
  );

  if (!merchant) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        商户不存在
      </div>
    );
  }

  const status = merchant.signedIn
    ? "signedIn"
    : merchant.absent
    ? "absent"
    : "unsigned";
  const statusLabel =
    status === "signedIn" ? "已到岗" : status === "absent" ? "缺勤" : "未签到";

  const data = periodData[period];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const handleExport = () => {
    const rows = data.days.map((d) => ({
      商户名称: merchant.name,
      日期: d.date,
      星期: d.weekday,
      状态: d.status === "signedIn" ? "已到岗" : "缺勤",
      签到时间: d.time || "-",
    }));
    exportCsv(rows, `${merchant.name}_${PERIOD_LABEL[period]}考勤`);
    showToast(`已导出 ${merchant.name} ${PERIOD_LABEL[period]}考勤`);
  };

  return (
    <div className="relative pb-8 bg-[#F5F5F5]">
      {/* 绿色头部渐变 + 居中大圆头像 */}
      <div className="bg-gradient-to-b from-[#22C55E] via-[#16A34A] to-[#15803D] px-4 pt-4 pb-12">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/merchants")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white active:scale-95"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <h1 className="text-base font-bold text-white">商户详情</h1>
          <div className="w-8" />
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="relative">
            {merchant.avatar ? (
              <img
                src={merchant.avatar}
                alt={merchant.name}
                className="h-20 w-20 rounded-full object-cover shadow-lg ring-4 ring-white/30"
              />
            ) : (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg ring-4 ring-white/30"
                style={{ backgroundColor: AVATAR_COLOR }}
              >
                {avatarText(merchant.name)}
              </div>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold text-white">{merchant.name}</h2>
          <p className="mt-1 text-sm text-white/80">
            {merchant.floor} · {merchant.location}
          </p>
          <span className="mt-2.5 rounded-full bg-white/25 px-3 py-0.5 text-xs font-medium text-white">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* 下方卡片区域 */}
      <div className="flex flex-col gap-2 px-4">
      {/* 模块1：每日考勤卡（上浮叠在绿色头部上） */}
      <div className="-mt-6 rounded-2xl bg-white p-4 shadow-sm">
        {/* 标题行 + 导出按钮 */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">考勤明细</h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#15803D] active:scale-95"
          >
            <Download size={12} />
            导出{PERIOD_LABEL[period]}考勤
          </button>
        </div>

        {/* 周期切换 Tab */}
        <div className="mt-3 flex rounded-lg bg-gray-100 p-1">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                period === t.key
                  ? "bg-white text-[#16A34A] shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 每日列表 */}
        <div className="mt-3 space-y-2">
          {data.days.map((d) => {
            const s = STATUS_STYLE[d.status];
            return (
              <div
                key={d.date}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {d.date}
                  </span>
                  <span className="text-xs text-gray-400">{d.weekday}</span>
                  {d.time && (
                    <span className="text-xs text-gray-400">{d.time}</span>
                  )}
                </div>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: s.bg, color: s.text }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: s.text }}
                  />
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 模块2：考勤统计 4 宫格卡（按周期） */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">考勤统计</h2>
          <span className="text-xs text-gray-400">{PERIOD_LABEL[period]}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 rounded-xl bg-gray-50 p-3">
          <div className="text-center">
            <p className="text-xs text-gray-400">应签到</p>
            <p className="mt-1 text-lg font-bold text-gray-700">
              {data.total}
              <span className="text-xs font-normal text-gray-400">天</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">实际到岗</p>
            <p className="mt-1 text-lg font-bold text-[#22C55E]">
              {data.present}
              <span className="text-xs font-normal text-gray-400">天</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">缺勤</p>
            <p className="mt-1 text-lg font-bold text-[#EF4444]">
              {data.absent}
              <span className="text-xs font-normal text-gray-400">天</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">考勤率</p>
            <p className="mt-1 text-lg font-bold text-[#3B82F6]">
              {data.rate}
              <span className="text-xs font-normal text-gray-400">%</span>
            </p>
          </div>
        </div>
      </div>

      {/* 模块3：缺勤记录汇总卡 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">缺勤记录汇总</h2>
        <div className="flex flex-wrap gap-2">
          {absentDates.length > 0 ? (
            absentDates.map((d) => (
              <span
                key={d}
                className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-[#EF4444]"
              >
                {d}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">暂无缺勤记录</span>
          )}
        </div>
      </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 top-1/2 z-[60] flex -translate-y-1/2 justify-center px-4">
          <div className="rounded-xl bg-black/85 px-4 py-3 text-center text-[12px] text-white shadow-lg">
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}
