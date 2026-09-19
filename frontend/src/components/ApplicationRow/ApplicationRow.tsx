import type { JobApplication } from '../../types/application';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './ApplicationRow.module.scss';

interface Props {
  application: JobApplication;
  onOpen: (id: number) => void;
}

export default function ApplicationRow({ application, onOpen }: Props) {
  function openApplication() {
    onOpen(application.id);
  }

  return (
    <tr
      className={styles.row}
      tabIndex={0}
      aria-label={`View ${application.jobTitle} at ${application.companyName}`}
      onClick={openApplication}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openApplication();
        }
      }}
    >
      <td><strong>{application.companyName}</strong></td>
      <td><span className={styles.jobTitle}>{application.jobTitle}</span></td>
      <td><StatusBadge status={application.status} /></td>
      <td><time dateTime={application.appliedDate}>{application.appliedDate}</time></td>
      <td className={styles.openCell} aria-hidden="true"><span>→</span></td>
    </tr>
  );
}
