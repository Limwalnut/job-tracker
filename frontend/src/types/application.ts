export type ApplicationStatus =
  | "Applied"
  | "Screening"
  | "Assessment"
  | "Interviewing"
  | "Offer"
  | "Accepted"
  | "Rejected"
  | "Withdrawn";

export type ApplicationScope = 'active' | 'closed' | 'all';
export type ApplicationSort = 'newest' | 'oldest' | 'company';

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

export interface PagedApplicationsResponse {
  items: JobApplication[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  activeCount: number;
  closedCount: number;
  allCount: number;
  statusCounts: Record<ApplicationStatus, number>;
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
