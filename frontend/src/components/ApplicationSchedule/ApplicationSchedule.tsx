import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { deleteEvent, getApplicationEvents } from '../../api/events';
import type { ApplicationEvent } from '../../types/event';
import type { JobApplication } from '../../types/application';
import EventForm from '../EventForm/EventForm';
import styles from './ApplicationSchedule.module.scss';

interface Props { application: JobApplication; onChanged: () => void; onBusyChange: (busy: boolean) => void; }
export default function ApplicationSchedule({ application, onChanged, onBusyChange }: Props) {
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
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
  function changed() { setEditing(null); setRevision(x => x + 1); onChanged(); }
  async function remove(id: number) {
    if (busy) return;
    setSaving(true); setError(null);
    try { await deleteEvent(id); setDeleting(null); changed(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to delete event.'); }
    finally { setSaving(false); }
  }
  return <section className={styles.schedule} aria-label="Application schedule">
    <div className={styles.heading}><h3>Schedule</h3></div>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(x => x + 1)}>Retry</button></p>}
    {editing ? <EventForm application={application} event={editing}
      onSaved={changed} onCancel={() => setEditing(null)} onBusyChange={setSaving} /> : <>
      {loading && <p role="status">Loading schedule...</p>}
      {!loading && events.length === 0 && <p>No events yet. Schedule an interview, assessment, or follow-up.</p>}
      <ul className={styles.list}>{events.map(event => <li key={event.id}>
        <strong>{event.title}</strong> <span>{event.type} · {event.status}</span>
        <p>{DateTime.fromISO(event.startsAt).setZone(event.timeZone).toFormat('dd LLL yyyy, HH:mm')} – {DateTime.fromISO(event.endsAt).setZone(event.timeZone).toFormat('dd LLL yyyy, HH:mm')} ({event.timeZone})</p>
        {event.locationOrLink && <p>{event.locationOrLink}</p>}
        {event.notes && <p className={styles.notes}>{event.notes}</p>}
        <button type="button" disabled={busy} onClick={() => setEditing(event)}>Edit Event</button>{' '}
        <button type="button" disabled={busy} onClick={() => setDeleting(event.id)}>Delete Event</button>
        {deleting === event.id && <div role="group" aria-label="Confirm event deletion"><p>Permanently delete this event?</p>
          <button type="button" disabled={busy} onClick={() => void remove(event.id)}>Confirm Delete</button>{' '}
          <button type="button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button></div>}
      </li>)}</ul>
    </>}
  </section>;
}
