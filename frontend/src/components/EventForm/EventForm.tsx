import { useEffect, useId, useRef, useState } from 'react';
import type { SubmitEvent } from 'react';
import { DateTime } from 'luxon';
import { createEvent, getApplicationEvents, updateEvent } from '../../api/events';
import { interviewStages } from '../../types/event';
import type { ApplicationEvent, EventStatus, EventType, InterviewOutcome } from '../../types/event';
import type { JobApplication } from '../../types/application';
import styles from './EventForm.module.scss';

interface Props {
  application?: JobApplication;
  applications?: JobApplication[];
  event?: ApplicationEvent;
  hideHeading?: boolean;
  onSaved: () => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
  initialType?: EventType;
  skipStatusSync?: boolean;
}

const defaultNames: Record<EventType, string> = {
  Interview: 'Interview',
  Assessment: 'Assessment deadline',
  FollowUp: 'Follow up',
};

const durationOptions = [15, 30, 45, 60, 90, 120, 180, 240];

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export default function EventForm({ application, applications = [], event, hideHeading = false, onSaved, onCancel, onBusyChange, initialType, skipStatusSync = false }: Props) {
  const id = useId();
  const lock = useRef(false);
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zone = event?.timeZone ?? browserZone;
  const initialStart = event
    ? DateTime.fromISO(event.startsAt).setZone(zone)
    : DateTime.now().setZone(zone);
  const initialDuration = event
    ? event.isAllDay
      ? 60
      : Math.max(15, Math.round(DateTime.fromISO(event.endsAt).diff(DateTime.fromISO(event.startsAt), 'minutes').minutes))
    : 60;
  const initialDurationOptions = durationOptions.includes(initialDuration)
    ? durationOptions
    : [...durationOptions, initialDuration].sort((a, b) => a - b);

  const startingType = event?.type ?? initialType ?? 'Interview';
  const [type, setType] = useState<EventType>(startingType);
  const [eventName, setEventName] = useState(event?.title ?? defaultNames[startingType]);
  const [date, setDate] = useState(initialStart.toISODate() ?? '');
  const [hasTime, setHasTime] = useState(event ? !event.isAllDay : false);
  const [time, setTime] = useState(initialStart.toFormat('HH:mm'));
  const [duration, setDuration] = useState(initialDuration);
  const [status, setStatus] = useState<EventStatus>(event?.status ?? 'Scheduled');
  const [interviewRound, setInterviewRound] = useState<number | ''>(event?.interviewRound ?? '');
  const [interviewStage, setInterviewStage] = useState(event?.interviewStage ?? '');
  const [interviewOutcome, setInterviewOutcome] = useState<InterviewOutcome>(event?.interviewOutcome ?? 'Pending');
  const [location, setLocation] = useState(event?.locationOrLink ?? '');
  const [notes, setNotes] = useState(event?.notes ?? '');
  const [sync, setSync] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<number | ''>(application?.id ?? '');
  const selectedApplication = application ?? applications.find(item => item.id === applicationId);
  const canSync = Boolean(!skipStatusSync && !event && selectedApplication && (type === 'Interview'
    ? ['Applied', 'Screening', 'Assessment', 'Interviewing'].includes(selectedApplication.status)
    : type === 'Assessment' && ['Applied', 'Screening', 'Assessment'].includes(selectedApplication.status)));

  useEffect(() => {
    if (type !== 'Interview' || !selectedApplication || event?.type === 'Interview') return;

    const controller = new AbortController();
    getApplicationEvents(selectedApplication.id, controller.signal)
      .then(events => {
        if (controller.signal.aborted) return;
        const interviews = events.filter(item => item.type === 'Interview');
        const highestRound = Math.max(0, ...interviews.map(item => item.interviewRound ?? 0));
        setInterviewRound(Math.max(interviews.length, highestRound) + 1);
      })
      .catch(() => {
        if (!controller.signal.aborted) setInterviewRound(1);
      });

    return () => controller.abort();
  }, [event, selectedApplication, type]);

  function changeType(nextType: EventType) {
    const previousDefault = defaultNames[type];
    setType(nextType);
    setEventName(current => !current.trim() || current === previousDefault ? defaultNames[nextType] : current);
    if (nextType === 'Interview') {
      setInterviewRound('');
    } else {
      setInterviewStage('');
      setInterviewOutcome('Pending');
    }
  }

  function changeInterviewOutcome(outcome: InterviewOutcome) {
    setInterviewOutcome(outcome);
    if (outcome !== 'Pending') setStatus('Completed');
  }

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    setError(null);

    if (!selectedApplication) {
      setError('Select an application for this event.');
      return;
    }

    if (!eventName.trim() || !date) {
      setError('Enter an event name and date.');
      return;
    }

    const starts = hasTime
      ? DateTime.fromISO(`${date}T${time}`, { zone })
      : DateTime.fromISO(date, { zone }).startOf('day');
    const ends = hasTime ? starts.plus({ minutes: duration }) : starts.plus({ days: 1 });

    if (!starts.isValid || !ends.isValid || (hasTime && !time)) {
      setError('Choose a valid date and time.');
      return;
    }

    if (hasTime && starts.toFormat("yyyy-MM-dd'T'HH:mm") !== `${date}T${time}`) {
      setError('This local time does not exist due to daylight saving. Choose another time.');
      return;
    }

    if (hasTime && starts.getPossibleOffsets().length > 1) {
      setError('This local time is ambiguous due to daylight saving. Choose another time.');
      return;
    }

    lock.current = true;
    setBusy(true);
    onBusyChange(true);

    const data = {
      title: eventName.trim(),
      type,
      startsAt: starts.toISO()!,
      endsAt: ends.toISO()!,
      isAllDay: !hasTime,
      timeZone: zone,
      locationOrLink: location.trim() || null,
      notes: notes.trim() || null,
      interviewRound: type === 'Interview' && interviewRound !== '' ? interviewRound : null,
      interviewStage: type === 'Interview' ? interviewStage || null : null,
      interviewOutcome: type === 'Interview' ? interviewOutcome : null,
      updateApplicationStatus: Boolean(canSync && sync),
    };

    try {
      if (event) await updateEvent(event.id, { ...data, status });
      else await createEvent(selectedApplication.id, data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save event.');
      return;
    } finally {
      lock.current = false;
      setBusy(false);
      onBusyChange(false);
    }

    onSaved();
  }

  return <form className={styles.form} onSubmit={submit}>
    {!hideHeading && <h3>{event ? 'Edit Event' : 'Add Event'}</h3>}
    <fieldset className={styles.fields} disabled={busy}>
      <div className={styles.grid}>
        {!application && <label className={`${styles.field} ${styles.fullWidth}`} htmlFor={`${id}-application`}>
          <span>Application</span>
          <select id={`${id}-application`} required value={applicationId} onChange={e => {
            setApplicationId(e.target.value ? Number(e.target.value) : '');
            setInterviewRound('');
          }}>
            <option value="">Select an application</option>
            {applications.map(item => <option key={item.id} value={item.id}>{item.companyName} — {item.jobTitle}</option>)}
          </select>
        </label>}

        <label className={styles.field} htmlFor={`${id}-type`}>
          <span>Event Type</span>
          <select id={`${id}-type`} value={type} onChange={e => changeType(e.target.value as EventType)}>
            <option value="Interview">Interview</option>
            <option value="Assessment">Assessment</option>
            <option value="FollowUp">Follow-up</option>
          </select>
        </label>

        <label className={styles.field} htmlFor={`${id}-name`}>
          <span>Event Name</span>
          <input id={`${id}-name`} required maxLength={200} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Technical interview" />
        </label>

        {type === 'Interview' && <>
          <label className={styles.field} htmlFor={`${id}-interview-round`}>
            <span>Interview Round</span>
            <input
              id={`${id}-interview-round`}
              type="number"
              min="1"
              max="99"
              required
              value={interviewRound}
              onChange={e => setInterviewRound(e.target.value ? Number(e.target.value) : '')}
              placeholder="Calculating next round…"
            />
          </label>

          <label className={styles.field} htmlFor={`${id}-interview-stage`}>
            <span>Interview Type <small>Optional</small></span>
            <select id={`${id}-interview-stage`} value={interviewStage} onChange={e => setInterviewStage(e.target.value)}>
              <option value="">Select interview type</option>
              {interviewStages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </label>

          <label className={styles.field} htmlFor={`${id}-interview-outcome`}>
            <span>Interview Result</span>
            <select
              id={`${id}-interview-outcome`}
              value={interviewOutcome}
              onChange={e => changeInterviewOutcome(e.target.value as InterviewOutcome)}
            >
              <option value="Pending">Pending</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
            </select>
          </label>
        </>}

        <label className={styles.field} htmlFor={`${id}-date`}>
          <span>{type === 'Assessment' ? 'Due Date' : 'Date'}</span>
          <input id={`${id}-date`} required type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>

        <label className={`${styles.timeToggle} ${hasTime ? styles.timeToggleActive : ''}`}>
          <input type="checkbox" checked={hasTime} onChange={e => setHasTime(e.target.checked)} />
          <span className={styles.toggleTrack} aria-hidden="true"><span /></span>
          <span><strong>Add a specific time</strong><small>Otherwise this appears as an all-day event.</small></span>
        </label>

        {hasTime && <>
          <label className={styles.field} htmlFor={`${id}-time`}>
            <span>Start Time</span>
            <input id={`${id}-time`} required type="time" value={time} onChange={e => setTime(e.target.value)} />
          </label>
          <label className={styles.field} htmlFor={`${id}-duration`}>
            <span>Duration</span>
            <select id={`${id}-duration`} value={duration} onChange={e => setDuration(Number(e.target.value))}>
              {initialDurationOptions.map(minutes => <option key={minutes} value={minutes}>{durationLabel(minutes)}</option>)}
            </select>
          </label>
        </>}

        {event && <div className={`${styles.field} ${styles.fullWidth}`}>
          <span>Event Status</span>
          <div className={styles.statusOptions} role="group" aria-label="Event status">
            {(['Scheduled', 'Completed'] as EventStatus[]).map(value => <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                if (value === 'Scheduled' && interviewOutcome !== 'Pending') {
                  setInterviewOutcome('Pending');
                }
              }}
            >{value}</button>)}
          </div>
        </div>}

        <label className={`${styles.field} ${styles.fullWidth}`} htmlFor={`${id}-location`}>
          <span>Location or Meeting Link <small>Optional</small></span>
          <input id={`${id}-location`} maxLength={2000} value={location} onChange={e => setLocation(e.target.value)} placeholder="Paste a meeting link or enter a location" />
        </label>

        <label className={`${styles.field} ${styles.fullWidth}`} htmlFor={`${id}-notes`}>
          <span>Notes <small>Optional</small></span>
          <textarea id={`${id}-notes`} maxLength={4000} rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add preparation notes or reminders" />
        </label>
      </div>

      {canSync && <label className={styles.syncOption}>
        <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} />
        <span>Move application to <strong>{type === 'Interview' ? 'Interviewing' : 'Assessment'}</strong></span>
      </label>}

      <div className={styles.formActions}>
        <button className={styles.submitButton} type="submit">{busy ? 'Saving...' : 'Save Event'}</button>
        <button className={styles.secondaryButton} type="button" onClick={onCancel}>Cancel</button>
      </div>
    </fieldset>
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </form>;
}
