import { requestJson } from './client';

export interface InterviewPreparationAdvice {
  applicationId: number | null;
  summary: string;
  preparationPlan: string[];
  practiceQuestions: string[];
  suggestedChecklistItems: Array<{
    title: string;
    dueDate: string | null;
  }>;
}

export interface InterviewPreparationResult {
  advice: InterviewPreparationAdvice | null;
  completed: boolean;
  stopReason: string;
}

export function generateInterviewPreparation(applicationId: number) {
  return requestJson<InterviewPreparationResult>(`/applications/${applicationId}/interview-preparation`, {
    method: 'POST',
  });
}
