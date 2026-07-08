import { User, Phone, Tag, Maximize, Clock } from "lucide-react";
import type { Merchant } from "@/data/mockData";

interface Props {
  merchant: Merchant;
}

const FIELDS = [
  { label: "负责人", icon: User, key: "manager" as const },
  { label: "联系电话", icon: Phone, key: "contact" as const },
  { label: "业态分类", icon: Tag, key: "category" as const },
  { label: "店铺面积", icon: Maximize, key: "area" as const },
  { label: "营业时间", icon: Clock, key: "openHours" as const },
];

export default function MerchantInfo({ merchant }: Props) {
  return (
    <div className="mx-gutter mt-3 rounded-card bg-card p-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)]">
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="h-3.5 w-1 rounded-full bg-primary" />
        <h2 className="text-[14px] font-semibold text-ink">基础信息</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {FIELDS.map(({ label, icon: Icon, key }) => (
          <div key={key} className="flex items-center gap-2.5">
            <Icon size={15} className="text-muted shrink-0" />
            <span className="w-16 shrink-0 text-[12px] text-muted">{label}</span>
            <span className="text-[13px] text-ink">
              {key === "area" ? `${merchant[key]}㎡` : merchant[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
