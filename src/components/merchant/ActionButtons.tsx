import { ClipboardList, Pencil, Phone, MoreHorizontal } from "lucide-react";

const ACTIONS = [
  { label: "查看点名", icon: ClipboardList },
  { label: "编辑商户", icon: Pencil },
  { label: "联系商户", icon: Phone },
  { label: "更多操作", icon: MoreHorizontal },
];

export default function ActionButtons() {
  return (
    <div className="mx-gutter -mt-3 grid grid-cols-4 gap-2 rounded-card bg-card p-3 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.1)]">
      {ACTIONS.map(({ label, icon: Icon }) => (
        <button
          key={label}
          className="flex flex-col items-center gap-1.5 py-1 active:scale-95"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light">
            <Icon size={17} className="text-primary" />
          </span>
          <span className="text-[11px] text-ink">{label}</span>
        </button>
      ))}
    </div>
  );
}
