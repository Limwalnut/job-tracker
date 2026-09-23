import { requestJson, requestVoid } from './client';
import type {
  ApplicationStatus,
  ApplicationStatusHistory,
  ApplicationScope,
  ApplicationSort,
  CreateApplicationRequest,
  JobApplication,
  PagedApplicationsResponse,
  UpdateApplicationRequest,
} from '../types/application';

const path = '/applications';

export function getApplications(signal?: AbortSignal): Promise<JobApplication[]> {
  return requestJson<JobApplication[]>(path, { signal });
}

export function getPagedApplications(options: {
  page: number;
  pageSize: number;
  scope: ApplicationScope;
  status: ApplicationStatus | null;
  search: string;
  sort: ApplicationSort;
  signal?: AbortSignal;
}): Promise<PagedApplicationsResponse> {
  const query = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
    scope: options.scope,
    sort: options.sort,
  });
  if (options.status) query.set('status', options.status);
  if (options.search) query.set('search', options.search);

  return requestJson<PagedApplicationsResponse>(`${path}/paged?${query}`, {
    signal: options.signal,
  });
}

export function getApplication(id: number, signal?: AbortSignal): Promise<JobApplication> {
  return requestJson<JobApplication>(`${path}/${id}`, { signal });
}

export function createApplication(request: CreateApplicationRequest): Promise<JobApplication> {
  return requestJson<JobApplication>(path, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export function updateApplication(id: number, request: UpdateApplicationRequest): Promise<void> {
  return requestVoid(`${path}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

export function updateApplicationStatus(id: number, status: ApplicationStatus): Promise<void> {
  return requestVoid(`${path}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getApplicationTimeline(
  id: number,
  signal?: AbortSignal,
): Promise<ApplicationStatusHistory[]> {
  return requestJson<ApplicationStatusHistory[]>(`${path}/${id}/timeline`, { signal });
}

export function undoLatestApplicationStatus(id: number): Promise<void> {
  return requestVoid(`${path}/${id}/timeline/undo`, { method: 'POST' });
}

export function deleteApplication(id: number): Promise<void> {
  return requestVoid(`${path}/${id}`, { method: 'DELETE' });
}
