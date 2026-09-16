import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { getEvents } from '../../api/events';
import type { ApplicationEvent, EventType } from '../../types/event';
import styles from './EventBoard.module.scss';

interface Props { mode: 'calendar' | 'upcoming'; revision: number; onSelect: (id: number) => void; }

export default function EventBoard({ mode, revision, onSelect }: Props) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [month, setMonth] = useState(() => DateTime.now().startOf('month'));
  const [cancelled, setCancelled] = useState(false);
  const [type, setType] = useState<EventType | ''>('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; events: ApplicationEvent[]; error: string | null } | null>(null);
  const start = mode === 'calendar' ? month.startOf('week') : DateTime.now().startOf('day');
  const end = mode === 'calendar' ? month.endOf('month').endOf('week').plus({ milliseconds: 1 }) : start.plus({ days: 30 });
  const from = start.toISO()!;
  const to = end.toISO()!;
  const key = [from, to, cancelled, revision, retry].join('|');

  useEffect(() => {
    const controller = new AbortController();
    getEvents(from, to, cancelled, controller.signal).then(events => {
      if (!controller.signal.aborted) setResult({ key, events, error: null });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key, events: [], error: error instanceof Error ? error.message : 'Unable to load events.' });
    });
    return () => controller.abort();
  }, [from, to, cancelled, key]);

  const loading = result?.key !== key;
  const events = (result?.events ?? []).filter(event =>
    (!type || event.type === type) &&
    `${event.companyName} ${event.jobTitle} ${event.title}`.toLowerCase().includes(search.toLowerCase()) &&
    (mode !== 'upcoming' || (event.status === 'Scheduled' && DateTime.fromISO(event.endsAt) > DateTime.now())));
  const days = Array.from({ length: Math.round(end.diff(start, 'days').days) }, (_, i) => start.plus({ days: i }));

  function card(event: ApplicationEvent) {
    return <button type="button" className={`${styles.event} ${styles[event.type]}`} key={event.id}
      onClick={() => onSelect(event.applicationId)}>
      <strong>{DateTime.fromISO(event.startsAt).setZone(zone).toFormat('HH:mm')} · {event.title}</strong>
      <span>{event.companyName} · {event.jobTitle}</span>
      <small>{event.type} · {event.status}</small>
    </button>;
  }

  return <section className={styles.board} aria-label={mode === 'calendar' ? 'Event calendar' : 'Upcoming events'}>
    <div className={styles.heading}>
      <div><h2>{mode === 'calendar' ? month.toFormat('LLLL yyyy') : 'Upcoming · Next 30 Days'}</h2>
        <p>Interview, assessment, and follow-up events · Times in {zone}</p></div>
      {mode === 'calendar' && <div className={styles.controls}>
        <button type="button" onClick={() => setMonth(x => x.minus({ months: 1 }))}>Previous</button>
        <button type="button" onClick={() => setMonth(DateTime.now().startOf('month'))}>Today</button>
        <button type="button" onClick={() => setMonth(x => x.plus({ months: 1 }))}>Next</button>
      </div>}
    </div>
    <div className={styles.filters}>
      <input aria-label="Search events" placeholder="Search company, role, or event" value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label="Event type" value={type} onChange={e => setType(e.target.value as EventType | '')}>
        <option value="">All event types</option><option>Interview</option><option>Assessment</option><option>FollowUp</option>
      </select>
      {mode === 'calendar' && <label><input type="checkbox" checked={cancelled} onChange={e => setCancelled(e.target.checked)} /> Show cancelled</label>}
    </div>
    {loading ? <p role="status">Loading events...</p> : result?.error ? <p role="alert">{result.error} <button type="button" onClick={() => setRetry(x => x + 1)}>Retry</button></p> : mode === 'calendar' ? <>
      <div className={styles.scroll} tabIndex={0} role="region" aria-label="Monthly schedule">
        <table className={styles.grid}><caption className={styles.caption}>Events by date. Select an event to manage its schedule.</caption>
          <thead><tr>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
          <tbody>{Array.from({ length: days.length / 7 }, (_, week) => <tr key={week}>
            {days.slice(week * 7, week * 7 + 7).map(day => {
              const date = day.toISODate()!;
              const matches = events.filter(event => DateTime.fromISO(event.startsAt) < day.plus({ days: 1 }) && DateTime.fromISO(event.endsAt) > day);
              const all = expanded.includes(date);
              return <td key={date} className={day.month !== month.month ? styles.outside : undefined}>
                <time dateTime={date} className={day.hasSame(DateTime.now(), 'day') ? styles.today : undefined}>{day.day}</time>
                {(all ? matches : matches.slice(0, 3)).map(card)}
                {matches.length > 3 && <button type="button" aria-expanded={all} onClick={() => setExpanded(current => all ? current.filter(x => x !== date) : [...current, date])}>{all ? 'Show less' : `+${matches.length - 3} more`}</button>}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      {events.length === 0 && <p>No events in this date range. Open an application and choose Add Event.</p>}
    </> : <div className={styles.agenda}>
      {events.length === 0 && <p>No upcoming events. Open an application to schedule your next step.</p>}
      {events.map(event => <div key={event.id}><p>{DateTime.fromISO(event.startsAt).setZone(zone).toFormat('cccc, dd LLL yyyy')}</p>{card(event)}</div>)}
    </div>}
  </section>;
}
