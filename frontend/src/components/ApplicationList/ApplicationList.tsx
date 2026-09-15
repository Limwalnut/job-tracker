import ApplicationRow from '../ApplicationRow/ApplicationRow';
import type { ApplicationStatus, JobApplication } from '../../types/application';
import styles from './ApplicationList.module.scss';

interface ApplicationListProps {
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  onStatusSaved: (id: number, status: ApplicationStatus) => void;
  onAction: (id: number, mode: 'view' | 'edit' | 'delete') => void;
}

function ApplicationList({ applications, loading, error, onChanged, onStatusSaved, onAction }: ApplicationListProps) {
  return (
      <section
        className={styles.applicationsSection}
        aria-labelledby="applications-title"
      >
        <h2 id="applications-title">Applications</h2>

        {error && (
          <p className={styles.errorMessage} role="alert">
            {error} <button type="button" onClick={onChanged}>Retry</button>
          </p>
        )}
        {loading ? (
          <p role="status">Loading applications...</p>
        ) : applications.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No applications yet</h3>
            <p>Your job applications will appear here once you add them.</p>
          </div>
        ) : (
          <>
            <p className={styles.applicationCount}>
              {applications.length}{' '}
              {applications.length === 1 ? 'application' : 'applications'}
            </p>

            <div
              className={styles.tableContainer}
              role="region"
              aria-label="Job applications"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Company</th>
                    <th scope="col">Job Title</th>
                    <th scope="col">Status</th>
                    <th scope="col">Applied Date</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {applications.map((application) => (
                    <ApplicationRow key={application.id} application={application} onStatusSaved={onStatusSaved} onAction={onAction} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
  );
}

export default ApplicationList;
