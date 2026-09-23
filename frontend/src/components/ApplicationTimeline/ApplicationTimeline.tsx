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
  const entries = loading ? [] : result.entries.filter(entry => !entry.isReverted);
  const interviewEvents = loading ? [] : result.events.filter(event => event.type === 'Interview');
  const interviewEntryId = [...entries].reverse().find(entry => entry.toStatus === 'Interviewing')?.id;
  const error = loading ? null : result.error;

  const interviewRounds = interviewEvents.length > 0 && <ul className={styles.interviewRounds}>
    {interviewEvents.map(event => {
      const occurredAt = new Date(event.startsAt);
      const result = event.interviewOutcome && event.interviewOutcome !== 'Pending'
        ? event.interviewOutcome
        : event.status;

      return <li key={event.id} data-result={result}>
        <span>{event.interviewRound ?? '—'}</span>
        <div>
          <strong>{event.interviewStage || event.title}</strong>
          <small>{dateFormatter.format(occurredAt)} · {result}</small>
        </div>
      </li>;
    })}
  </ul>;

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
      : entries.length === 0 ? <p className={styles.message}>No status changes recorded yet.</p>
      : <ol className={styles.timeline}>{entries.map(entry => {
        const occurredAt = new Date(entry.changedAt);
        const isCurrent = entry.toStatus === application.status && entry.canUndo;

        return <li className={styles.timelineItem} data-current={isCurrent} key={entry.id}>
          <time dateTime={entry.changedAt} className={styles.date}>
            {dateFormatter.format(occurredAt)}
            {entry.fromStatus && <span>{timeFormatter.format(occurredAt)}</span>}
          </time>
          <div className={styles.rail} aria-hidden="true">
            <span className={`${styles.node} ${styles[entry.toStatus]}`} />
          </div>
          <div className={styles.entryContent}>
            <StatusBadge status={entry.toStatus} />
            <p>{isCurrent ? 'Current stage' : describeChange(entry)}</p>
            {isCurrent && entry.fromStatus && <small>{describeChange(entry)}</small>}
            {entry.id === interviewEntryId && interviewRounds}
            {entry.canUndo && (confirmingUndo === entry.id
              ? <div className={styles.undoConfirmation}>
                  <span>Return the application to {entry.fromStatus}? Interview rounds will stay in Schedule.</span>
                  <button type="button" disabled={undoing !== null} onClick={() => void undo(entry)}>
                    {undoing === entry.id ? 'Returning…' : 'Return status'}
                  </button>
                  <button type="button" disabled={undoing !== null} onClick={() => setConfirmingUndo(null)}>Cancel</button>
                </div>
              : <button className={styles.undoButton} type="button" onClick={() => setConfirmingUndo(entry.id)}>Return to {entry.fromStatus}</button>)}
          </div>
        </li>;
      })}</ol>}
    {!loading && !error && interviewRounds && !interviewEntryId && <div className={styles.unlinkedInterviews}>
      <strong>Interview rounds</strong>
      {interviewRounds}
    </div>}
  </section>;
}
