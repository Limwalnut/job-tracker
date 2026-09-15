import { requestJson, requestVoid } from './client';
import type {
  ApplicationStatus,
  CreateApplicationRequest,
  JobApplication,
  UpdateApplicationRequest,
} from '../types/application';

const path = '/applications';

export function getApplications(signal?: AbortSignal): Promise<JobApplication[]> {
  return requestJson<JobApplication[]>(path, { signal });
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

export function deleteApplication(id: number): Promise<void> {
  return requestVoid(`${path}/${id}`, { method: 'DELETE' });
}
