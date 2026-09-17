import ApplicationSchedule from '../ApplicationSchedule/ApplicationSchedule';
import StatusBadge from '../StatusBadge/StatusBadge';
import { useEffect, useRef, useState } from 'react';
import { getApplication, deleteApplication } from '../../api/applications';
import type { JobApplication } from '../../types/application';
import ApplicationForm from '../ApplicationForm/ApplicationForm';
import styles from './ApplicationDialog.module.scss';

interface Props {
  id: number;
  mode: 'view' | 'edit' | 'delete';
  onClose: () => void;
  onChanged: () => void;
}

export default function ApplicationDialog({ id, mode, onClose, onChanged }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const controller = new AbortController();
    getApplication(id, controller.signal).then(data => {
      if (!controller.signal.aborted) setApplication(data);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load application.');
    });
    return () => { controller.abort(); element?.close(); };
  }, [id]);

  function saved() {
    onChanged();
    onClose();
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteApplication(id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to delete application.');
      setBusy(false);
      return;
    }
    saved();
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="dialog-title"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className={styles.heading}>
        <h2 id="dialog-title">{mode === 'delete' ? 'Delete Application' : mode === 'edit' ? 'Update Application' : 'Application Details'}</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog">Close</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!application && !error && <p role="status">Loading application...</p>}
      {application && mode === 'edit' && (
        <ApplicationForm application={application} disabled={busy} onCreated={saved} onBusyChange={setBusy} />
      )}
      {application && mode === 'view' && (
        <dl className={styles.details}>
          <dt>Company</dt><dd>{application.companyName}</dd>
          <dt>Job Title</dt><dd>{application.jobTitle}</dd>
          <dt>Status</dt><dd><StatusBadge status={application.status} /></dd>
          <dt>Applied Date</dt><dd>{application.appliedDate}</dd>
          <dt>Job Description</dt><dd>{application.jobDescription || 'No job description added.'}</dd>
          <dt>Notes</dt><dd>{application.notes || 'No notes added.'}</dd>
        </dl>
      )}
      {application && mode === 'view' && <ApplicationSchedule application={application} onBusyChange={setBusy} onChanged={() => {
        onChanged();
        getApplication(id).then(setApplication).catch(() => setError('Event saved, but application details could not be refreshed. Close and reopen this dialog.'));
      }} />}
      {application && mode === 'delete' && <>
        <p>Delete the application for <strong>{application.jobTitle}</strong> at <strong>{application.companyName}</strong>?</p>
        <p>All associated events will also be deleted. This action cannot be undone.</p>
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
          <button className={styles.danger} type="button" disabled={busy} onClick={() => void remove()}>
            {busy ? 'Deleting...' : 'Delete Application'}
          </button>
        </div>
      </>}
    </dialog>
  );
}
