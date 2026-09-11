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
  notes: string | null;
}

export interface CreateApplicationRequest {
  companyName: string;
  jobTitle: string;
  appliedDate: string;
  notes: string | null;
}
