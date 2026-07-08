import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Breadcrumb,
  Message,
} from "@arco-design/web-react";
import {
  IconMenuFold,
  IconMenuUnfold,
  IconDashboard,
  IconFile,
  IconCalendar,
  IconCompass,
  IconSettings,
  IconNotification,
  IconLock,
  IconUser,
  IconMenu,
  IconInteraction,
  IconApps,
  IconIdcard,
  IconThunderbolt,
  IconCode,
  IconDesktop,
  IconTrophy,
  IconExclamationCircle,
  IconSortAscending,
  IconUpload,
  IconCloud,
} from "@arco-design/web-react/icon";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/useIsMobile";

const { Sider, Header, Content } = Layout;
const MenuItem = Menu.Item;
const BreadcrumbItem = Breadcrumb.Item;

const menuItemsLabel: Record<string, string> = {
  "/admin/dashboard": "仪表盘",
  "/admin/merchants": "商户管理",
  "/admin/attendance": "考勤记录",
  "/admin/reports": "报表统计",
  "/admin/rules": "点名规则配置",
  "/admin/backup": "全量备份与恢复",
  "/admin/bulk-import": "商户批量运维",
  "/admin/audit-logs": "操作审计日志",
  "/admin/structure": "楼层区域业态管理",
  "/admin/exceptions": "考勤异常整改台账",
  "/admin/dashboard-large": "中控大屏",
  "/admin/analysis": "考勤深度分析",
  "/admin/ratings": "商户考核评级",
  "/admin/auto-reports": "自动报告",
  "/admin/alert-rules": "智能预警规则",
  "/admin/announcements": "公告管理",
  "/admin/system-config": "系统配置",
};

const ALL_MENU = [
  { key: "/admin/dashboard", label: "仪表盘", icon: <IconDashboard /> },
  { key: "/admin/merchants", label: "商户管理", icon: <IconIdcard /> },
  { key: "/admin/attendance", label: "考勤记录", icon: <IconCalendar /> },
  { key: "/admin/reports", label: "报表统计", icon: <IconSortAscending /> },
  { key: "/admin/rules", label: "点名规则", icon: <IconSettings /> },
  { key: "/admin/backup", label: "备份与恢复", icon: <IconCloud /> },
  { key: "/admin/bulk-import", label: "批量运维", icon: <IconUpload /> },
  { key: "/admin/audit-logs", label: "审计日志", icon: <IconInteraction /> },
  { key: "/admin/structure", label: "架构管理", icon: <IconApps /> },
  { key: "/admin/exceptions", label: "异常台账", icon: <IconExclamationCircle /> },
  { key: "/admin/dashboard-large", label: "中控大屏", icon: <IconDesktop /> },
  { key: "/admin/analysis", label: "深度分析", icon: <IconCompass /> },
  { key: "/admin/ratings", label: "商户评级", icon: <IconTrophy /> },
  { key: "/admin/auto-reports", label: "自动报告", icon: <IconFile /> },
  { key: "/admin/alert-rules", label: "智能预警", icon: <IconThunderbolt /> },
  { key: "/admin/announcements", label: "公告管理", icon: <IconNotification /> },
  { key: "/admin/system-config", label: "系统配置", icon: <IconCode /> },
];

export default function AdminLayout() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = "/admin/" + (location.pathname.split("/")[2] || "dashboard");

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    Message.success("已退出登录");
    navigate("/admin/login");
  };

  const handleMenuClick = (key: string) => {
    navigate(key);
    if (isMobile) setMobileOpen(false);
  };

  const currentLabel = menuItemsLabel[selectedKey] ?? "管理后台";

  const menuJsx = (
    <Menu
          selectedKeys={[selectedKey]}
          onClickMenuItem={(key) => handleMenuClick(key)}
          style={{ height: "100%", borderRight: "none" }}
        >
          {ALL_MENU.map((m) => (
            <MenuItem key={m.key} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {m.icon}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</span>
            </MenuItem>
          ))}
        </Menu>
  );

  return (
    <Layout style={{ height: "100vh" }}>
      {/* 桌面端侧边栏 — 使用 Arco 原生 Sider，菜单放在可滚动容器中 */}
      {!isMobile && (
        <Sider
          collapsed={collapsed}
          onCollapse={setCollapsed}
          collapsible
          width={220}
          collapsedWidth={48}
          style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--color-border)" }}
        >
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: collapsed ? 14 : 15,
              borderBottom: "1px solid var(--color-border)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {collapsed ? "考勤" : "商场考勤管理"}
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {menuJsx}
          </div>
        </Sider>
      )}

      {/* 移动端抽屉 */}
      {isMobile && mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              width: 240,
              background: "var(--color-bg-2)",
              zIndex: 1000,
              boxShadow: "2px 0 12px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 15,
                borderBottom: "1px solid var(--color-border)",
                flexShrink: 0,
              }}
            >
              商场考勤管理
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <Menu
                selectedKeys={[selectedKey]}
                onClickMenuItem={(key) => handleMenuClick(key)}
                style={{ borderRight: "none" }}
              >
                {ALL_MENU.map((m) => (
                  <MenuItem key={m.key}>
                    {m.icon}
                    <span>{m.label}</span>
                  </MenuItem>
                ))}
              </Menu>
            </div>
          </div>
        </>
      )}

      <Layout style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <Header
          style={{
            background: "var(--color-bg-2)",
            borderBottom: "1px solid var(--color-border)",
            padding: isMobile ? "0 12px" : "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            height: 48,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {isMobile && (
              <Button
                type="text"
                size="small"
                icon={<IconMenu />}
                onClick={() => setMobileOpen(true)}
              />
            )}
            {!isMobile && (
              <Button
                type="text"
                size="small"
                icon={collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
                onClick={() => setCollapsed(!collapsed)}
              />
            )}
            <Breadcrumb style={{ fontSize: 13, lineHeight: "28px" }}>
              <BreadcrumbItem>后台</BreadcrumbItem>
              <BreadcrumbItem>{currentLabel}</BreadcrumbItem>
            </Breadcrumb>
          </div>
          <Dropdown
            droplist={
              <Menu onClickMenuItem={(key) => key === "logout" && handleLogout()}>
                <MenuItem key="logout">
                  <IconLock style={{ marginRight: 8 }} />
                  退出登录
                </MenuItem>
              </Menu>
            }
            trigger="click"
            position="br"
          >
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar size={28} style={{ background: "rgb(var(--primary-6))" }}>
                <IconUser />
              </Avatar>
              {!isMobile && <span>管理员</span>}
            </div>
          </Dropdown>
        </Header>

        <Content
          style={{
            margin: isMobile ? 8 : 16,
            padding: isMobile ? 12 : 20,
            background: "var(--color-bg-1)",
            borderRadius: 8,
            flex: 1,
            overflow: "auto",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
