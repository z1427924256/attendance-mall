import axios, { type AxiosInstance } from 'axios';
import { Capacitor } from '@capacitor/core';
import type {
  Merchant,
  AttendanceRecord,
  RollCallRule,
  SystemConfig,
  Announcement,
  StructureItem,
  ExceptionItem,
  RatingItem,
  AlertRule,
  AlertRecord,
  AuditLog,
  AuditLogFilters,
  AuditLogResponse,
  ImportLog,
  ImportResult,
  RecordFilters,
} from '@/types';

// Capacitor 原生 APP 环境下使用线上 URL，浏览器环境用相对路径
const BASE = Capacitor.isNativePlatform()
  ? 'https://attendance-rollcall.pages.dev/api'
  : '/api';

const http: AxiosInstance = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 响应拦截：统一错误处理
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || `HTTP ${err.response?.status}`;
    return Promise.reject(new Error(msg));
  }
);

// ===== Merchants =====
export const fetchMerchants = () => http.get<unknown, Merchant[]>('/merchants');
export const createMerchant = (data: Omit<Merchant, 'id'>) =>
  http.post<unknown, Merchant>('/merchants', data);
export const updateMerchant = (id: string, data: Partial<Merchant>) =>
  http.put<unknown, void>(`/merchants/${id}`, data);
export const deleteMerchant = (id: string) => http.delete<unknown, void>(`/merchants/${id}`);

// ===== Records =====
export const fetchRecords = (filters?: RecordFilters) => {
  const params: Record<string, string> = {};
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params[k] = String(v);
    });
  }
  return http.get<unknown, AttendanceRecord[]>('/records', { params });
};
export const updateRecord = (
  id: string,
  data: Partial<Pick<AttendanceRecord, 'status' | 'signedAt' | 'operator' | 'remark'>>
) => http.put<unknown, void>(`/records/${id}`, data);
export const batchSignRecords = (ids: string[], operator: string) =>
  http.post<unknown, void>('/records/batch-sign', { ids, operator });
export const batchUpdateMerchants = (
  ids: string[],
  patch: Record<string, unknown>,
  action: 'update' | 'delete'
) => http.post<unknown, { success: boolean; count: number }>('/records/batch-update', { ids, patch, action });

// ===== Rules =====
export const fetchRules = () => http.get<unknown, RollCallRule>('/rules');
export const updateRules = (data: Partial<RollCallRule>) =>
  http.put<unknown, void>('/rules', data);

// ===== System Config =====
export const fetchSystemConfig = () => http.get<unknown, SystemConfig>('/system-config');
export const updateSystemConfig = (data: SystemConfig) =>
  http.put<unknown, void>('/system-config', data);

// ===== Announcements =====
export const fetchAnnouncements = () => http.get<unknown, Announcement[]>('/announcements');
export const createAnnouncement = (data: Partial<Announcement>) =>
  http.post<unknown, { success: boolean; id: string }>('/announcements', data);
export const updateAnnouncement = (id: string, data: Partial<Announcement>) =>
  http.put<unknown, void>(`/announcements/${id}`, data);
export const deleteAnnouncement = (id: string) =>
  http.delete<unknown, void>(`/announcements/${id}`);

// ===== Structure (Floors / Areas / Categories) =====
export const fetchFloors = () => http.get<unknown, StructureItem[]>('/floors');
export const createFloor = (data: Partial<StructureItem>) =>
  http.post<unknown, { success: boolean; id: string }>('/floors', data);
export const updateFloor = (id: string, data: Partial<StructureItem>) =>
  http.put<unknown, void>(`/floors/${id}`, data);
export const deleteFloor = (id: string) => http.delete<unknown, void>(`/floors/${id}`);

export const fetchAreas = () => http.get<unknown, StructureItem[]>('/areas');
export const createArea = (data: Partial<StructureItem>) =>
  http.post<unknown, { success: boolean; id: string }>('/areas', data);
export const updateArea = (id: string, data: Partial<StructureItem>) =>
  http.put<unknown, void>(`/areas/${id}`, data);
export const deleteArea = (id: string) => http.delete<unknown, void>(`/areas/${id}`);

export const fetchCategories = () => http.get<unknown, StructureItem[]>('/categories');
export const createCategory = (data: Partial<StructureItem>) =>
  http.post<unknown, { success: boolean; id: string }>('/categories', data);
export const updateCategory = (id: string, data: Partial<StructureItem>) =>
  http.put<unknown, void>(`/categories/${id}`, data);
export const deleteCategory = (id: string) => http.delete<unknown, void>(`/categories/${id}`);

// ===== Exceptions =====
export const fetchExceptions = (filters?: Record<string, string>) =>
  http.get<unknown, ExceptionItem[]>('/exceptions', { params: filters });
export const updateException = (id: string, data: Partial<ExceptionItem>) =>
  http.put<unknown, void>(`/exceptions/${id}`, data);
export const generateExceptions = () =>
  http.post<unknown, { success: boolean; count: number; date: string }>('/exceptions/generate');

// ===== Ratings =====
export const fetchRatings = (month?: string) =>
  http.get<unknown, RatingItem[]>('/ratings', { params: month ? { month } : {} });

// ===== Alert Rules =====
export const fetchAlertRules = () => http.get<unknown, AlertRule[]>('/alert-rules');
export const createAlertRule = (data: Partial<AlertRule>) =>
  http.post<unknown, { success: boolean; id: string }>('/alert-rules', data);
export const updateAlertRule = (id: string, data: Partial<AlertRule>) =>
  http.put<unknown, void>(`/alert-rules/${id}`, data);
export const deleteAlertRule = (id: string) => http.delete<unknown, void>(`/alert-rules/${id}`);
export const fetchAlertRecords = () => http.get<unknown, AlertRecord[]>('/alert-records');

// ===== Audit Logs =====
export const fetchAuditLogs = (filters?: AuditLogFilters) =>
  http.get<unknown, AuditLogResponse>('/audit-logs', { params: filters });

// ===== Backup & Restore =====
export const exportBackup = async (format: 'json' | 'sql'): Promise<Blob> => {
  const res = await fetch(`${BASE}/backup?format=${format}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
};
export const restoreBackup = (data: Record<string, unknown[]>) =>
  http.post<unknown, { success: boolean; message: string }>('/backup', data);

// ===== Bulk Import =====
export const bulkImportMerchants = (merchants: Record<string, unknown>[]) =>
  http.post<unknown, ImportResult>('/bulk-import', { merchants });
export const fetchImportLogs = () => http.get<unknown, ImportLog[]>('/import-logs');

export { BASE };
