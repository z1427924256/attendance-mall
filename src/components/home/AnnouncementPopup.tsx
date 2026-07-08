import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAdminStore } from "@/store/useAdminStore";

// 公告弹窗组件：H5 前端进入时展示未过期且 force_popup 的公告
export default function AnnouncementPopup() {
  const announcements = useAdminStore((s) => s.announcements);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<null | { title: string; content: string }>(null);
  const [queue, setQueue] = useState<{ title: string; content: string }[]>([]);

  useEffect(() => {
    // 过滤未过期且需要弹窗的公告
    const now = new Date();
    const active = announcements
      .filter((a) => {
        if (!a.forcePopup) return false;
        if (a.expireAt) {
          const expire = new Date(a.expireAt);
          if (now > expire) return false;
        }
        return true;
      })
      .map((a) => ({
        title: a.title,
        content: a.content,
      }));

    if (active.length > 0) {
      // 检查是否已看过这些公告（用 localStorage 记录）
      const seen = JSON.parse(localStorage.getItem("seen_announcements") || "[]");
      const unseen = active.filter(
        (a) => !seen.includes(a.title)
      );
      if (unseen.length > 0) {
        setQueue(unseen);
        setCurrent(unseen[0]);
        setVisible(true);
      }
    }
  }, [announcements]);

  const handleClose = () => {
    if (current) {
      const seen = JSON.parse(localStorage.getItem("seen_announcements") || "[]");
      if (!seen.includes(current.title)) {
        seen.push(current.title);
        localStorage.setItem("seen_announcements", JSON.stringify(seen));
      }
    }
    const nextIdx = queue.findIndex((a) => a.title === current?.title) + 1;
    if (nextIdx < queue.length) {
      setCurrent(queue[nextIdx]);
    } else {
      setVisible(false);
      setCurrent(null);
    }
  };

  if (!visible || !current) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-8">
      <div className="w-full max-w-[320px] rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-[#ff9500] bg-[#ff9500]/10 px-2 py-0.5 rounded">
            📢 公告通知
          </span>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 active:scale-95"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>
        <h3 className="text-[16px] font-bold text-[#1a1a1a] mb-2">
          {current.title}
        </h3>
        <p className="text-[13px] text-[#666666] leading-relaxed whitespace-pre-wrap">
          {current.content}
        </p>
        <button
          onClick={handleClose}
          className="mt-4 w-full rounded-lg bg-[#16A34A] py-2.5 text-[14px] font-medium text-white active:scale-[0.98] transition-transform"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
