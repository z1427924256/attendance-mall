import { ChevronLeft, Check, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Merchant } from "@/data/mockData";

interface Props {
  merchant: Merchant;
}

export default function MerchantHeader({ merchant }: Props) {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#00d68f] via-primary to-primary-dark px-gutter pb-5 pt-3 text-white">
      {/* 顶部操作行 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 active:scale-95"
          aria-label="返回"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <span className="text-[14px] font-medium">商户详情</span>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 active:scale-95"
          aria-label="通知"
        >
          <Bell size={16} />
        </button>
      </div>

      {/* 商户名 + 认证 */}
      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-merchant font-bold leading-none">{merchant.name}</h1>
        {merchant.verified && (
          <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-white text-primary">
            <Check size={12} strokeWidth={3.5} />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[12px] opacity-90">
        <span>{merchant.category}</span>
        <span className="opacity-60">·</span>
        <span>{merchant.floor}</span>
        <span className="opacity-60">·</span>
        <span>{merchant.openHours}</span>
      </div>
    </div>
  );
}
