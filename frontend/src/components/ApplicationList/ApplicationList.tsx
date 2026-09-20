import ApplicationRow from '../ApplicationRow/ApplicationRow';
import type { ApplicationStatus, JobApplication } from '../../types/application';
import styles from './ApplicationList.module.scss';

interface ApplicationListProps {
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  statusError: string | null;
  updatingStatusIds: Set<number>;
  onChanged: () => void;
  onAdd: () => void;
  onOpen: (id: number) => void;
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
}

function ApplicationList({ applications, loading, error, statusError, updatingStatusIds, onChanged, onAdd, onOpen, onStatusChange }: ApplicationListProps) {
  return (
      <section
        className={styles.applicationsSection}
        aria-labelledby="applications-title"
      >
        <div className={styles.heading}>
          <h2 id="applications-title">Applications</h2>
          <button className={styles.addButton} type="button" onClick={onAdd}>Add Application</button>
        </div>

        {error && (
          <p className={styles.errorMessage} role="alert">
            {error} <button type="button" onClick={onChanged}>Retry</button>
          </p>
        )}
        {statusError && (
          <p className={styles.errorMessage} role="alert">{statusError}</p>
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
              <span aria-hidden="true"> · </span>
              <span>Select a row to view details</span>
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
                    <th scope="col" className={styles.openColumn}>
                      <span className={styles.visuallyHidden}>Open application</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {applications.map((application) => (
                    <ApplicationRow
                      key={application.id}
                      application={application}
                      updatingStatus={updatingStatusIds.has(application.id)}
                      onOpen={onOpen}
                      onStatusChange={onStatusChange}
                    />
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
