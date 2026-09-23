import { useEffect, useRef, useState } from 'react';
import ApplicationForm from '../ApplicationForm/ApplicationForm';
import useAnimatedDismiss from '../../hooks/useAnimatedDismiss';
import { isDialogBackdropPointer } from '../../utils/dialog';
import styles from './ApplicationCreateDialog.module.scss';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function ApplicationCreateDialog({ onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const { closing, dismiss } = useAnimatedDismiss(onClose);

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    element?.showModal();

    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, []);

  function requestClose() {
    if (!busy && !closing) dismiss();
  }

  return <dialog ref={dialog} className={styles.dialog} data-closing={closing} aria-labelledby="application-create-title"
    onPointerDown={event => { if (isDialogBackdropPointer(event)) requestClose(); }}
    onCancel={event => { event.preventDefault(); requestClose(); }}>
    <div className={styles.heading}>
      <div>
        <h2 id="application-create-title">Add Application</h2>
        <p>Record a new job application and track its progress.</p>
      </div>
      <button type="button" onClick={requestClose} disabled={busy || closing} aria-label="Close dialog">Close</button>
    </div>
    <ApplicationForm hideHeading disabled={closing} onCreated={() => dismiss(onSaved)} onCancel={requestClose} onBusyChange={setBusy} />
  </dialog>;
}
