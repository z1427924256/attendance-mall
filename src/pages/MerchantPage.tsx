import { useNavigate } from "react-router-dom";
import { useRollCallStore } from "@/store/useRollCallStore";
import { useAdminStore } from "@/store/useAdminStore";
import type { Merchant } from "@/data/mockData";
import dayjs from "dayjs";
import {
  Check,
  Clock,
  X,
  Home,
  ChevronRight,
} from "lucide-react";

// 状态徽章配置（参考 status-badge.tsx）
const STATUS_BADGE = {
  signedIn: {
    label: "已到岗",
    bg: "bg-green-50",
    text: "text-[#16A34A]",
    border: "border-green-200",
    dot: "#16A34A",
  },
  unsigned: {
    label: "未签到",
    bg: "bg-amber-50",
    text: "text-[#F59E0B]",
    border: "border-amber-200",
    dot: "#F59E0B",
  },
  absent: {
    label: "缺勤",
    bg: "bg-red-50",
    text: "text-[#EF4444]",
    border: "border-red-200",
    dot: "#EF4444",
  },
};

function statusOf(m: Merchant) {
  if (m.signedIn) return "signedIn";
  if (m.absent) return "absent";
  return "unsigned";
}

// 统计卡配置（4 张）
const SUMMARY = [
  {
    key: "signedIn",
    icon: Check,
    iconBg: "bg-[#22C55E]/20",
    iconColor: "#22C55E",
    cardBg: "bg-green-50",
    numColor: "text-[#16A34A]",
    sub: "已到岗",
  },
  {
    key: "unsigned",
    icon: Clock,
    iconBg: "bg-[#F59E0B]/20",
    iconColor: "#F59E0B",
    cardBg: "bg-amber-50",
    numColor: "text-[#D97706]",
    sub: "未签到",
  },
  {
    key: "absent",
    icon: X,
    iconBg: "bg-[#EF4444]/20",
    iconColor: "#EF4444",
    cardBg: "bg-red-50",
    numColor: "text-[#EF4444]",
    sub: "缺勤率",
  },
  {
    key: "total",
    icon: Home,
    iconBg: "bg-[#3B82F6]/20",
    iconColor: "#3B82F6",
    cardBg: "bg-blue-50",
    numColor: "text-[#3B82F6]",
    sub: "总商户",
  },
] as const;

export default function MerchantPage() {
  const navigate = useNavigate();
  const { merchants, activeFloor, setActiveFloor } = useRollCallStore();
  const { records } = useAdminStore();

  const FLOORS = ["全部", "1F", "2F", "3F", "4F"] as const;
  const TODAY = dayjs().format("YYYY-MM-DD");

  const todayRecords = records.filter((r) => r.date === TODAY);
  const todaySignedIn = todayRecords.filter(
    (r) => r.status === "signedIn"
  ).length;
  const todayAbsent = todayRecords.filter(
    (r) => r.status === "absent"
  ).length;
  const todayUnsigned = todayRecords.filter(
    (r) => r.status === "unsigned"
  ).length;
  const total = merchants.length;

  const filtered =
    activeFloor === "全部"
      ? merchants
      : merchants.filter((m) => m.floor === activeFloor);

  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const summaryData: Record<string, { count: number; pct: string }> = {
    signedIn: { count: todaySignedIn, pct: `${pct(todaySignedIn)}%` },
    unsigned: { count: todayUnsigned, pct: `${pct(todayUnsigned)}%` },
    absent: { count: todayAbsent, pct: `${pct(todayAbsent)}%` },
    total: { count: total, pct: "100%" },
  };

  return (
    <div className="flex h-full flex-col bg-base overflow-y-auto no-scrollbar pb-20">
      <div className="flex flex-col gap-2 px-gutter">
      {/* 顶部标题区 */}
      <div className="bg-card rounded-card px-4 pt-4 pb-3">
        <div>
          <h1 className="text-xl font-bold text-ink">商户</h1>
          <p className="mt-0.5 text-xs text-muted">管理商户签到状态及信息</p>
        </div>
      </div>

      {/* 今日概览卡片 */}
      <div className="rounded-card bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">今日概览</span>
          <span className="text-xs text-muted">{dayjs().format("YYYY年M月D日 dddd")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {SUMMARY.map((c) => {
            const d = summaryData[c.key];
            const Icon = c.icon;
            return (
              <div
                key={c.key}
                className={`flex items-center gap-3 rounded-xl ${c.cardBg} p-3`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}
                >
                  <Icon
                    size={20}
                    color={c.iconColor}
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <p className={`text-xl font-bold ${c.numColor}`}>
                    {d.count}
                    <span className="ml-0.5 text-[10px] font-normal text-muted">
                      户
                    </span>
                  </p>
                  <p className={`whitespace-nowrap text-[11px] ${c.numColor}`}>
                    {c.sub} · {d.pct}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 楼层标签 */}
      <div className="rounded-card bg-card p-3 shadow-sm">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {FLOORS.map((f) => {
            const active = f === activeFloor;
            return (
              <button
                key={f}
                onClick={() => setActiveFloor(f)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "bg-base text-ink active:bg-base"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* 商户列表 */}
      <div className="space-y-2.5">
        {filtered.map((m) => {
          const st = STATUS_BADGE[statusOf(m)];
          return (
            <button
              key={m.id}
              onClick={() => navigate(`/merchant/${m.id}`)}
              className="block w-full rounded-2xl bg-card p-3.5 text-left shadow-sm transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base text-xl">
                  {m.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center">
                    <span className="truncate text-sm font-semibold text-ink">
                      {m.name}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted">{m.location}</div>
                </div>
                <span
                  className={`shrink-0 self-center inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${st.bg} ${st.text} ${st.border}`}
                >
                  <span
                    className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: st.dot }}
                  />
                  {st.label}
                </span>
                <ChevronRight size={14} className="shrink-0 text-[#D1D5DB]" />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted">
            当前楼层暂无商户
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
