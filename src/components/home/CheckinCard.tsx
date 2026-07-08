import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useRollCallStore, filteredList } from "@/store/useRollCallStore";

export default function CheckinCard() {
  const { merchants, activeFloor, currentIndex } = useRollCallStore();
  const list = filteredList(merchants, activeFloor);

  if (list.length === 0) {
    return (
      <div className="w-full rounded-card bg-card p-8 text-center text-muted">
        当前楼层暂无商户
      </div>
    );
  }

  const merchant = list[currentIndex];
  const statusLabel = merchant.signedIn
    ? "已到岗"
    : merchant.absent
    ? "缺勤"
    : "未签到";

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-card bg-card px-5 pb-5 pt-5 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.1)]">
        {/* 楼层标签 + 商户名（居中） */}
        <div className="flex flex-col items-center gap-1.5" style={{ marginBottom: 28 }}>
          <span className="rounded-md bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
            {merchant.floor}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-merchant font-bold text-ink leading-none">
              {merchant.name}
            </span>
            {merchant.verified && (
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-white">
                <Check size={11} strokeWidth={3.5} />
              </span>
            )}
          </div>
        </div>

        {/* 中心签到大圆 */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {/* 外圈装饰虚线圆环 */}
            <div className="dashed-ring absolute inset-0 -m-2 rounded-full" />
            <div
              className="checkin-gradient flex flex-col items-center justify-center rounded-full text-white"
              style={{ width: 170, height: 170 }}
            >
              <Check size={48} strokeWidth={3.5} className="drop-shadow" />
              <div className="mt-1.5 text-[14px] font-semibold">
                {statusLabel}
              </div>
            </div>
          </div>
        </div>

        {/* 左滑缺勤 / 右滑回退 提示 */}
        <div className="mt-6 flex items-center justify-between text-[11px] text-muted">
          <span className="flex items-center gap-0.5">
            <ChevronLeft size={13} strokeWidth={2.5} />
            左滑缺勤
          </span>
          <span className="flex items-center gap-0.5">
            右滑回退
            <ChevronRight size={13} strokeWidth={2.5} />
          </span>
        </div>

        {/* 分页指示 */}
        <div className="mt-3 text-center text-[11px] text-muted">
          {currentIndex + 1}/{list.length}
        </div>
      </div>
    </div>
  );
}
