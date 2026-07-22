import type { RouteRecordRaw } from 'vue-router';
import {
  IconDashboard,
  IconDesktop,
  IconIdcard,
  IconCalendar,
  IconSortAscending,
  IconSettings,
  IconCloud,
  IconUpload,
  IconInteraction,
  IconApps,
  IconExclamationCircle,
  IconCompass,
  IconTrophy,
  IconFile,
  IconThunderbolt,
  IconNotification,
  IconCode,
  IconPalette,
  IconEmail,
} from '@arco-design/web-vue/es/icon';

export interface MenuItem {
  key: string;
  label: string;
  path: string;
  icon?: Component;
  group?: string;
}

import type { Component } from 'vue';

export const menuItems: MenuItem[] = [
  { key: 'dashboard', label: '仪表盘', path: '/dashboard', icon: IconDashboard, group: '概览' },
  { key: 'dashboard-large', label: '中控大屏', path: '/dashboard-large', icon: IconDesktop, group: '概览' },
  { key: 'merchants', label: '商户管理', path: '/merchants', icon: IconIdcard, group: '业务管理' },
  { key: 'attendance', label: '考勤记录', path: '/attendance', icon: IconCalendar, group: '业务管理' },
  { key: 'exceptions', label: '异常台账', path: '/exceptions', icon: IconExclamationCircle, group: '业务管理' },
  { key: 'analysis', label: '深度分析', path: '/analysis', icon: IconCompass, group: '业务管理' },
  { key: 'ratings', label: '商户评级', path: '/ratings', icon: IconTrophy, group: '业务管理' },
  { key: 'reports', label: '报表统计', path: '/reports', icon: IconSortAscending, group: '业务管理' },
  { key: 'auto-reports', label: '自动报告', path: '/auto-reports', icon: IconFile, group: '业务管理' },
  { key: 'structure', label: '架构管理', path: '/structure', icon: IconApps, group: '系统配置' },
  { key: 'rules', label: '点名规则', path: '/rules', icon: IconSettings, group: '系统配置' },
  { key: 'alert-rules', label: '智能预警', path: '/alert-rules', icon: IconThunderbolt, group: '系统配置' },
  { key: 'announcements', label: '公告管理', path: '/announcements', icon: IconNotification, group: '系统配置' },
  { key: 'system-config', label: '系统配置', path: '/system-config', icon: IconCode, group: '系统配置' },
  { key: 'theme-config', label: '主题配置', path: '/theme-config', icon: IconPalette, group: '系统配置' },
  { key: 'email-config', label: '邮件配置', path: '/email-config', icon: IconEmail, group: '系统配置' },
  { key: 'bulk-import', label: '批量运维', path: '/bulk-import', icon: IconUpload, group: '运维' },
  { key: 'backup', label: '备份与恢复', path: '/backup', icon: IconCloud, group: '运维' },
  { key: 'audit-logs', label: '审计日志', path: '/audit-logs', icon: IconInteraction, group: '运维' },
];

export const menuGroups = ['概览', '业务管理', '系统配置', '运维'];
