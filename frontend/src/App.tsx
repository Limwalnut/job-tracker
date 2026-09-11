import { useEffect, useState } from 'react';
import ApplicationForm from './components/ApplicationForm/ApplicationForm';
import type { JobApplication } from './types/application';

function App() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleApplicationCreated() {
    setLoading(true);
    setError(null);
    setRefreshKey((current) => current + 1);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplications() {
      try {
        const response = await fetch('/api/applications', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Unable to load applications (HTTP ${response.status}).`,
          );
        }

        const data: JobApplication[] = await response.json();

        if (!controller.signal.aborted) {
          setApplications(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadApplications();

    return () => controller.abort();
  }, [refreshKey]);

  return (
    <main className="app">
      <header className="page-header">
        <h1>Job Tracker</h1>
        <p>Keep track of your job applications and next steps.</p>
      </header>

      <ApplicationForm onCreated={handleApplicationCreated} />

      <section
        className="applications-section"
        aria-labelledby="applications-title"
      >
        <h2 id="applications-title">Applications</h2>

        {loading ? (
          <p role="status">Loading applications...</p>
        ) : error ? (
          <p className="error-message" role="alert">
            {error}
          </p>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <h3>No applications yet</h3>
            <p>Your job applications will appear here once you add them.</p>
          </div>
        ) : (
          <>
            <p className="application-count">
              {applications.length}{' '}
              {applications.length === 1 ? 'application' : 'applications'}
            </p>

            <div
              className="table-container"
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
                  </tr>
                </thead>

                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td>{application.companyName}</td>
                      <td>{application.jobTitle}</td>
                      <td>
                        <span className="status-badge">
                          {application.status}
                        </span>
                      </td>
                      <td>
                        <time dateTime={application.appliedDate}>
                          {application.appliedDate}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default App;