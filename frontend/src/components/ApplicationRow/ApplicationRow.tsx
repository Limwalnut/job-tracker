import type { ApplicationStatus, JobApplication } from '../../types/application';
import ApplicationStatusSelect from '../ApplicationStatusSelect/ApplicationStatusSelect';
import styles from './ApplicationRow.module.scss';

interface Props {
  application: JobApplication;
  updatingStatus: boolean;
  onOpen: (id: number) => void;
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
}

export default function ApplicationRow({ application, updatingStatus, onOpen, onStatusChange }: Props) {
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
      <td>
        <div
          className={styles.statusControl}
          data-busy={updatingStatus}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ApplicationStatusSelect
            value={application.status}
            disabled={updatingStatus}
            busy={updatingStatus}
            ariaLabel={`Change status for ${application.jobTitle} at ${application.companyName}`}
            onChange={(status) => void onStatusChange(application.id, status)}
          />
        </div>
      </td>
      <td><time dateTime={application.appliedDate}>{application.appliedDate}</time></td>
      <td className={styles.openCell} aria-hidden="true"><span>→</span></td>
    </tr>
  );
}
