import type { ApplicationStatus } from '../types/application';
import { requestJson } from './client';

export interface AdminTrendPoint {
  date: string;
  count: number;
}

export interface AdminStatusCount {
  status: ApplicationStatus;
  count: number;
}

export interface AdminAuditEntry {
  id: number;
  adminUserId: string;
  targetUserId: string | null;
  action: string;
  detail: string | null;
  createdAtUtc: string;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  disabledUsers: number;
  totalApplications: number;
  totalEvents: number;
  newUsers: AdminTrendPoint[];
  applicationStatuses: AdminStatusCount[];
  recentAuditLog: AdminAuditEntry[];
}

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string | null;
  createdAtUtc: string;
  lastSeenAtUtc: string | null;
  disabledAtUtc: string | null;
  hasPassword: boolean;
  googleConnected: boolean;
  applicationCount: number;
  eventCount: number;
}

export interface AdminUsersResponse {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface AdminUserDetail {
  user: AdminUserListItem;
  applicationStatuses: AdminStatusCount[];
}

export function getAdminOverview() {
  return requestJson<AdminOverview>('/admin/overview');
}

export function getAdminUsers(options: {
  page: number;
  pageSize?: number;
  search?: string;
  status?: 'all' | 'active' | 'disabled';
}) {
  const query = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize ?? 20),
    status: options.status ?? 'all',
  });
  if (options.search) query.set('search', options.search);
  return requestJson<AdminUsersResponse>(`/admin/users?${query}`);
}

export function getAdminUser(id: string) {
  return requestJson<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
}

export function updateAdminUserStatus(id: string, disabled: boolean) {
  return requestJson<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ disabled }),
  });
}
