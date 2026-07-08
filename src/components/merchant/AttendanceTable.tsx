import { useMemo, useState } from "react";
import { ChevronDown, Download, Calendar } from "lucide-react";
import { generateAttendance } from "@/data/mockData";

interface Props {
  merchantId: string;
  merchantName: string;
}

export default function AttendanceTable({ merchantId, merchantName }: Props) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(7);
  const [monthOpen, setMonthOpen] = useState(false);
  const [toast, setToast] = useState(false);

  const records = useMemo(
    () => generateAttendance(merchantId, year, month),
    [merchantId, year, month]
  );

  const months = useMemo(() => {
    const arr: { y: number; m: number }[] = [];
    for (let y = 2026; y >= 2025; y--) {
      const maxM = y === 2026 ? 7 : 12;
      for (let m = maxM; m >= 1; m--) {
        arr.push({ y, m });
      }
    }
    return arr;
  }, []);

  const handleExport = () => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <div className="mx-gutter mt-3 rounded-card bg-card p-4 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)]">
      {/* 卡片头部行 */}
      <div className="mb-3 flex items-center justify-between">
        {/* 左：月份下拉选择器 */}
        <div className="relative">
          <button
            onClick={() => setMonthOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-base px-2.5 py-1.5 active:scale-95"
          >
            <Calendar size={14} className="text-primary" />
            <span className="text-[13px] font-medium text-ink">
              {year}年{String(month).padStart(2, "0")}月
            </span>
            <ChevronDown
              size={14}
              className={`text-muted transition-transform ${
                monthOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {monthOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-56 w-32 overflow-auto rounded-lg bg-card py-1 shadow-lg no-scrollbar">
              {months.map(({ y, m }) => (
                <button
                  key={`${y}-${m}`}
                  onClick={() => {
                    setYear(y);
                    setMonth(m);
                    setMonthOpen(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-left text-[12px] ${
                    y === year && m === month
                      ? "bg-primary-light font-medium text-primary"
                      : "text-ink"
                  }`}
                >
                  {y}年{String(m).padStart(2, "0")}月
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右：导出本月考勤 */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[12px] font-medium text-white active:scale-95"
        >
          <Download size={13} />
          导出本月考勤
        </button>
      </div>

      {/* 表格 */}
      <div className="overflow-hidden rounded-xl border border-[#eee]">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr className="bg-base text-[11px] text-muted">
              <th className="px-1 py-2 font-medium">日期</th>
              <th className="px-1 py-2 font-medium">应到</th>
              <th className="px-1 py-2 font-medium">实到</th>
              <th className="px-1 py-2 font-medium">缺勤</th>
              <th className="px-1 py-2 font-medium">到岗率</th>
              <th className="px-1 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 14).map((r) => (
              <tr
                key={r.id}
                className="border-t border-[#f2f2f2] text-[11px] text-ink"
              >
                <td className="px-1 py-2">{r.date.slice(5)}</td>
                <td className="px-1 py-2">{r.expected}</td>
                <td className="px-1 py-2">{r.actual}</td>
                <td className="px-1 py-2">{r.absent}</td>
                <td className="px-1 py-2">{r.rate}%</td>
                <td className="px-1 py-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      r.status === "normal"
                        ? "bg-primary-light text-primary"
                        : "bg-warning-light text-warning"
                    }`}
                  >
                    {r.status === "normal" ? "正常" : "异常"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-center text-[10px] text-muted">
        仅展示前 14 天，共 {records.length} 天数据
      </div>

      {/* 导出提示 toast */}
      {toast && (
        <div className="fixed inset-x-0 top-1/2 z-50 flex -translate-y-1/2 justify-center px-gutter">
          <div className="rounded-xl bg-ink/85 px-4 py-3 text-center text-[12px] text-white shadow-lg">
            导出{merchantName}
            <br />
            {year}年{String(month).padStart(2, "0")}月考勤表
          </div>
        </div>
      )}
    </div>
  );
}
