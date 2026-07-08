import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";
import { ConfigProvider } from "@arco-design/web-react";
import zhCN from "@arco-design/web-react/es/locale/zh-CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import RollCallHome from "@/pages/RollCallHome";
import MerchantPage from "@/pages/MerchantPage";
import RecordPage from "@/pages/RecordPage";
import MerchantDetail from "@/pages/MerchantDetailPage";
import BottomNav from "@/components/home/BottomNav";
import AnnouncementPopup from "@/components/home/AnnouncementPopup";
import AdminLayout from "@/pages/admin/Layout";
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import MerchantManage from "@/pages/admin/MerchantManage";
import AttendanceManage from "@/pages/admin/AttendanceManage";
import Reports from "@/pages/admin/Reports";
import RuleConfig from "@/pages/admin/RuleConfig";
import BackupRestore from "@/pages/admin/BackupRestore";
import BulkImport from "@/pages/admin/BulkImport";
import AuditLogs from "@/pages/admin/AuditLogs";
import StructureManage from "@/pages/admin/StructureManage";
import ExceptionLedger from "@/pages/admin/ExceptionLedger";
import DashboardLarge from "@/pages/admin/DashboardLarge";
import Analysis from "@/pages/admin/Analysis";
import Ratings from "@/pages/admin/Ratings";
import AutoReports from "@/pages/admin/AutoReports";
import AlertRules from "@/pages/admin/AlertRules";
import Announcements from "@/pages/admin/Announcements";
import SystemConfig from "@/pages/admin/SystemConfig";
import { useAdminStore } from "@/store/useAdminStore";
import { useRollCallStore } from "@/store/useRollCallStore";

dayjs.locale("zh-cn");

// H5 商户端容器（375px 居中）
function H5Layout() {
  const location = useLocation();
  const isDetail = location.pathname.startsWith("/merchant/");
  const showNav = !isDetail;

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-base shadow-2xl">
      <div className={isDetail ? "flex-1 overflow-y-auto" : "flex-1 overflow-hidden"}>
        <Routes>
          <Route path="/" element={<RollCallHome />} />
          <Route path="/merchants" element={<MerchantPage />} />
          <Route path="/records" element={<RecordPage />} />
          <Route path="/merchant/:id" element={<MerchantDetail />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
      <AnnouncementPopup />
    </div>
  );
}

// 后台路由守卫
function AdminGuard() {
  const isAuthed = localStorage.getItem("admin_auth") === "1";
  if (!isAuthed) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="merchants" element={<MerchantManage />} />
            <Route path="attendance" element={<AttendanceManage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="rules" element={<RuleConfig />} />
            <Route path="backup" element={<BackupRestore />} />
            <Route path="bulk-import" element={<BulkImport />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="structure" element={<StructureManage />} />
            <Route path="exceptions" element={<ExceptionLedger />} />
            <Route path="dashboard-large" element={<DashboardLarge />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="ratings" element={<Ratings />} />
            <Route path="auto-reports" element={<AutoReports />} />
            <Route path="alert-rules" element={<AlertRules />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="system-config" element={<SystemConfig />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    );
  }

  return <H5Layout />;
}

export default function App() {
  const loadAdmin = useAdminStore((s) => s.loadFromApi);
  const loadRollCall = useRollCallStore((s) => s.loadFromApi);

  useEffect(() => {
    loadAdmin();
    loadRollCall();
  }, [loadAdmin, loadRollCall]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ "--arco-color-primary-6": "#16a34a" } as React.CSSProperties}
    >
      <Router>
        <AppRoutes />
      </Router>
    </ConfigProvider>
  );
}
