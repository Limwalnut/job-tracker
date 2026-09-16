import type { JobApplication } from '../../types/application';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './ApplicationRow.module.scss';

interface Props {
  application: JobApplication;
  onAction: (id: number, mode: 'view' | 'edit' | 'delete') => void;
}

export default function ApplicationRow({ application, onAction }: Props) {
  return (
    <tr>
      <td><strong>{application.companyName}</strong></td>
      <td>{application.jobTitle}</td>
      <td><StatusBadge status={application.status} /></td>
      <td><time dateTime={application.appliedDate}>{application.appliedDate}</time></td>
      <td><div className={styles.actions}>
        <button type="button" onClick={() => onAction(application.id, 'view')}>View</button>
        <button type="button" onClick={() => onAction(application.id, 'edit')}>Edit</button>
        <button type="button" className={styles.danger} onClick={() => onAction(application.id, 'delete')}>Delete</button>
      </div></td>
    </tr>
  );
}
