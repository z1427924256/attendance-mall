import { FLOORS } from "@/data/mockData";
import { useRollCallStore } from "@/store/useRollCallStore";

export default function FloorTabs() {
  const { activeFloor, setActiveFloor } = useRollCallStore();

  return (
    <div className="w-full rounded-card bg-card p-3 shadow-sm">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        {FLOORS.map((floor) => {
          const active = floor === activeFloor;
          return (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "bg-base text-ink active:bg-base"
              }`}
            >
              {floor}
            </button>
          );
        })}
      </div>
    </div>
  );
}
