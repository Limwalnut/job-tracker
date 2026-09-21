import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { deleteEvent, getApplicationEvents } from '../../api/events';
import type { ApplicationEvent } from '../../types/event';
import type { JobApplication } from '../../types/application';
import EventForm from '../EventForm/EventForm';
import WorkspaceActionButton from '../WorkspaceActionButton/WorkspaceActionButton';
import WorkspaceEmptyState from '../WorkspaceEmptyState/WorkspaceEmptyState';
import styles from './ApplicationSchedule.module.scss';

interface Props { application: JobApplication; onChanged: () => void; onBusyChange: (busy: boolean) => void; }
export default function ApplicationSchedule({ application, onChanged, onBusyChange }: Props) {
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApplicationEvent | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getApplicationEvents(application.id, controller.signal).then(data => {
      if (!controller.signal.aborted) { setEvents(data); setError(null); }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load schedule.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [application.id, revision]);
  function setSaving(value: boolean) { setBusy(value); onBusyChange(value); }
  function changed() { setCreating(false); setEditing(null); setRevision(x => x + 1); onChanged(); }
  async function remove(event: ApplicationEvent, revertApplicationStatus: boolean) {
    if (busy) return;
    setSaving(true); setError(null);
    try { await deleteEvent(event.id, revertApplicationStatus); setDeleting(null); changed(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to delete event.'); }
    finally { setSaving(false); }
  }

  function formatRange(event: ApplicationEvent) {
    const startsAt = DateTime.fromISO(event.startsAt).setZone(event.timeZone);
    const endsAt = DateTime.fromISO(event.endsAt).setZone(event.timeZone);

    if (event.isAllDay) return startsAt.toFormat('dd LLL yyyy');

    return startsAt.hasSame(endsAt, 'day')
      ? `${startsAt.toFormat('dd LLL yyyy')} · ${startsAt.toFormat('HH:mm')}–${endsAt.toFormat('HH:mm')}`
      : `${startsAt.toFormat('dd LLL yyyy, HH:mm')} – ${endsAt.toFormat('dd LLL yyyy, HH:mm')}`;
  }

  function location(event: ApplicationEvent) {
    if (!event.locationOrLink) return null;

    return /^https?:\/\//i.test(event.locationOrLink)
      ? <a href={event.locationOrLink} target="_blank" rel="noreferrer">Open meeting link</a>
      : <span>{event.locationOrLink}</span>;
  }

  return <section className={styles.schedule} aria-label="Application schedule">
    <div className={styles.heading}>
      <h3>Schedule</h3>
      {!creating && !editing && <WorkspaceActionButton icon="add" variant="accent" disabled={busy} onClick={() => {
        setEditing(null);
        setCreating(true);
      }}>
        Add Event
      </WorkspaceActionButton>}
    </div>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(x => x + 1)}>Retry</button></p>}
    {creating || editing ? <div className={styles.eventEditor}><EventForm application={application} event={editing ?? undefined}
      onSaved={changed} onCancel={() => { setCreating(false); setEditing(null); }} onBusyChange={setSaving} /></div> : <>
      {loading && <p role="status">Loading schedule...</p>}
      {!loading && events.length === 0 && <WorkspaceEmptyState
        className={styles.empty}
        icon="schedule"
        title="No events scheduled"
        description="Add an interview, assessment, or follow-up to keep the next step visible."
      />}
      <ul className={styles.list}>{events.map(event => <li
        key={event.id}
        className={`${styles.eventCard} ${styles[event.type]}`}
        data-status={event.status}
      >
        <div className={styles.eventHeader}>
          <div>
            <time dateTime={event.startsAt}>{formatRange(event)}</time>
            <strong>{event.title}</strong>
            <span>{event.type} · {event.status}</span>
          </div>
          {event.status !== 'Cancelled' && <div className={styles.eventActions}>
            <button type="button" disabled={busy} aria-label={`Edit ${event.title}`} title="Edit event" onClick={() => { setCreating(false); setEditing(event); }}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.7 4.2 4.2-.7L19 8.5 15.5 5 4 16.5Z" /><path d="m13.8 6.7 3.5 3.5" /></svg>
            </button>
            <button className={styles.deleteButton} type="button" disabled={busy} aria-label={`Delete ${event.title}`} title="Delete event" onClick={() => setDeleting(event.id)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>
            </button>
          </div>}
        </div>
        {(event.locationOrLink || event.notes) && <div className={styles.eventDetails}>
          {event.locationOrLink && <p className={styles.location}>{location(event)}</p>}
          {event.notes && <p className={styles.notes}>{event.notes}</p>}
        </div>}
        {deleting === event.id && <div className={styles.deleteConfirmation} role="group" aria-label="Confirm event deletion">
          <p>Permanently delete this event?</p>
          <div>
            <button className={styles.confirmDelete} type="button" disabled={busy} onClick={() => void remove(event, false)}>Delete event</button>
            {event.updatedApplicationStatus && <button className={styles.confirmDelete} type="button" disabled={busy} onClick={() => void remove(event, true)}>Delete and return status</button>}
            <button type="button" disabled={busy} onClick={() => setDeleting(null)}>Keep event</button>
          </div>
        </div>}
      </li>)}</ul>
    </>}
  </section>;
}
