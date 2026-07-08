// Frontend API client - communicates with Cloudflare Workers backend
import type { Merchant } from "@/data/mockData";
import type { AttendanceRecord, RollCallRule } from "@/store/useAdminStore";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===== Merchants =====

export function fetchMerchants(): Promise<Merchant[]> {
  return request<Merchant[]>("/merchants");
}
export function createMerchant(data: Omit<Merchant, "id">): Promise<Merchant> {
  return request<Merchant>("/merchants", { method: "POST", body: JSON.stringify(data) });
}
export function updateMerchant(id: string, data: Partial<Merchant>): Promise<void> {
  return request("/merchants/" + id, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteMerchant(id: string): Promise<void> {
  return request("/merchants/" + id, { method: "DELETE" });
}

// ===== Attendance Records =====

export interface RecordFilters {
  date?: string;
  merchantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}
export function fetchRecords(filters?: RecordFilters): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.date) params.set("date", filters.date);
    if (filters.merchantId) params.set("merchantId", filters.merchantId);
    if (filters.status) params.set("status", filters.status);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
  }
  const qs = params.toString();
  return request<AttendanceRecord[]>(`/records${qs ? "?" + qs : ""}`);
}
export function updateRecord(
  id: string,
  data: Partial<Pick<AttendanceRecord, "status" | "signedAt" | "operator" | "remark">>
): Promise<void> {
  return request("/records/" + id, { method: "PUT", body: JSON.stringify(data) });
}
export function batchSignRecords(ids: string[], operator: string): Promise<void> {
  return request("/records/batch-sign", { method: "POST", body: JSON.stringify({ ids, operator }) });
}

// ===== Rules =====
export function fetchRules(): Promise<RollCallRule> {
  return request<RollCallRule>("/rules");
}
export function updateRules(data: Partial<RollCallRule>): Promise<void> {
  return request("/rules", { method: "PUT", body: JSON.stringify(data) });
}

// ===== P0-1: Backup & Restore =====
export async function exportBackup(format: "json" | "sql"): Promise<Blob> {
  const res = await fetch(`${BASE}/backup?format=${format}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
export function restoreBackup(data: Record<string, unknown[]>): Promise<{ success: boolean; message: string }> {
  return request("/backup", { method: "POST", body: JSON.stringify(data) });
}

// ===== P0-2: Bulk Import =====
export interface ImportResult {
  success: boolean;
  successCount: number;
  failCount: number;
  failReasons: string[];
}
export function bulkImportMerchants(merchants: Record<string, unknown>[]): Promise<ImportResult> {
  return request("/bulk-import", { method: "POST", body: JSON.stringify({ merchants }) });
}
export function batchUpdateMerchants(ids: string[], patch: Record<string, unknown>, action: "update" | "delete"): Promise<{ success: boolean; count: number }> {
  return request("/records/batch-update", { method: "POST", body: JSON.stringify({ ids, patch, action }) });
}
export interface ImportLog {
  id: string;
  type: string;
  total: number;
  successCount: number;
  failCount: number;
  failReasons: string[];
  operator: string;
  createdAt: string;
}
export function fetchImportLogs(): Promise<ImportLog[]> {
  return request("/import-logs");
}

// ===== P0-3: Audit Logs =====
export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  user?: string;
  module?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}
export interface AuditLogResponse {
  list: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AuditLog {
  id: string;
  user: string;
  operator: string;
  action: string;
  module: string;
  targetType: string;
  targetId: string;
  beforeData: string;
  afterData: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}
export function fetchAuditLogs(filters?: AuditLogFilters): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.user) params.set("user", filters.user);
    if (filters.module) params.set("module", filters.module);
    if (filters.action) params.set("action", filters.action);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  }
  const qs = params.toString();
  return request(`/audit-logs${qs ? "?" + qs : ""}`);
}

// ===== P1-1: Floors / Areas / Categories =====
export interface StructureItem {
  id: string;
  name: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  floorId?: string;
}
export function fetchFloors(): Promise<StructureItem[]> {
  return request("/floors");
}
export function createFloor(data: Partial<StructureItem>): Promise<{ success: boolean; id: string }> {
  return request("/floors", { method: "POST", body: JSON.stringify(data) });
}
export function updateFloor(id: string, data: Partial<StructureItem>): Promise<void> {
  return request(`/floors/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteFloor(id: string): Promise<void> {
  return request(`/floors/${id}`, { method: "DELETE" });
}
export function fetchAreas(): Promise<StructureItem[]> {
  return request("/areas");
}
export function createArea(data: Partial<StructureItem>): Promise<{ success: boolean; id: string }> {
  return request("/areas", { method: "POST", body: JSON.stringify(data) });
}
export function updateArea(id: string, data: Partial<StructureItem>): Promise<void> {
  return request(`/areas/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteArea(id: string): Promise<void> {
  return request(`/areas/${id}`, { method: "DELETE" });
}
export function fetchCategories(): Promise<StructureItem[]> {
  return request("/categories");
}
export function createCategory(data: Partial<StructureItem>): Promise<{ success: boolean; id: string }> {
  return request("/categories", { method: "POST", body: JSON.stringify(data) });
}
export function updateCategory(id: string, data: Partial<StructureItem>): Promise<void> {
  return request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteCategory(id: string): Promise<void> {
  return request(`/categories/${id}`, { method: "DELETE" });
}

// ===== P1-2: Exception Ledger =====
export interface ExceptionItem {
  id: string;
  date: string;
  merchantId: string;
  merchantName?: string;
  floor?: string;
  location?: string;
  exceptionType: string;
  status: string;
  remark: string;
  handler: string;
  createdAt: string;
  updatedAt: string;
}
export function fetchExceptions(filters?: Record<string, string>): Promise<ExceptionItem[]> {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  return request(`/exceptions${qs ? "?" + qs : ""}`);
}
export function updateException(id: string, data: Partial<ExceptionItem>): Promise<void> {
  return request(`/exceptions/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function generateExceptions(): Promise<{ success: boolean; count: number; date: string }> {
  return request("/exceptions/generate", { method: "POST" });
}

// ===== P2-3: Ratings =====
export interface RatingItem {
  merchantId: string;
  merchantName: string;
  floor: string;
  location: string;
  category: string;
  month: string;
  score: number;
  level: string;
  attendanceRate: number;
  absentCount: number;
  presentCount: number;
  totalDays: number;
}
export function fetchRatings(month?: string): Promise<RatingItem[]> {
  const qs = month ? `?month=${month}` : "";
  return request(`/ratings${qs}`);
}

// ===== P2-5: Alert Rules =====
export interface AlertRule {
  id: string;
  name: string;
  conditionType: string;
  threshold: number;
  enabled: boolean;
  createdAt: string;
}
export function fetchAlertRules(): Promise<AlertRule[]> {
  return request("/alert-rules");
}
export function createAlertRule(data: Partial<AlertRule>): Promise<{ success: boolean; id: string }> {
  return request("/alert-rules", { method: "POST", body: JSON.stringify(data) });
}
export function updateAlertRule(id: string, data: Partial<AlertRule>): Promise<void> {
  return request(`/alert-rules/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteAlertRule(id: string): Promise<void> {
  return request(`/alert-rules/${id}`, { method: "DELETE" });
}
export interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName?: string;
  content: string;
  status: string;
  createdAt: string;
}
export function fetchAlertRecords(): Promise<AlertRecord[]> {
  return request("/alert-records");
}

// ===== P2-6: Announcements =====
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  scope: string | string[];
  pinned: boolean;
  forcePopup: boolean;
  expireAt: string;
  createdAt: string;
}
export function fetchAnnouncements(): Promise<Announcement[]> {
  return request("/announcements");
}
export function createAnnouncement(data: Partial<Announcement>): Promise<{ success: boolean; id: string }> {
  return request("/announcements", { method: "POST", body: JSON.stringify(data) });
}
export function updateAnnouncement(id: string, data: Partial<Announcement>): Promise<void> {
  return request(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteAnnouncement(id: string): Promise<void> {
  return request(`/announcements/${id}`, { method: "DELETE" });
}

// ===== P2-7: System Config =====
export function fetchSystemConfig(): Promise<Record<string, string>> {
  return request("/system-config");
}
export function updateSystemConfig(data: Record<string, string>): Promise<void> {
  return request("/system-config", { method: "PUT", body: JSON.stringify(data) });
}
