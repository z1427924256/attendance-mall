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
  EmailConfig,
  ImportLog,
  ImportResult,
  RecordFilters,
} from '@/types';

// 前后端一体部署：同域相对路径
const BASE = '/api';

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

// ===== Email Config =====
export const fetchEmailConfig = () => http.get<unknown, EmailConfig>('/email-config');
export const updateEmailConfig = (data: Partial<EmailConfig>) =>
  http.put<unknown, void>('/email-config', data);
export const testEmailConfig = () =>
  http.post<unknown, { success: boolean; message?: string }>('/email-config/test');

// ===== Qiniu Upload (代理上传，绕过浏览器 CORS) =====
/**
 * 通用上传：通过后端代理转发到七牛（避免浏览器直传时的 CORS 问题）
 * @param file 文件
 * @param prefix key 前缀，如 avatars/ 或 backgrounds/
 */
export const uploadToQiniu = async (
  file: File,
  prefix = ''
): Promise<{ url: string; key: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prefix', prefix);
  const res = await fetch(`${BASE}/qiniu/upload`, {
    method: 'POST',
    body: formData,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { /* 非 JSON */ }
  if (!res.ok || !data) {
    const msg = (data && (data as { error?: string }).error) || `HTTP ${res.status}: ${text.slice(0, 200)}`;
    throw new Error(msg);
  }
  return data as { url: string; key: string };
};

// 便捷封装：头像上传 / 背景图上传
export const uploadAvatar = (file: File) => uploadToQiniu(file, 'avatars/');
export const uploadBackground = (file: File) => uploadToQiniu(file, 'backgrounds/');

// ===== Announcements =====
export const fetchAnnouncements = () => http.get<unknown, Announcement[]>('/announcements');
export const createAnnouncement = (data: Partial<Announcement>) =>
  http.post<unknown, { success: boolean; id: string }>('/announcements', data);
export const updateAnnouncement = (id: string, data: Partial<Announcement>) =>
  http.put<unknown, void>(`/announcements/${id}`, data);
export const deleteAnnouncement = (id: string) =>
  http.delete<unknown, void>(`/announcements/${id}`);

// ===== Structure (Floors / Areas) =====
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
