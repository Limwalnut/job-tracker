import { useEffect, useRef, useState } from 'react';
import type { JobApplication } from '../../types/application';
import EventForm from '../EventForm/EventForm';
import styles from './EventDialog.module.scss';

interface Props {
  applications: JobApplication[];
  onClose: () => void;
  onSaved: () => void;
}

export default function EventDialog({ applications, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="event-dialog-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.heading}>
      <div>
        <h2 id="event-dialog-title">Add Event</h2>
        <p>Schedule an event and link it to an application.</p>
      </div>
      <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog">Close</button>
    </div>
    {applications.length === 0
      ? <p>Create an application before adding an event.</p>
      : <EventForm applications={applications} hideHeading onSaved={onSaved} onCancel={onClose} onBusyChange={setBusy} />}
  </dialog>;
}
