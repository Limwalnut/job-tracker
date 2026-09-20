export type ApplicationStatus =
  | "Applied"
  | "Screening"
  | "Assessment"
  | "Interviewing"
  | "Offer"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";

export interface JobApplication {
  id: number;
  companyName: string;
  jobTitle: string;
  status: ApplicationStatus;
  appliedDate: string;
  jobDescriptionUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  jobDescription: string | null;
  notes: string | null;
}

export type ApplicationStatusChangeSource = 'System' | 'Manual' | 'Event' | 'Imported';

export interface ApplicationStatusHistory {
  id: number;
  applicationId: number;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
  source: ApplicationStatusChangeSource;
  applicationEventId: number | null;
  isReverted: boolean;
  revertedAt: string | null;
  canUndo: boolean;
}

export interface CreateApplicationRequest {
  companyName: string;
  jobTitle: string;
  appliedDate: string;
  jobDescriptionUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  jobDescription: string | null;
  notes: string | null;
}

export interface UpdateApplicationRequest {
  status: ApplicationStatus;
  companyName: string;
  jobTitle: string;
  appliedDate: string;
  jobDescriptionUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  jobDescription: string | null;
  notes?: string | null;
}

export const applicationStatuses: ApplicationStatus[] = [
  'Applied', 'Screening', 'Assessment', 'Interviewing',
  'Offer', 'Accepted', 'Rejected', 'Withdrawn',
];
