import TopBar from "@/components/home/TopBar";
import ProgressCard from "@/components/home/ProgressCard";
import FloorTabs from "@/components/home/FloorTabs";
import CheckinCard from "@/components/home/CheckinCard";
import StatsBar from "@/components/home/StatsBar";

export default function RollCallHome() {
  return (
    <div className="flex h-full flex-col bg-base overflow-y-auto no-scrollbar">
      <div className="mx-auto w-full max-w-[430px] flex flex-col gap-2 px-gutter pb-4">
        {/* 顶部标题天气区 */}
        <TopBar />
        {/* 今日点名进度卡片 */}
        <ProgressCard />
        {/* 楼层筛选标签栏 */}
        <FloorTabs />
        {/* 商户签到卡片 */}
        <CheckinCard />
        {/* 今日统计底部栏 */}
        <StatsBar />
      </div>
    </div>
  );
}
