import { useEffect, useRef, useState } from 'react';
import type { JobApplication } from '../../types/application';
import EventForm from '../EventForm/EventForm';
import useAnimatedDismiss from '../../hooks/useAnimatedDismiss';
import { isDialogBackdropPointer } from '../../utils/dialog';
import styles from './EventDialog.module.scss';

interface Props {
  applications: JobApplication[];
  onClose: () => void;
  onSaved: () => void;
}

export default function EventDialog({ applications, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const { closing, dismiss } = useAnimatedDismiss(onClose);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function requestClose() {
    if (!busy && !closing) dismiss();
  }

  return <dialog ref={dialog} className={styles.dialog} data-closing={closing} aria-labelledby="event-dialog-title"
    onPointerDown={event => { if (isDialogBackdropPointer(event)) requestClose(); }}
    onCancel={event => { event.preventDefault(); requestClose(); }}>
    <div className={styles.heading}>
      <div>
        <h2 id="event-dialog-title">Add Event</h2>
        <p>Schedule an event and link it to an application.</p>
      </div>
      <button type="button" onClick={requestClose} disabled={busy || closing} aria-label="Close dialog">Close</button>
    </div>
    {applications.length === 0
      ? <p>Create an application before adding an event.</p>
      : <EventForm applications={applications} hideHeading onSaved={() => dismiss(onSaved)} onCancel={requestClose} onBusyChange={setBusy} />}
  </dialog>;
}
