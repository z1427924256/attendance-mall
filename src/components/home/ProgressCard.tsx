import { useMemo } from "react";
import { useAdminStore } from "@/store/useAdminStore";
import dayjs from "dayjs";

const TODAY = dayjs().format("YYYY-MM-DD");

export default function ProgressCard() {
  const { records, merchants } = useAdminStore();

  const stats = useMemo(() => {
    const todayRecords = records.filter((r) => r.date === TODAY);
    const signedIn = todayRecords.filter((r) => r.status === "signedIn").length;
    const absent = todayRecords.filter((r) => r.status === "absent").length;
    const named = signedIn + absent; // 已点名 = 已到岗 + 缺勤
    const rate = merchants.length > 0 ? Math.round((named / merchants.length) * 100) : 0;
    return { named, total: merchants.length, rate };
  }, [records, merchants]);

  const circumference = 2 * Math.PI * 38; // r=38

  return (
    <div className="w-full rounded-card bg-card px-4 py-2.5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)]">
      {/* 标题 */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="h-4 w-1 rounded-full bg-primary" />
        <span className="text-[14px] font-medium text-ink">今日点名进度</span>
      </div>

      {/* 数字 + 环形圈（垂直居中对齐） */}
      <div className="flex items-center justify-between">
        {/* 左：大数字 + 已点名 */}
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className="text-[32px] font-bold text-ink leading-none">
              {stats.named}
            </span>
            <span className="text-[16px] text-muted">/ {stats.total} 戶</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[12px] font-medium text-primary">
              {stats.rate}% 已点名
            </span>
          </div>
        </div>

        {/* 右：环形进度圈 */}
        <div className="relative shrink-0">
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            className="ring-progress"
          >
            <circle
              cx="48"
              cy="48"
              r="38"
              fill="none"
              stroke="#f0f0f0"
              strokeWidth="7"
            />
            <circle
              cx="48"
              cy="48"
              r="38"
              fill="none"
              stroke="#00b578"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - stats.rate / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[18px] font-bold text-primary leading-none">
              {stats.rate}%
            </span>
            <span className="mt-1 text-[10px] text-muted leading-none">
              点名率
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
