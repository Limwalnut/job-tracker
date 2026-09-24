import { requestJson, requestVoid } from './client';
import type { ChecklistItem, ChecklistItemRequest } from '../types/checklist';

export function getChecklistItems(applicationId: number, signal?: AbortSignal) {
  return requestJson<ChecklistItem[]>(`/applications/${applicationId}/checklist`, { signal });
}

export function createChecklistItem(applicationId: number, data: ChecklistItemRequest) {
  return requestJson<ChecklistItem>(`/applications/${applicationId}/checklist`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateChecklistItem(id: number, data: ChecklistItemRequest & { isCompleted: boolean }) {
  return requestVoid(`/checklist/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteChecklistItem(id: number) {
  return requestVoid(`/checklist/${id}`, { method: 'DELETE' });
}
