import { useAdminStore } from "@/store/useAdminStore";
import dayjs from "dayjs";

const WEEKDAY = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export default function TopBar() {
  const mallName = useAdminStore((s) => s.systemConfig.mallName) || "名创广场";
  const now = dayjs();
  const dateText = `${now.year()}年${now.month() + 1}月${now.date()}日 ${WEEKDAY[now.day()]}`;

  return (
    <div className="flex w-full items-start justify-between pt-4 pb-1">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="text-[15px] font-semibold leading-tight text-ink">
          {dateText}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span>{mallName}</span>
          <span className="text-[#d0d0d0]">|</span>
          <span>{now.format("HH:mm")}</span>
        </div>
      </div>
    </div>
  );
}
