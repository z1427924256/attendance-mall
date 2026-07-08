import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const H5Layout = () => import('@/layout/H5Layout.vue');
const AdminLayout = () => import('@/layout/AdminLayout.vue');

const routes: RouteRecordRaw[] = [
  // ===== H5 商户端 =====
  {
    path: '/',
    component: H5Layout,
    children: [
      { path: '', name: 'Home', component: () => import('@/views/h5/RollCallHome.vue'), meta: { title: '点名首页' } },
      { path: 'merchants', name: 'MerchantList', component: () => import('@/views/h5/MerchantList.vue'), meta: { title: '商户' } },
      { path: 'records', name: 'RecordList', component: () => import('@/views/h5/RecordList.vue'), meta: { title: '记录' } },
      { path: 'merchant/:id', name: 'MerchantDetail', component: () => import('@/views/h5/MerchantDetail.vue'), meta: { title: '商户详情', hideNav: true } },
    ],
  },

  // ===== 管理后台 =====
  {
    path: '/admin/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'AdminDashboard', component: () => import('@/views/dashboard/index.vue'), meta: { title: '仪表盘' } },
      { path: 'dashboard-large', name: 'DashboardLarge', component: () => import('@/views/dashboard/large.vue'), meta: { title: '中控大屏' } },
      { path: 'merchants', name: 'MerchantManage', component: () => import('@/views/merchants/index.vue'), meta: { title: '商户管理' } },
      { path: 'attendance', name: 'AttendanceManage', component: () => import('@/views/attendance/index.vue'), meta: { title: '考勤记录' } },
      { path: 'reports', name: 'Reports', component: () => import('@/views/reports/index.vue'), meta: { title: '报表统计' } },
      { path: 'rules', name: 'RuleConfig', component: () => import('@/views/rules/index.vue'), meta: { title: '点名规则' } },
      { path: 'backup', name: 'BackupRestore', component: () => import('@/views/backup/index.vue'), meta: { title: '备份与恢复' } },
      { path: 'bulk-import', name: 'BulkImport', component: () => import('@/views/bulk-import/index.vue'), meta: { title: '批量运维' } },
      { path: 'audit-logs', name: 'AuditLogs', component: () => import('@/views/audit-logs/index.vue'), meta: { title: '审计日志' } },
      { path: 'structure', name: 'StructureManage', component: () => import('@/views/structure/index.vue'), meta: { title: '架构管理' } },
      { path: 'exceptions', name: 'ExceptionLedger', component: () => import('@/views/exceptions/index.vue'), meta: { title: '异常台账' } },
      { path: 'analysis', name: 'Analysis', component: () => import('@/views/analysis/index.vue'), meta: { title: '深度分析' } },
      { path: 'ratings', name: 'Ratings', component: () => import('@/views/ratings/index.vue'), meta: { title: '商户评级' } },
      { path: 'auto-reports', name: 'AutoReports', component: () => import('@/views/auto-reports/index.vue'), meta: { title: '自动报告' } },
      { path: 'alert-rules', name: 'AlertRules', component: () => import('@/views/alert-rules/index.vue'), meta: { title: '智能预警' } },
      { path: 'announcements', name: 'Announcements', component: () => import('@/views/announcements/index.vue'), meta: { title: '公告管理' } },
      { path: 'system-config', name: 'SystemConfig', component: () => import('@/views/system-config/index.vue'), meta: { title: '系统配置' } },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// 鉴权守卫
router.beforeEach((to, _from, next) => {
  const isAuthed = localStorage.getItem('admin_auth') === '1';
  if (to.meta.requiresAuth && !isAuthed) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.name === 'Login' && isAuthed) {
    next({ name: 'AdminDashboard' });
  } else {
    next();
  }
});

router.afterEach((to) => {
  const title = (to.meta.title as string) || '';
  document.title = title ? `${title} - 商场考勤管理系统` : '商场考勤管理系统';
});

export default router;
