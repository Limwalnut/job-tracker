import type { ApplicationEvent } from '../types/event';

export function eventDescriptor(event: ApplicationEvent) {
  if (event.type !== 'Interview') return `${event.type} · ${event.status}`;

  const result = event.interviewOutcome && event.interviewOutcome !== 'Pending'
    ? event.interviewOutcome
    : event.status;

  return [
    event.interviewRound ? `Round ${event.interviewRound}` : 'Interview',
    event.interviewStage,
    result,
  ].filter(Boolean).join(' · ');
}
