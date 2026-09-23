import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import ApplicationCreateDialog from '../../components/ApplicationCreateDialog/ApplicationCreateDialog';
import ApplicationDialog from '../../components/ApplicationDialog/ApplicationDialog';
import ApplicationList from '../../components/ApplicationList/ApplicationList';
import ApplicationWorkspace from '../../components/ApplicationWorkspace/ApplicationWorkspace';
import EventBoard from '../../components/EventBoard/EventBoard';
import EventDialog from '../../components/EventDialog/EventDialog';
import PrimaryActionButton from '../../components/PrimaryActionButton/PrimaryActionButton';
import { useAuth } from '../../auth/useAuth';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import { useApplications } from '../../hooks/useApplications';
import { usePagedApplications } from '../../hooks/usePagedApplications';
import { undoLatestApplicationStatus } from '../../api/applications';
import { getApplicationEvents } from '../../api/events';
import type { ApplicationStatus } from '../../types/application';
import type { EventType, ScheduleOpenRequest } from '../../types/event';
import { userDisplayName, userInitials } from '../../utils/userPresentation';
import styles from './ApplicationsPage.module.scss';

type ActiveTab = 'dashboard' | 'applications' | 'calendar';
type SchedulableStatus = Extract<ApplicationStatus, 'Assessment' | 'Interviewing'>;

interface ScheduleSuggestion {
  applicationId: number;
  type: Extract<EventType, 'Interview' | 'Assessment'>;
  hasExistingEvent: boolean;
}

interface StatusUndo {
  applicationId: number;
  status: ApplicationStatus;
}

const navigationItems: Array<{ id: ActiveTab; label: string; icon: ReactNode }> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" /></svg>,
  },
  {
    id: 'applications',
    label: 'Applications',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6V4h6v2m-9 0h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm-2 6h16M9 12v2h6v-2" /></svg>,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></svg>,
  },
];

const statusOrder: ApplicationStatus[] = [
  'Applied', 'Screening', 'Assessment', 'Interviewing',
  'Offer', 'Accepted', 'Rejected', 'Withdrawn',
];

const pageCopy: Record<ActiveTab, { title: string; description: string }> = {
  dashboard: {
    title: 'Dashboard',
    description: 'A clear view of your job search and where things stand.',
  },
  applications: {
    title: 'Applications',
    description: 'Manage every role, status and next step in your pipeline.',
  },
  calendar: {
    title: 'Calendar',
    description: 'Plan interviews, assessments and follow-ups.',
  },
};

function ApplicationsPage() {
  const navigate = useNavigate();
  const { applicationId } = useParams<{ applicationId: string }>();
  const { user, logout } = useAuth();
  const { applications, loading, error, refresh, changeStatus } = useApplications();
  const pagedApplications = usePagedApplications();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [eventRevision, setEventRevision] = useState(0);
  const [selected, setSelected] = useState<{
    id: number;
    mode: 'delete';
  } | null>(null);
  const [addingApplication, setAddingApplication] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<number>>(() => new Set());
  const [statusError, setStatusError] = useState<string | null>(null);
  const [scheduleSuggestion, setScheduleSuggestion] = useState<ScheduleSuggestion | null>(null);
  const [scheduleRequest, setScheduleRequest] = useState<ScheduleOpenRequest | null>(null);
  const [statusUndo, setStatusUndo] = useState<StatusUndo | null>(null);
  const [undoingStatus, setUndoingStatus] = useState(false);

  useEffect(() => {
    if (!statusUndo) return;
    const timeout = window.setTimeout(() => setStatusUndo(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [statusUndo]);

  const parsedApplicationId = applicationId ? Number(applicationId) : null;
  const viewingApplicationId = parsedApplicationId !== null
    && Number.isInteger(parsedApplicationId)
    && parsedApplicationId > 0
    ? parsedApplicationId
    : null;
  const visibleTab: ActiveTab = applicationId ? 'applications' : activeTab;

  const statusCounts = Object.fromEntries(
    statusOrder.map((status) => [
      status,
      applications.filter((application) => application.status === status).length,
    ]),
  ) as Record<ApplicationStatus, number>;
  const interviewingCount = statusCounts.Interviewing;
  const offerCount = statusCounts.Offer + statusCounts.Accepted;
  const activeCount = applications.filter((application) =>
    !['Rejected', 'Withdrawn', 'Accepted'].includes(application.status),
  ).length;
  const largestStatusCount = Math.max(1, ...Object.values(statusCounts));

  function refreshAll() {
    refresh();
    pagedApplications.refresh();
    setEventRevision((value) => value + 1);
  }

  function openApplication(id: number) {
    setActiveTab('applications');
    navigate(`/applications/${id}`);
  }

  function closeApplication() {
    setActiveTab('applications');
    setScheduleRequest(null);
    navigate('/applications');
  }

  function showTab(tab: ActiveTab) {
    setActiveTab(tab);
    setScheduleRequest(null);
    if (applicationId) {
      navigate('/applications');
    }
  }

  async function handleStatusChange(id: number, status: ApplicationStatus) {
    setStatusError(null);
    setUpdatingStatusIds((current) => new Set(current).add(id));

    try {
      await changeStatus(id, status);
      pagedApplications.refresh();
      if (['Accepted', 'Rejected', 'Withdrawn'].includes(status)) {
        setStatusUndo({ applicationId: id, status });
      } else {
        setStatusUndo(null);
      }
      if (status === 'Assessment' || status === 'Interviewing') {
        await offerSchedule(id, status);
      }
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : 'Unable to update application status. Please try again.',
      );
    } finally {
      setUpdatingStatusIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function undoClosedStatus() {
    if (!statusUndo || undoingStatus) return;
    setUndoingStatus(true);
    setStatusError(null);

    try {
      await undoLatestApplicationStatus(statusUndo.applicationId);
      setStatusUndo(null);
      refreshAll();
    } catch (undoError) {
      setStatusError(undoError instanceof Error
        ? undoError.message
        : 'Unable to undo the status change.');
    } finally {
      setUndoingStatus(false);
    }
  }

  async function offerSchedule(id: number, status: SchedulableStatus) {
    const type = status === 'Interviewing' ? 'Interview' : 'Assessment';
    let hasExistingEvent = false;

    try {
      const events = await getApplicationEvents(id);
      const now = Date.now();
      hasExistingEvent = events.some(event =>
        event.type === type
        && event.status !== 'Cancelled'
        && Date.parse(event.endsAt) >= now,
      );
    } catch {
      // The status update has already succeeded, so a schedule lookup failure
      // should not turn it into an error or block the follow-up action.
    }

    setScheduleSuggestion({ applicationId: id, type, hasExistingEvent });
  }

  function followScheduleSuggestion() {
    if (!scheduleSuggestion) return;

    setScheduleRequest({
      requestId: Date.now(),
      applicationId: scheduleSuggestion.applicationId,
      type: scheduleSuggestion.type,
      mode: scheduleSuggestion.hasExistingEvent ? 'view' : 'create',
    });
    setScheduleSuggestion(null);
    openApplication(scheduleSuggestion.applicationId);
  }

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  const currentPage = pageCopy[visibleTab];

  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} to="/">
          <BrandLogo compact tone="light" />
        </Link>

        <nav className={styles.navigation} aria-label="Workspace navigation">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.navItem}
              data-active={visibleTab === item.id}
              aria-current={visibleTab === item.id ? 'page' : undefined}
              onClick={() => showTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.account}>
          {user && <Link className={styles.accountLink} to="/account" aria-label="Open account settings">
            <div className={styles.avatar} aria-hidden="true">{userInitials(user)}</div>
            <div className={styles.accountDetails}>
              <span>{userDisplayName(user)}</span>
              <strong>{user.email}</strong>
            </div>
          </Link>}
          <div className={styles.accountActions}>
            {user?.isAdmin && <Link className={styles.adminLink} to="/admin">Admin console</Link>}
            <button type="button" className={styles.logout} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.breadcrumb}>Workspace / {currentPage.title}</p>
            <h1>{currentPage.title}</h1>
            <p>{currentPage.description}</p>
          </div>
          {visibleTab === 'dashboard' && (
            <PrimaryActionButton onClick={() => setAddingApplication(true)}>
              Add application
            </PrimaryActionButton>
          )}
        </header>

        {visibleTab === 'dashboard' && (
          <section className={styles.dashboard} aria-label="Job search dashboard">
            <div className={styles.metrics}>
              <article className={styles.metricCard}>
                <span>Total applications</span>
                <strong>{applications.length}</strong>
                <small>All roles in your tracker</small>
              </article>
              <article className={styles.metricCard}>
                <span>Active pipeline</span>
                <strong>{activeCount}</strong>
                <small>Applications still in progress</small>
              </article>
              <article className={styles.metricCard}>
                <span>Interviewing</span>
                <strong>{interviewingCount}</strong>
                <small>Roles currently at interview</small>
              </article>
              <article className={styles.metricCard}>
                <span>Offers</span>
                <strong>{offerCount}</strong>
                <small>Offers received or accepted</small>
              </article>
            </div>

            <div className={styles.dashboardGrid}>
              <section className={styles.panel} aria-labelledby="pipeline-title">
                <div className={styles.panelHeading}>
                  <div>
                    <p>Pipeline</p>
                    <h2 id="pipeline-title">Applications by status</h2>
                  </div>
                </div>
                <div className={styles.statusList}>
                  {statusOrder.map((status) => (
                    <div className={styles.statusRow} key={status}>
                      <span>{status}</span>
                      <div className={styles.statusTrack} aria-hidden="true">
                        <div
                          className={styles.statusFill}
                          style={{ width: `${(statusCounts[status] / largestStatusCount) * 100}%` }}
                        />
                      </div>
                      <strong>{statusCounts[status]}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.panel} aria-labelledby="recent-title">
                <div className={styles.panelHeading}>
                  <div>
                    <p>Latest activity</p>
                    <h2 id="recent-title">Recent applications</h2>
                  </div>
                  <button type="button" onClick={() => showTab('applications')}>
                    View all
                  </button>
                </div>

                {error ? (
                  <p className={styles.panelMessage} role="alert">
                    {error} <button type="button" onClick={refresh}>Retry</button>
                  </p>
                ) : loading ? (
                  <p className={styles.panelMessage} role="status">Loading applications…</p>
                ) : applications.length === 0 ? (
                  <div className={styles.dashboardEmpty}>
                    <span aria-hidden="true">↗</span>
                    <h3>Your search starts here</h3>
                    <p>Add your first application to see progress on the dashboard.</p>
                    <button type="button" onClick={() => setAddingApplication(true)}>
                      Add application
                    </button>
                  </div>
                ) : (
                  <div className={styles.recentList}>
                    {applications.slice(0, 5).map((application) => (
                      <button
                        type="button"
                        className={styles.recentItem}
                        key={application.id}
                        onClick={() => openApplication(application.id)}
                      >
                        <span className={styles.companyInitial} aria-hidden="true">
                          {application.companyName.charAt(0).toUpperCase()}
                        </span>
                        <span className={styles.recentText}>
                          <strong>{application.jobTitle}</strong>
                          <small>{application.companyName}</small>
                        </span>
                        <span className={styles.recentStatus}>{application.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>
        )}

        {visibleTab === 'applications' && (
          <section className={styles.tabPanel} aria-label="Applications">
            {viewingApplicationId === null && (
              <ApplicationList
                applications={pagedApplications.applications}
                loading={pagedApplications.loading}
                error={pagedApplications.error}
                statusError={statusError}
                updatingStatusIds={updatingStatusIds}
                scope={pagedApplications.scope}
                counts={pagedApplications.counts}
                status={pagedApplications.status}
                sort={pagedApplications.sort}
                search={pagedApplications.searchInput}
                page={pagedApplications.page}
                pageSize={pagedApplications.pageSize}
                totalCount={pagedApplications.totalCount}
                totalPages={pagedApplications.totalPages}
                onChanged={pagedApplications.refresh}
                onAdd={() => setAddingApplication(true)}
                onOpen={openApplication}
                onStatusChange={handleStatusChange}
                onScopeChange={pagedApplications.setScope}
                onStatusFilterChange={pagedApplications.setStatus}
                onSortChange={pagedApplications.setSort}
                onSearchChange={pagedApplications.setSearchInput}
                onPageChange={pagedApplications.setPage}
                onClearFilters={pagedApplications.clearFilters}
              />
            )}
            {viewingApplicationId !== null && loading && (
              <section className={styles.detailState} role="status">
                <h2>Loading application…</h2>
                <p>Getting the latest application details and schedule.</p>
              </section>
            )}
            {viewingApplicationId !== null && !loading && error && (
              <section className={styles.detailState} role="alert">
                <h2>Unable to load application</h2>
                <p>{error}</p>
                <button type="button" onClick={refresh}>Try again</button>
              </section>
            )}
            {viewingApplicationId !== null && !loading && !error && (
              <ApplicationWorkspace
                key={`${viewingApplicationId}-${scheduleRequest?.requestId ?? 'default'}`}
                applications={applications}
                selectedId={viewingApplicationId}
                onBack={closeApplication}
                onDelete={(id) => setSelected({ id, mode: 'delete' })}
                onChanged={refreshAll}
                onStatusChanged={(status) => {
                  if (status === 'Assessment' || status === 'Interviewing') {
                    void offerSchedule(viewingApplicationId, status);
                  }
                }}
                scheduleRequest={scheduleRequest}
              />
            )}
          </section>
        )}

        {visibleTab === 'calendar' && (
          <section className={styles.tabPanel} aria-label="Calendar">
            <EventBoard
              revision={eventRevision}
              onAddEvent={() => setAddingEvent(true)}
              onSelect={openApplication}
            />
          </section>
        )}
      </main>

      {addingApplication && (
        <ApplicationCreateDialog
          onClose={() => setAddingApplication(false)}
          onSaved={() => {
            setAddingApplication(false);
            refresh();
            pagedApplications.refresh();
          }}
        />
      )}
      {addingEvent && (
        <EventDialog
          applications={applications}
          onClose={() => setAddingEvent(false)}
          onSaved={() => {
            setAddingEvent(false);
            refreshAll();
          }}
        />
      )}
      {selected && (
        <ApplicationDialog
          key={`${selected.id}-${selected.mode}`}
          {...selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            refreshAll();
            if (selected.mode === 'delete' && selected.id === viewingApplicationId) {
              navigate('/applications');
            }
          }}
        />
      )}
      {scheduleSuggestion && (
        <aside className={styles.schedulePrompt} aria-live="polite" aria-label="Schedule next step">
          <div className={styles.schedulePromptIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /><path d="m9 14 2 2 4-4" /></svg>
          </div>
          <div className={styles.schedulePromptCopy}>
            <strong>{scheduleSuggestion.hasExistingEvent ? 'This next step is already scheduled' : `Add the ${scheduleSuggestion.type.toLowerCase()} to your schedule?`}</strong>
            <span>{scheduleSuggestion.hasExistingEvent
              ? 'Open the application schedule to review the details.'
              : `Keep the date and details with this application.`}</span>
          </div>
          <div className={styles.schedulePromptActions}>
            <button type="button" className={styles.schedulePromptPrimary} onClick={followScheduleSuggestion}>
              {scheduleSuggestion.hasExistingEvent ? 'View schedule' : `Schedule ${scheduleSuggestion.type.toLowerCase()}`}
            </button>
            <button type="button" className={styles.schedulePromptDismiss} onClick={() => setScheduleSuggestion(null)}>Not now</button>
          </div>
        </aside>
      )}
      {statusUndo && (
        <aside className={styles.statusUndo} role="status" aria-live="polite">
          <span>Moved to Closed as <strong>{statusUndo.status}</strong>.</span>
          <button type="button" disabled={undoingStatus} onClick={() => void undoClosedStatus()}>
            {undoingStatus ? 'Undoing…' : 'Undo'}
          </button>
          <button type="button" className={styles.statusUndoDismiss} aria-label="Dismiss" onClick={() => setStatusUndo(null)}>×</button>
        </aside>
      )}
    </div>
  );
}

export default ApplicationsPage;
