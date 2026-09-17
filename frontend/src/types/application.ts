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
  jobDescription: string | null;
  notes: string | null;
}

export interface CreateApplicationRequest {
  companyName: string;
  jobTitle: string;
  appliedDate: string;
  jobDescription: string | null;
  notes: string | null;
}

export interface UpdateApplicationRequest {
  status: ApplicationStatus;
  companyName: string;
  jobTitle: string;
  appliedDate: string;
  jobDescription: string | null;
  notes?: string | null;
}

export const applicationStatuses: ApplicationStatus[] = [
  'Applied', 'Screening', 'Assessment', 'Interviewing',
  'Offer', 'Accepted', 'Rejected', 'Withdrawn',
];
