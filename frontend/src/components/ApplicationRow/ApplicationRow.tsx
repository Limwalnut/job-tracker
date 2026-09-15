import { Select } from 'antd';
import { useRef, useState } from 'react';
import { updateApplicationStatus } from '../../api/applications';
import type { ApplicationStatus, JobApplication } from '../../types/application';
import styles from './ApplicationRow.module.scss';

const statuses: ApplicationStatus[] = ['Applied', 'Screening', 'Assessment', 'Interviewing', 'Offer', 'Accepted', 'Rejected', 'Withdrawn'];

interface Props {
  application: JobApplication;
  onStatusSaved: (id: number, status: ApplicationStatus) => void;
  onAction: (id: number, mode: 'view' | 'edit' | 'delete') => void;
}

export default function ApplicationRow({ application, onStatusSaved, onAction }: Props) {
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);
  const saving = useRef(false);
  const busy = pendingStatus !== null;
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(status: ApplicationStatus) {
    if (saving.current || status === application.status) return;
    saving.current = true;
    setPendingStatus(status);
    setError(null);
    try {
      await updateApplicationStatus(application.id, status);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to update status.');
      saving.current = false;
      setPendingStatus(null);
      return;
    }
    onStatusSaved(application.id, status);
    saving.current = false;
    setPendingStatus(null);
  }

  return (
    <tr>
      <td><strong>{application.companyName}</strong></td>
      <td>{application.jobTitle}</td>
      <td>
        <Select<ApplicationStatus>
          className={styles.select}
          aria-label={`Status for ${application.jobTitle} at ${application.companyName}`}
          value={pendingStatus ?? application.status}
          options={statuses.map(status => ({ value: status, label: status }))}
          loading={busy}
          open={busy ? false : undefined}
          aria-disabled={busy}
          onChange={status => void changeStatus(status)}
          status={error ? 'error' : undefined}
        />
        <small className={styles.saving} role="status">{busy ? "Saving..." : ""}</small>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </td>
      <td><time dateTime={application.appliedDate}>{application.appliedDate}</time></td>
      <td><div className={styles.actions}>
        <button type="button" disabled={busy} onClick={() => onAction(application.id, 'view')}>View</button>
        <button type="button" disabled={busy} onClick={() => onAction(application.id, 'edit')}>Edit</button>
        <button type="button" className={styles.danger} disabled={busy} onClick={() => onAction(application.id, 'delete')}>Delete</button>
      </div></td>
    </tr>
  );
}
