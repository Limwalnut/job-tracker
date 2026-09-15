import ApplicationCalendar from '../../components/ApplicationCalendar/ApplicationCalendar';
import { useState } from 'react';
import ApplicationDialog from '../../components/ApplicationDialog/ApplicationDialog';
import ApplicationForm from '../../components/ApplicationForm/ApplicationForm';
import ApplicationList from '../../components/ApplicationList/ApplicationList';
import PageHeader from '../../components/PageHeader/PageHeader';
import { useApplications } from '../../hooks/useApplications';
import styles from './ApplicationsPage.module.scss';

function ApplicationsPage() {
  const { applications, loading, error, refresh, updateSavedStatus } = useApplications();

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selected, setSelected] = useState<{ id: number; mode: 'view' | 'edit' | 'delete' } | null>(null);

  return (
    <main className={styles.page}>
      <PageHeader
        title="Job Tracker"
        description="Keep track of your job applications and next steps."
      />
      <div className={styles.summary} aria-label="Application overview">
        <div><span>Total Applications</span><strong>{applications.length}</strong></div>
        <div><span>Interviewing</span><strong>{applications.filter(item => item.status === 'Interviewing').length}</strong></div>
        <div><span>Offers</span><strong>{applications.filter(item => item.status === 'Offer' || item.status === 'Accepted').length}</strong></div>
      </div>
      <ApplicationForm onCreated={refresh} />
      <div className={styles.viewSwitch} role="group" aria-label="Application view">
        <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
        <button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendar</button>
      </div>
      {view === 'calendar' ? (
        <ApplicationCalendar applications={applications} loading={loading} error={error}
          onRetry={refresh} onSelect={id => setSelected({ id, mode: 'view' })} />
      ) : <ApplicationList
        applications={applications}
        loading={loading}
        error={error}
        onChanged={refresh}
        onStatusSaved={updateSavedStatus}
        onAction={(id, mode) => setSelected({ id, mode })}
      />}
      {selected && <ApplicationDialog key={`${selected.id}-${selected.mode}`} {...selected} onClose={() => setSelected(null)} onChanged={refresh} />}
    </main>
  );
}

export default ApplicationsPage;
