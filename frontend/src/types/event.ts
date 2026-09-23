export type EventType = 'Interview' | 'Assessment' | 'FollowUp';
export type EventStatus = 'Scheduled' | 'Completed' | 'Cancelled';
export type InterviewOutcome = 'Pending' | 'Passed' | 'Failed';

export interface ScheduleOpenRequest {
  requestId: number;
  applicationId: number;
  type: Extract<EventType, 'Interview' | 'Assessment'>;
  mode: 'create' | 'view';
}

export const interviewStages = [
  'Recruiter screen',
  'Hiring manager',
  'Technical',
  'Panel',
  'Final',
  'Other interview',
] as const;

export interface EventRequest {
  title: string;
  type: EventType;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  timeZone: string;
  locationOrLink: string | null;
  notes: string | null;
  interviewRound: number | null;
  interviewStage: string | null;
  interviewOutcome: InterviewOutcome | null;
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
