import { useEffect, useState } from 'react';
import { getApplicationTimeline, undoLatestApplicationStatus } from '../../api/applications';
import { getApplicationEvents } from '../../api/events';
import type { ApplicationStatus, ApplicationStatusHistory, JobApplication } from '../../types/application';
import type { ApplicationEvent } from '../../types/event';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './ApplicationTimeline.module.scss';

interface Props {
  application: JobApplication;
  refreshToken?: number;
  onChanged: () => void;
}

const statusOrder: ApplicationStatus[] = [
  'Applied', 'Screening', 'Assessment', 'Interviewing',
  'Offer', 'Accepted', 'Rejected', 'Withdrawn',
];
const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  day: '2-digit', month: 'short', year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  hour: '2-digit', minute: '2-digit',
});

type TimelineStage = {
  id: string;
  occurredAt: string;
  status: ApplicationStatus;
  label: string;
  history?: ApplicationStatusHistory;
  event?: ApplicationEvent;
  isReverted: boolean;
};

function describeChange(entry: ApplicationStatusHistory) {
  if (!entry.fromStatus) return 'Application added';
  if (entry.toStatus === 'Rejected') return 'Application marked as rejected';
  if (entry.toStatus === 'Withdrawn') return 'Application withdrawn';
  if (entry.toStatus === 'Accepted') return 'Offer accepted';
  const direction = statusOrder.indexOf(entry.toStatus) < statusOrder.indexOf(entry.fromStatus)
    ? 'Returned from' : 'Moved from';
  return `${direction} ${entry.fromStatus}`;
}

export default function ApplicationTimeline({ application, refreshToken = 0, onChanged }: Props) {
  const requestKey = `${application.id}:${application.status}:${refreshToken}`;
  const [result, setResult] = useState<{
    key: string;
    entries: ApplicationStatusHistory[];
    events: ApplicationEvent[];
    error: string | null;
  } | null>(null);
  const [undoing, setUndoing] = useState<number | null>(null);
  const [confirmingUndo, setConfirmingUndo] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localRevision, setLocalRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getApplicationTimeline(application.id, controller.signal),
      getApplicationEvents(application.id, controller.signal).catch(() => [] as ApplicationEvent[]),
    ])
      .then(([entries, events]) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, entries, events, error: null });
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) setResult({
          key: requestKey,
          entries: [],
          events: [],
          error: problem instanceof Error ? problem.message : 'Unable to load the application timeline.',
        });
      });
    return () => controller.abort();
  }, [application.id, requestKey, localRevision]);

  const loading = result?.key !== requestKey;
  const allEntries = loading ? [] : result.entries;
  const entries = allEntries.filter(entry => !entry.isReverted);
  const stageEvents = (loading ? [] : result.events)
    .filter(event => event.type === 'Interview' || event.type === 'Assessment')
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left.id - right.id);
  const error = loading ? null : result.error;

  const eventHistory = new Map<number, ApplicationStatusHistory>();
  allEntries.forEach(entry => {
    if (entry.applicationEventId !== null) eventHistory.set(entry.applicationEventId, entry);
  });

  const interviewNumbers = new Map(
    stageEvents
      .filter(event => event.type === 'Interview')
      .map((event, index) => [event.id, index + 1]),
  );
  const assessmentNumbers = new Map(
    stageEvents
      .filter(event => event.type === 'Assessment')
      .map((event, index) => [event.id, index + 1]),
  );
  const eventStages: TimelineStage[] = stageEvents.map(event => {
    const history = eventHistory.get(event.id);
    const status: ApplicationStatus = event.type === 'Interview' ? 'Interviewing' : 'Assessment';
    const label = event.type === 'Interview'
      ? `Interview ${event.interviewRound ?? interviewNumbers.get(event.id)}`
      : `Assessment ${assessmentNumbers.get(event.id)}`;

    return {
      id: `event-${event.id}`,
      occurredAt: event.startsAt,
      status,
      label,
      history,
      event,
      isReverted: history?.isReverted ?? false,
    };
  });

  const eventStatuses = new Set(eventStages.map(stage => stage.status));
  const statusStages: TimelineStage[] = entries
    .filter(entry => !eventStatuses.has(entry.toStatus) || !['Assessment', 'Interviewing'].includes(entry.toStatus))
    .map(entry => ({
      id: `status-${entry.id}`,
      occurredAt: entry.changedAt,
      status: entry.toStatus,
      label: entry.toStatus === 'Assessment'
        ? 'Assessment 1'
        : entry.toStatus === 'Interviewing'
          ? 'Interview 1'
          : entry.toStatus,
      history: entry,
      isReverted: false,
    }));

  const stages = [...statusStages, ...eventStages].sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
  const currentEventStage = [...eventStages]
    .reverse()
    .find(stage => !stage.isReverted && stage.status === application.status);
  const currentStatusStage = [...statusStages]
    .reverse()
    .find(stage => stage.status === application.status);
  const currentStage = currentEventStage ?? currentStatusStage;
  const undoEntry = [...entries].reverse().find(entry => entry.canUndo);
  const currentStageIndex = currentStage ? stages.findIndex(stage => stage.id === currentStage.id) : -1;
  const returnTarget = undoEntry?.fromStatus
    ? [...stages.slice(0, Math.max(0, currentStageIndex))]
        .reverse()
        .find(stage => !stage.isReverted && stage.status === undoEntry.fromStatus)
    : undefined;
  const returnLabel = returnTarget?.label ?? undoEntry?.fromStatus;

  async function undo(entry: ApplicationStatusHistory) {
    if (undoing !== null) return;
    setUndoing(entry.id);
    setActionError(null);
    try {
      await undoLatestApplicationStatus(application.id);
      setConfirmingUndo(null);
      setLocalRevision(value => value + 1);
      onChanged();
    } catch (problem) {
      setActionError(problem instanceof Error ? problem.message : 'Unable to undo the status change.');
    } finally {
      setUndoing(null);
    }
  }

  return <section className={styles.timelineCard} aria-labelledby="application-timeline-title">
    <header className={styles.heading}>
      <span>Journey</span>
      <h3 id="application-timeline-title">Application timeline</h3>
    </header>

    {actionError && <p className={styles.actionError} role="alert">{actionError}</p>}
    {loading ? <div className={styles.loading} role="status"><span /><span /><span /></div>
      : error ? <p className={styles.message} role="alert">{error}</p>
      : stages.length === 0 ? <p className={styles.message}>No status changes recorded yet.</p>
      : <ol className={styles.timeline}>{stages.map(stage => {
        const occurredAt = new Date(stage.occurredAt);
        const isCurrent = stage.id === currentStage?.id;
        const eventResult = stage.event?.type === 'Interview'
          ? stage.event.interviewOutcome && stage.event.interviewOutcome !== 'Pending'
            ? stage.event.interviewOutcome
            : stage.event.status
          : stage.event?.status;

        return <li className={styles.timelineItem} data-current={isCurrent} data-reverted={stage.isReverted} key={stage.id}>
          <time dateTime={stage.occurredAt} className={styles.date}>
            {dateFormatter.format(occurredAt)}
            {stage.event
              ? <span>{stage.event.isAllDay ? 'All day' : timeFormatter.format(occurredAt)}</span>
              : stage.history?.fromStatus && <span>{timeFormatter.format(occurredAt)}</span>}
          </time>
          <div className={styles.rail} aria-hidden="true">
            <span className={`${styles.node} ${styles[stage.status]}`} />
          </div>
          <div className={styles.entryContent}>
            {stage.event || stage.label !== stage.status
              ? <span className={`${styles.stageBadge} ${styles[stage.status]}`}>{stage.label}</span>
              : <StatusBadge status={stage.status} />}
            <p>{isCurrent
              ? 'Current stage'
              : stage.isReverted
                ? 'Returned from this stage'
                : stage.history
                  ? describeChange(stage.history)
                  : 'Scheduled stage'}</p>
            {stage.event && <small>{[
              stage.event.type === 'Interview' ? stage.event.interviewStage : stage.event.title,
              eventResult,
            ].filter(Boolean).join(' · ')}</small>}
            {isCurrent && !stage.event && stage.history?.fromStatus && <small>{describeChange(stage.history)}</small>}
            {isCurrent && undoEntry && returnLabel && (confirmingUndo === undoEntry.id
              ? <div className={styles.undoConfirmation}>
                  <span>Return the application to {returnLabel}? Scheduled events will stay in Schedule.</span>
                  <button type="button" disabled={undoing !== null} onClick={() => void undo(undoEntry)}>
                    {undoing === undoEntry.id ? 'Returning…' : 'Return stage'}
                  </button>
                  <button type="button" disabled={undoing !== null} onClick={() => setConfirmingUndo(null)}>Cancel</button>
                </div>
              : <button className={styles.undoButton} type="button" onClick={() => setConfirmingUndo(undoEntry.id)}>Return to {returnLabel}</button>)}
          </div>
        </li>;
      })}</ol>}
  </section>;
}
