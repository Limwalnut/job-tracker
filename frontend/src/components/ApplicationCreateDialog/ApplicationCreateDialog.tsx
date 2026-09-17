import { useEffect, useRef, useState } from 'react';
import ApplicationForm from '../ApplicationForm/ApplicationForm';
import styles from './ApplicationCreateDialog.module.scss';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function ApplicationCreateDialog({ onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="application-create-title"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.heading}>
      <div>
        <h2 id="application-create-title">Add Application</h2>
        <p>Record a new job application and track its progress.</p>
      </div>
      <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog">Close</button>
    </div>
    <ApplicationForm hideHeading onCreated={onSaved} onCancel={onClose} onBusyChange={setBusy} />
  </dialog>;
}
