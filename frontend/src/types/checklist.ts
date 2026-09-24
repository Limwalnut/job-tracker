export interface ChecklistItem {
  id: number;
  applicationId: number;
  title: string;
  stage: string;
  dueDate: string | null;
  isCompleted: boolean;
  completedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface ChecklistItemRequest {
  title: string;
  stage: string;
  dueDate: string | null;
}
