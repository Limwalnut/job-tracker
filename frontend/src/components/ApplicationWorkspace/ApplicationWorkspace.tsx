import ApplicationSchedule from '../ApplicationSchedule/ApplicationSchedule';
import StatusBadge from '../StatusBadge/StatusBadge';
import type { JobApplication } from '../../types/application';
import styles from './ApplicationWorkspace.module.scss';

interface Props {
  applications: JobApplication[];
  selectedId: number;
  onSelect: (id: number) => void;
  onBack: () => void;
  onEdit: (id: number) => void;
  onChanged: () => void;
}

export default function ApplicationWorkspace({ applications, selectedId, onSelect, onBack, onEdit, onChanged }: Props) {
  const application = applications.find(item => item.id === selectedId);

  if (!application) {
    return <section className={styles.unavailable}>
      <h2>Application unavailable</h2>
      <p>This application may have been removed.</p>
      <button type="button" onClick={onBack}>Back to Applications</button>
    </section>;
  }

  return <section className={styles.workspace} aria-label="Application details workspace">
    <aside className={styles.sidebar} aria-label="Applications">
      <div className={styles.sidebarHeading}>
        <button type="button" onClick={onBack} aria-label="Back to applications table">←</button>
        <h2>Applications</h2>
      </div>
      <div className={styles.applicationList}>
        {applications.map(item => <button type="button" key={item.id}
          className={styles.applicationItem} data-active={item.id === selectedId}
          aria-current={item.id === selectedId ? 'true' : undefined}
          onClick={() => onSelect(item.id)}>
          <strong>{item.jobTitle}</strong>
          <span>{item.companyName}</span>
          <StatusBadge status={item.status} />
        </button>)}
      </div>
    </aside>

    <article className={styles.details}>
      <header className={styles.detailsHeading}>
        <div>
          <span className={styles.eyebrow}>Application details</span>
          <h2>{application.jobTitle}</h2>
          <p>{application.companyName}</p>
        </div>
        <button className={styles.editButton} type="button" onClick={() => onEdit(application.id)}>Edit Application</button>
      </header>

      <div className={styles.summaryRow}>
        <div><span>Status</span><StatusBadge status={application.status} /></div>
        <div><span>Applied Date</span><strong>{application.appliedDate}</strong></div>
      </div>

      <section className={styles.contentSection} aria-labelledby="job-description-title">
        <h3 id="job-description-title">Job Description</h3>
        <p>{application.jobDescription || 'No job description added.'}</p>
      </section>

      <section className={styles.contentSection} aria-labelledby="application-notes-title">
        <h3 id="application-notes-title">Notes</h3>
        <p>{application.notes || 'No notes added.'}</p>
      </section>

      <ApplicationSchedule application={application} onBusyChange={() => undefined} onChanged={onChanged} />
    </article>
  </section>;
}
