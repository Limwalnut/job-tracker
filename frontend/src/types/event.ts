export type EventType = 'Interview' | 'Assessment' | 'FollowUp';
export type EventStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface EventRequest {
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  timeZone: string;
  locationOrLink: string | null;
  notes: string | null;
  updateApplicationStatus: boolean;
}
export interface ApplicationEvent extends Omit<EventRequest, 'updateApplicationStatus'> {
  id: number;
  applicationId: number;
  companyName: string;
  jobTitle: string;
  status: EventStatus;
  updatedApplicationStatus: boolean;
}
