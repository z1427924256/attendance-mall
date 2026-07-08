import { HelpCircle, ChevronRight } from "lucide-react";
import { useAdminStore } from "@/store/useAdminStore";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const TODAY = dayjs().format("YYYY-MM-DD");

export default function StatsBar() {
  const { records, merchants } = useAdminStore();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const todayRecords = records.filter((r) => r.date === TODAY);
    return {
      signedIn: todayRecords.filter((r) => r.status === "signedIn").length,
      absent: todayRecords.filter((r) => r.status === "absent").length,
      unsigned: todayRecords.filter((r) => r.status === "unsigned").length,
    };
  }, [records]);

  return (
    <div className="w-full rounded-card bg-card px-5 py-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)]">
      {/* 标题行：今日统计 + 查看详情 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[14px] font-medium text-ink">今日统计</span>
          <HelpCircle size={13} className="text-muted" />
        </div>
        <button
          onClick={() => navigate("/merchant/m1")}
          className="flex items-center gap-0.5 text-[12px] font-medium text-primary active:scale-95"
        >
          查看详情
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* 数据行 */}
      <div className="mt-3.5 flex items-center gap-2.5">
        <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-light py-2.5">
          <span className="text-[18px] font-bold text-primary leading-none">
            {stats.signedIn}
          </span>
          <span className="text-[11px] text-primary">正常</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-warning-light py-2.5">
          <span className="text-[18px] font-bold text-warning leading-none">
            {stats.absent}
          </span>
          <span className="text-[11px] text-warning">缺勤</span>
        </div>
        <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-base py-2.5">
          <span className="text-[18px] font-bold text-ink leading-none">
            {stats.unsigned}
          </span>
          <span className="text-[11px] text-muted">未点名</span>
        </div>
      </div>
    </div>
  );
}
