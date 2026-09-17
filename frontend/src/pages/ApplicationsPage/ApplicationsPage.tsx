import EventBoard from '../../components/EventBoard/EventBoard';
import { useState } from 'react';
import ApplicationDialog from '../../components/ApplicationDialog/ApplicationDialog';
import ApplicationCreateDialog from '../../components/ApplicationCreateDialog/ApplicationCreateDialog';
import ApplicationWorkspace from '../../components/ApplicationWorkspace/ApplicationWorkspace';
import EventDialog from '../../components/EventDialog/EventDialog';
import ApplicationList from '../../components/ApplicationList/ApplicationList';
import PageHeader from '../../components/PageHeader/PageHeader';
import { useApplications } from '../../hooks/useApplications';
import styles from './ApplicationsPage.module.scss';

function ApplicationsPage() {
  const { applications, loading, error, refresh } = useApplications();

  const [section, setSection] = useState<'applications' | 'upcoming'>('applications');
  const [scheduleView, setScheduleView] = useState<'list' | 'calendar'>('list');
  const [eventRevision, setEventRevision] = useState(0);
  function refreshAll() { refresh(); setEventRevision(value => value + 1); }
  const [selected, setSelected] = useState<{ id: number; mode: 'view' | 'edit' | 'delete' } | null>(null);
  const [viewingApplicationId, setViewingApplicationId] = useState<number | null>(null);
  const [addingApplication, setAddingApplication] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);

  function openApplication(id: number) {
    setViewingApplicationId(id);
    setSection('applications');
  }

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
      <div className={styles.viewSwitch} role="group" aria-label="Job tracker section">
        <button type="button" aria-pressed={section === 'applications'} onClick={() => setSection('applications')}>Applications</button>
        <button type="button" aria-pressed={section === 'upcoming'} onClick={() => setSection('upcoming')}>Upcoming</button>
      </div>
      <div className={styles.viewContent}>
        <div className={styles.viewPanel} data-active={section === 'applications'} aria-hidden={section !== 'applications'} inert={section !== 'applications'}>
          {viewingApplicationId === null ? <ApplicationList
              applications={applications}
              loading={loading}
              error={error}
              onChanged={refresh}
              onAdd={() => setAddingApplication(true)}
              onAction={(id, mode) => mode === 'view' ? openApplication(id) : setSelected({ id, mode })}
            /> : <ApplicationWorkspace
              applications={applications}
              selectedId={viewingApplicationId}
              onSelect={setViewingApplicationId}
              onBack={() => setViewingApplicationId(null)}
              onEdit={id => setSelected({ id, mode: 'edit' })}
              onChanged={refreshAll}
            />}
        </div>
        <div className={styles.viewPanel} data-active={section === 'upcoming'} aria-hidden={section !== 'upcoming'} inert={section !== 'upcoming'}>
          <div className={styles.scheduleContent}>
            <div className={styles.schedulePanel} data-active={scheduleView === 'list'} aria-hidden={scheduleView !== 'list'} inert={scheduleView !== 'list'}>
              <EventBoard mode="upcoming" revision={eventRevision} onAddEvent={() => setAddingEvent(true)} onModeChange={mode => setScheduleView(mode === 'upcoming' ? 'list' : 'calendar')} onSelect={openApplication} />
            </div>
            <div className={styles.schedulePanel} data-active={scheduleView === 'calendar'} aria-hidden={scheduleView !== 'calendar'} inert={scheduleView !== 'calendar'}>
              <EventBoard mode="calendar" revision={eventRevision} onAddEvent={() => setAddingEvent(true)} onModeChange={mode => setScheduleView(mode === 'upcoming' ? 'list' : 'calendar')} onSelect={openApplication} />
            </div>
          </div>
        </div>
      </div>
      {addingApplication && <ApplicationCreateDialog onClose={() => setAddingApplication(false)} onSaved={() => { setAddingApplication(false); refresh(); }} />}
      {addingEvent && <EventDialog applications={applications} onClose={() => setAddingEvent(false)} onSaved={() => { setAddingEvent(false); refreshAll(); }} />}
      {selected && <ApplicationDialog key={`${selected.id}-${selected.mode}`} {...selected} onClose={() => setSelected(null)} onChanged={refreshAll} />}
    </main>
  );
}

export default ApplicationsPage;
