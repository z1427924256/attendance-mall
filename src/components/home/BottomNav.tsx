import { useNavigate, useLocation } from "react-router-dom";
import { ClipboardList, Store, History } from "lucide-react";

const TABS = [
  { key: "/", label: "点名", icon: ClipboardList },
  { key: "/merchants", label: "商户", icon: Store },
  { key: "/records", label: "记录", icon: History },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  return (
    <div className="flex items-stretch justify-around border-t border-[#eee] bg-card px-2 py-2">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active =
          key === "/" ? current === "/" : current.startsWith(key);
        return (
          <button
            key={key}
            onClick={() => navigate(key)}
            className="flex flex-1 flex-col items-center gap-0.5 py-1"
          >
            <Icon
              size={20}
              className={active ? "text-primary" : "text-muted"}
              strokeWidth={active ? 2.5 : 2}
            />
            <span
              className={`text-[11px] ${
                active ? "font-semibold text-primary" : "text-muted"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
