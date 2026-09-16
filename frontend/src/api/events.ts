import { requestJson, requestVoid } from './client';
import type { ApplicationEvent, EventRequest, EventStatus } from '../types/event';

export function getApplicationEvents(id: number, signal?: AbortSignal) {
  return requestJson<ApplicationEvent[]>(`/applications/${id}/events`, { signal });
}
export function getEvents(from: string, to: string, includeCancelled: boolean, signal?: AbortSignal) {
  const query = new URLSearchParams({ from, to, includeCancelled: String(includeCancelled) });
  return requestJson<ApplicationEvent[]>(`/events?${query}`, { signal });
}
export function createEvent(id: number, data: EventRequest) {
  return requestJson<ApplicationEvent>(`/applications/${id}/events`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateEvent(id: number, data: EventRequest & { status: EventStatus }) {
  return requestVoid(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteEvent(id: number) {
  return requestVoid(`/events/${id}`, { method: 'DELETE' });
}
