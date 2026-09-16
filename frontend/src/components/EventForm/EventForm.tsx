import { useId, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { DateTime } from 'luxon';
import { createEvent, updateEvent } from '../../api/events';
import type { ApplicationEvent, EventStatus, EventType } from '../../types/event';
import type { JobApplication } from '../../types/application';
import styles from '../ApplicationForm/ApplicationForm.module.scss';

interface Props {
  application: JobApplication;
  event?: ApplicationEvent;
  onSaved: () => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}
export default function EventForm({ application, event, onSaved, onCancel, onBusyChange }: Props) {
  const id = useId();
  const lock = useRef(false);
  const [title, setTitle] = useState(event?.title ?? '');
  const [type, setType] = useState<EventType>(event?.type ?? 'Interview');
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'Scheduled');
  const [zone, setZone] = useState(event?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const local = (value: string) => DateTime.fromISO(value).setZone(event?.timeZone).toFormat("yyyy-MM-dd'T'HH:mm");
  const [start, setStart] = useState(event ? local(event.startsAt) : '');
  const [end, setEnd] = useState(event ? local(event.endsAt) : '');
  const [location, setLocation] = useState(event?.locationOrLink ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [sync, setSync] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSync = !event && (type === 'Interview'
    ? ['Applied', 'Screening', 'Assessment', 'Interviewing'].includes(application.status)
    : type === 'Assessment' && ['Applied', 'Screening', 'Assessment'].includes(application.status));

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    setError(null);
    const starts = DateTime.fromISO(start, { zone });
    const ends = DateTime.fromISO(end, { zone });
    if (!title.trim() || !starts.isValid || !ends.isValid || ends <= starts) {
      setError('Enter a title, valid time zone, and an end time after the start.'); return;
    }
    if (starts.toFormat("yyyy-MM-dd'T'HH:mm") !== start || ends.toFormat("yyyy-MM-dd'T'HH:mm") !== end) {
      setError('This local time does not exist due to daylight saving. Choose another time.'); return;
    }
    if (starts.getPossibleOffsets().length > 1 || ends.getPossibleOffsets().length > 1) {
      setError('This local time is ambiguous due to daylight saving. Select UTC and enter the equivalent time.'); return;
    }
    lock.current = true; setBusy(true); onBusyChange(true);
    const data = {
      title: title.trim(), type, startsAt: starts.toISO()!, endsAt: ends.toISO()!,
      timeZone: zone.trim(), locationOrLink: location.trim() || null, notes: notes.trim() || null,
      updateApplicationStatus: Boolean(canSync && sync),
    };
    try {
      if (event) await updateEvent(event.id, { ...data, status });
      else await createEvent(application.id, data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save event.'); return;
    } finally { lock.current = false; setBusy(false); onBusyChange(false); }
    onSaved();
  }

  return <form onSubmit={submit}>
    <h3>{event ? 'Edit Event' : 'Add Event'}</h3>
    <fieldset className={styles.fields} disabled={busy}>
      <div className={styles.grid}>
        <label className={styles.field} htmlFor={id + '-title'}>Title
          <input id={id + '-title'} required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className={styles.field}>Type
          <select value={type} onChange={e => setType(e.target.value as EventType)}>
            <option>Interview</option><option>Assessment</option><option>FollowUp</option>
          </select></label>
        <label className={styles.field}>Start
          <input required type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className={styles.field}>End
          <input required type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label className={styles.field}>Time Zone
          <input required maxLength={100} value={zone} onChange={e => setZone(e.target.value)} placeholder="Australia/Perth" /></label>
        {event && <label className={styles.field}>Event Status
          <select value={status} onChange={e => setStatus(e.target.value as EventStatus)}>
            <option>Scheduled</option><option>Completed</option><option>Cancelled</option>
          </select></label>}
        <label className={styles.field}>Location or Meeting Link
          <input maxLength={2000} value={location} onChange={e => setLocation(e.target.value)} /></label>
        <label className={styles.field}>Notes
          <textarea maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      </div>
      {canSync && <p><label><input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} />
        {' '}Update application status to {type === 'Interview' ? 'Interviewing' : 'Assessment'}</label></p>}
      <button className={styles.submitButton} type="submit">{busy ? 'Saving...' : 'Save Event'}</button>
      {' '}<button type="button" onClick={onCancel}>Cancel</button>
    </fieldset>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </form>;
}
