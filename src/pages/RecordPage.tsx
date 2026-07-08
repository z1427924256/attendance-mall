import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { exportCsv } from "@/utils/exportCsv";
import { useAdminStore } from "@/store/useAdminStore";
import dayjs from "dayjs";

// 历史每日记录数据
interface DayRecord {
  date: string;
  weekday: string;
  isToday?: boolean;
  rate: number;
  normal: number;
  absent: number;
  unsigned: number;
}

type Period = "today" | "week" | "month";

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "today", label: "今日" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
];

const PERIOD_LABEL: Record<Period, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
};

const TODAY = dayjs().format("YYYY-MM-DD");

// 日期从 "YYYY-MM-DD" 转为 "M月D日" 格式
function formatDateCN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 用 getDay() 转为中文星期
const WEEKDAY_CN: Record<number, string> = {
  0: "星期日",
  1: "星期一",
  2: "星期二",
  3: "星期三",
  4: "星期四",
  5: "星期五",
  6: "星期六",
};

function getWeekdayCN(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return WEEKDAY_CN[d.getDay()];
}

// 获取指定周期内的日期列表（按日期字符串）
function getPeriodDates(period: Period): string[] {
  const base = new Date(TODAY + "T00:00:00");
  let days: number;
  if (period === "today") days = 1;
  else if (period === "week") days = 7;
  else days = 30;

  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export default function RecordPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("week");
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const { merchants, records } = useAdminStore();

  // 周期内日期列表
  const periodDates = useMemo(() => getPeriodDates(period), [period]);

  // 各周期概览数据
  const overview = useMemo(() => {
    const periodRecords = records.filter((r) => periodDates.includes(r.date));
    const normal = periodRecords.filter((r) => r.status === "signedIn").length;
    const absent = periodRecords.filter((r) => r.status === "absent").length;
    const unsigned = periodRecords.filter((r) => r.status === "unsigned").length;
    const total = periodRecords.length;
    const rate = total > 0 ? Math.round((normal / total) * 100) : 0;
    return { rate, normal, absent, unsigned };
  }, [records, periodDates]);

  // 各周期每日列表
  const days = useMemo((): DayRecord[] => {
    const result: DayRecord[] = [];
    // 去重日期（periodDates 已按最新在前排列）
    const uniqueDates = [...new Set(periodDates)];
    for (const dateStr of uniqueDates) {
      const dayRecords = records.filter((r) => r.date === dateStr);
      const normal = dayRecords.filter((r) => r.status === "signedIn").length;
      const absent = dayRecords.filter((r) => r.status === "absent").length;
      const unsigned = dayRecords.filter((r) => r.status === "unsigned").length;
      const total = dayRecords.length;
      const rate = total > 0 ? Math.round((normal / total) * 100) : 0;
      result.push({
        date: formatDateCN(dateStr),
        weekday: getWeekdayCN(dateStr),
        isToday: dateStr === TODAY,
        rate,
        normal,
        absent,
        unsigned,
      });
    }
    return result;
  }, [records, periodDates]);

  // 本周考勤榜 Top3（signedIn 次数最多）
  const attendTop3 = useMemo(() => {
    const weekDates = getPeriodDates("week");
    const weekRecords = records.filter((r) => weekDates.includes(r.date));
    // 按 merchantId 聚合 signedIn 次数
    const countMap = new Map<string, number>();
    for (const r of weekRecords) {
      if (r.status === "signedIn") {
        countMap.set(r.merchantId, (countMap.get(r.merchantId) ?? 0) + 1);
      }
    }
    // 排序取前3
    const sorted = [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return sorted.map(([merchantId, count]) => {
      const m = merchants.find((mer) => mer.id === merchantId);
      return {
        id: merchantId,
        name: m?.name ?? merchantId,
        floor: m?.floor ?? "",
        location: m?.location ?? "",
        count,
      };
    });
  }, [records, merchants]);

  // 本周缺勤榜 Top3（absent 次数最多）
  const absentTop3 = useMemo(() => {
    const weekDates = getPeriodDates("week");
    const weekRecords = records.filter((r) => weekDates.includes(r.date));
    const countMap = new Map<string, number>();
    for (const r of weekRecords) {
      if (r.status === "absent") {
        countMap.set(r.merchantId, (countMap.get(r.merchantId) ?? 0) + 1);
      }
    }
    const sorted = [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return sorted.map(([merchantId, count]) => {
      const m = merchants.find((mer) => mer.id === merchantId);
      return {
        id: merchantId,
        name: m?.name ?? merchantId,
        floor: m?.floor ?? "",
        location: m?.location ?? "",
        count,
      };
    });
  }, [records, merchants]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const handleExport = () => {
    const rows = days.map((d) => ({
      日期: d.date,
      星期: d.weekday,
      到岗率: `${d.rate}%`,
      正常户数: d.normal,
      缺勤户数: d.absent,
      未签到户数: d.unsigned,
    }));
    exportCsv(rows, `全商场_${PERIOD_LABEL[period]}考勤报表`);
    showToast(`已导出全商场${PERIOD_LABEL[period]}考勤报表`);
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-base">
      <div className="flex flex-col gap-2 px-gutter pb-4 pt-4">
        {/* 顶部标题区（随滚动） */}
        <div className="pb-1">
          <h1 className="text-[20px] font-bold text-ink">记录</h1>
          <p className="mt-0.5 text-[12px] text-muted">查看历史签到记录与报表</p>
        </div>

        {/* 周期切换 Tab */}
        <div className="flex rounded-lg bg-card p-1 shadow-sm">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-all ${
                period === t.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 概览 4 宫格卡：到岗率 / 已到岗 / 缺勤 / 未签到 */}
        <div className="rounded-card bg-card px-5 py-4 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-medium text-ink">
              {PERIOD_LABEL[period]}考勤概览
            </span>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-white active:scale-95"
            >
              <Download size={11} />
              导出{PERIOD_LABEL[period]}报表
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <div className="flex flex-col items-center justify-center rounded-lg bg-primary-light py-3">
              <span className="text-[18px] font-bold text-primary leading-none">
                {overview.rate}%
              </span>
              <span className="mt-1.5 text-[10px] text-primary">到岗率</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-primary-light py-3">
              <span className="text-[18px] font-bold text-primary leading-none">
                {overview.normal}
              </span>
              <span className="mt-1.5 text-[10px] text-primary">已到岗</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-warning-light py-3">
              <span className="text-[18px] font-bold text-warning leading-none">
                {overview.absent}
              </span>
              <span className="mt-1.5 text-[10px] text-warning">缺勤</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-base py-3">
              <span className="text-[18px] font-bold text-ink leading-none">
                {overview.unsigned}
              </span>
              <span className="mt-1.5 text-[10px] text-muted">未签到</span>
            </div>
          </div>
        </div>

        {/* 榜单左右并排：考勤榜 + 缺勤榜 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 考勤榜单 Top3 */}
          <div className="rounded-card bg-card px-3.5 py-3.5 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.08)]">
            <div className="mb-2.5 flex items-center gap-1">
              <TrendingUp size={13} className="text-primary" />
              <span className="text-[12px] font-semibold text-ink">考勤榜</span>
            </div>
            <div className="space-y-1.5">
              {attendTop3.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/merchant/${m.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg bg-base px-2 py-2 active:scale-[0.98]"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      idx === 0
                        ? "bg-primary text-white"
                        : idx === 1
                        ? "bg-primary/70 text-white"
                        : "bg-primary/50 text-white"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[12px] font-medium text-ink">
                      {m.name}
                    </div>
                    <div className="text-[10px] text-muted">{m.floor}</div>
                  </div>
                  <span className="text-[11px] font-bold text-primary">
                    {m.count}天
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 缺勤榜单 Top3 */}
          <div className="rounded-card bg-card px-3.5 py-3.5 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.08)]">
            <div className="mb-2.5 flex items-center gap-1">
              <TrendingDown size={13} className="text-warning" />
              <span className="text-[12px] font-semibold text-ink">缺勤榜</span>
            </div>
            <div className="space-y-1.5">
              {absentTop3.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/merchant/${m.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg bg-base px-2 py-2 active:scale-[0.98]"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      idx === 0
                        ? "bg-warning text-white"
                        : idx === 1
                        ? "bg-warning/70 text-white"
                        : "bg-warning/50 text-white"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[12px] font-medium text-ink">
                      {m.name}
                    </div>
                    <div className="text-[10px] text-muted">{m.floor}</div>
                  </div>
                  <span className="text-[11px] font-bold text-warning">
                    {m.count}次
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 按日分组记录列表 */}
        <div className="flex flex-col gap-2.5">
          {days.map((d) => (
            <div
              key={d.date}
              className="rounded-card bg-card px-4 py-3.5 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-semibold text-ink">
                    {d.date}
                  </span>
                  <span className="text-[12px] text-muted">{d.weekday}</span>
                  {d.isToday && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-white">
                      今天
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-bold text-primary">
                  {d.rate}%
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-light py-2">
                  <span className="text-[16px] font-bold text-primary leading-none">
                    {d.normal}
                  </span>
                  <span className="text-[11px] text-primary">正常</span>
                </div>
                <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-warning-light py-2">
                  <span className="text-[16px] font-bold text-warning leading-none">
                    {d.absent}
                  </span>
                  <span className="text-[11px] text-warning">缺勤</span>
                </div>
                <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-base py-2">
                  <span className="text-[16px] font-bold text-ink leading-none">
                    {d.unsigned}
                  </span>
                  <span className="text-[11px] text-muted">未签到</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed inset-x-0 top-1/2 z-50 flex -translate-y-1/2 justify-center px-gutter">
          <div className="rounded-xl bg-ink/85 px-4 py-3 text-center text-[12px] text-white shadow-lg">
            {toastMsg}
          </div>
        </div>
      )}
    </div>
  );
}
