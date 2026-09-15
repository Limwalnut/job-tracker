import { useState } from 'react';
import type { JobApplication } from '../../types/application';
import { dateKey, monthDays } from './calendar';
import styles from './ApplicationCalendar.module.scss';

interface Props {
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (id: number) => void;
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthFormatter = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('en-AU', { dateStyle: 'full' });

export default function ApplicationCalendar({ applications, loading, error, onRetry, onSelect }: Props) {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const todayKey = dateKey(new Date());
  const days = monthDays(month.getFullYear(), month.getMonth());
  const grouped = new Map<string, JobApplication[]>();
  for (const application of applications) {
    const records = grouped.get(application.appliedDate) ?? [];
    records.push(application);
    grouped.set(application.appliedDate, records);
  }
  const monthCount = applications.filter(application =>
    application.appliedDate.startsWith(dateKey(month).slice(0, 7))).length;

  function navigate(offset: number) {
    setMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className={styles.calendar} aria-labelledby="calendar-title">
      <div className={styles.header}>
        <div>
          <h2 id="calendar-title">Application Calendar</h2>
          <p>Applications are shown on their applied date.</p>
        </div>
        <div className={styles.controls}>
          <button type="button" aria-label="Previous month" onClick={() => navigate(-1)}>Previous</button>
          <button type="button" onClick={() => {
            const today = new Date();
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
          }}>Today</button>
          <button type="button" aria-label="Next month" onClick={() => navigate(1)}>Next</button>
        </div>
      </div>
      <h3 aria-live="polite">{monthFormatter.format(month)}</h3>
      {loading ? <p role="status">Loading applications...</p> : error ? (
        <div role="alert" className={styles.error}>{error} <button type="button" onClick={onRetry}>Retry</button></div>
      ) : <>
        <p className={styles.count}>{monthCount} {monthCount === 1 ? 'application' : 'applications'} this month</p>
        <div className={styles.scroll} role="region" aria-label="Monthly application calendar" tabIndex={0}>
          <table className={styles.grid}>
            <caption className={styles.srOnly}>{monthFormatter.format(month)} applications by applied date</caption>
            <thead><tr>{weekdays.map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
            <tbody>
              {Array.from({ length: days.length / 7 }, (_, week) => (
                <tr key={week}>
                  {days.slice(week * 7, week * 7 + 7).map(day => {
                    const key = dateKey(day);
                    const records = grouped.get(key) ?? [];
                    return (
                      <td key={key} className={day.getMonth() !== month.getMonth() ? styles.outside : undefined}>
                        <time dateTime={key} aria-label={dayFormatter.format(day)}
                          aria-current={key === todayKey ? 'date' : undefined}
                          className={key === todayKey ? styles.today : styles.day}>{day.getDate()}</time>
                        <ul className={styles.events}>
                          {records.map(application => (
                            <li key={application.id}>
                              <button type="button" className={styles.event}
                                aria-label={`View ${application.jobTitle} at ${application.companyName}, ${application.status}, ${key}`}
                                onClick={() => onSelect(application.id)}>
                                <strong>{application.companyName}</strong>
                                <span>{application.jobTitle}</span>
                                <small>{application.status}</small>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {monthCount === 0 && <p>No applications for this month. Use Previous or Next to explore other months.</p>}
      </>}
    </section>
  );
}
