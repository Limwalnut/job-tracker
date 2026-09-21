import { useState, type FormEvent } from 'react';
import { updateApplication } from '../../api/applications';
import ApplicationForm from '../ApplicationForm/ApplicationForm';
import ApplicationSchedule from '../ApplicationSchedule/ApplicationSchedule';
import ApplicationTimeline from '../ApplicationTimeline/ApplicationTimeline';
import StatusBadge from '../StatusBadge/StatusBadge';
import WorkspaceActionButton from '../WorkspaceActionButton/WorkspaceActionButton';
import WorkspaceEmptyState from '../WorkspaceEmptyState/WorkspaceEmptyState';
import type { JobApplication } from '../../types/application';
import styles from './ApplicationWorkspace.module.scss';

interface Props {
  applications: JobApplication[];
  selectedId: number;
  onBack: () => void;
  onDelete: (id: number) => void;
  onChanged: () => void;
}

export default function ApplicationWorkspace({ applications, selectedId, onBack, onDelete, onChanged }: Props) {
  const application = applications.find(item => item.id === selectedId);
  const [isEditing, setIsEditing] = useState(false);
  const [detailTab, setDetailTab] = useState<'jobDescription' | 'notes' | 'schedule'>('jobDescription');
  const [editingSection, setEditingSection] = useState<'jobDescription' | 'notes' | null>(null);
  const [contentDraft, setContentDraft] = useState('');
  const [savingSection, setSavingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [contentOverrides, setContentOverrides] = useState<{ jobDescription?: string | null; notes?: string | null }>({});
  const [journeyRevision, setJourneyRevision] = useState(0);

  if (!application) {
    return <section className={styles.unavailable}>
      <h2>Application unavailable</h2>
      <p>This application may have been removed.</p>
      <button type="button" onClick={onBack}>Back to Applications</button>
    </section>;
  }

  const currentApplication = application;
  const jobDescription = contentOverrides.jobDescription !== undefined
    ? contentOverrides.jobDescription
    : application.jobDescription;
  const notes = contentOverrides.notes !== undefined ? contentOverrides.notes : application.notes;

  function beginSectionEdit(section: 'jobDescription' | 'notes') {
    setEditingSection(section);
    setContentDraft((section === 'jobDescription' ? jobDescription : notes) ?? '');
    setSectionError(null);
  }

  async function saveSection(event: FormEvent<HTMLFormElement>, section: 'jobDescription' | 'notes') {
    event.preventDefault();
    if (savingSection) return;

    setSavingSection(true);
    setSectionError(null);
    const value = contentDraft.trim() || null;

    try {
      await updateApplication(currentApplication.id, {
        status: currentApplication.status,
        companyName: currentApplication.companyName,
        jobTitle: currentApplication.jobTitle,
        appliedDate: currentApplication.appliedDate,
        jobDescriptionUrl: currentApplication.jobDescriptionUrl,
        contactName: currentApplication.contactName,
        contactPhone: currentApplication.contactPhone,
        contactEmail: currentApplication.contactEmail,
        jobDescription: section === 'jobDescription' ? value : jobDescription,
        notes: section === 'notes' ? value : notes,
      });
      setContentOverrides(current => ({ ...current, [section]: value }));
      setEditingSection(null);
      onChanged();
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to save changes.');
    } finally {
      setSavingSection(false);
    }
  }

  return <section className={styles.workspace} aria-label="Application details workspace">
    <article className={styles.details}>
      <button className={styles.backButton} type="button" onClick={onBack}>
        <span aria-hidden="true">←</span>
        Back to Applications
      </button>

      <header className={styles.detailsHeading}>
        <div>
          <span className={styles.eyebrow}>{isEditing ? 'Editing application' : 'Application details'}</span>
          <h2>{application.jobTitle}</h2>
          <p>{application.companyName}</p>
          {(application.jobDescriptionUrl || application.contactName || application.contactPhone || application.contactEmail) && <div className={styles.contactDetails}>
            {application.jobDescriptionUrl && <a href={application.jobDescriptionUrl} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5m0-5-8 8" /><path d="M19 13v6H5V5h6" /></svg>
              Job description
            </a>}
            {application.contactName && <span className={styles.contactName}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c.7-4.2 3.4-6.5 8-6.5s7.3 2.3 8 6.5" /></svg>
              {application.contactName}
            </span>}
            {application.contactPhone && <a href={`tel:${application.contactPhone}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5 9 8l-2 1.8a15.4 15.4 0 0 0 7.2 7.2l1.8-2 4.5 2.4-.7 3.1c-.2.9-1 1.5-2 1.5C9.1 22 2 14.9 2 6.2c0-1 .6-1.8 1.5-2l3.1-.7Z" /></svg>
              {application.contactPhone}
            </a>}
            {application.contactEmail && <a href={`mailto:${application.contactEmail}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5Z" /><path d="m3 6 9 7 9-7" /></svg>
              {application.contactEmail}
            </a>}
          </div>}
        </div>
        {!isEditing && (
          <div className={styles.detailsActions}>
            <WorkspaceActionButton icon="edit" onClick={() => {
              setContentOverrides({});
              setEditingSection(null);
              setIsEditing(true);
            }}>Edit application</WorkspaceActionButton>
            <details className={styles.moreMenu}>
              <summary aria-label="More application actions">•••</summary>
              <div className={styles.menuItems}>
                <button type="button" onClick={() => onDelete(application.id)}>Delete application</button>
              </div>
            </details>
          </div>
        )}
      </header>

      <div className={styles.detailGrid}>
        <div className={styles.mainContent}>
          {isEditing ? (
            <div className={styles.editPanel}>
              <ApplicationForm
                key={application.id}
                application={application}
                hideHeading
                onCancel={() => setIsEditing(false)}
                onCreated={() => {
                  onChanged();
                  setIsEditing(false);
                }}
              />
            </div>
          ) : (
            <>
              <div className={styles.summaryRow}>
                <div><span>Status</span><StatusBadge status={application.status} /></div>
                <div><span>Applied Date</span><strong>{application.appliedDate}</strong></div>
              </div>

              <div className={styles.contentTabs} role="tablist" aria-label="Application content">
                <button
                  id="application-job-description-tab"
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'jobDescription'}
                  aria-controls="application-job-description-panel"
                  onClick={() => setDetailTab('jobDescription')}
                >
                  Job Description
                </button>
                <button
                  id="application-notes-tab"
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'notes'}
                  aria-controls="application-notes-panel"
                  onClick={() => setDetailTab('notes')}
                >
                  Notes
                </button>
                <button
                  id="application-schedule-tab"
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'schedule'}
                  aria-controls="application-schedule-panel"
                  onClick={() => setDetailTab('schedule')}
                >
                  Schedule
                </button>
              </div>

              <div
                id="application-job-description-panel"
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby="application-job-description-tab"
                hidden={detailTab !== 'jobDescription'}
              >
                <section className={styles.contentSection} aria-labelledby="job-description-title">
                  <div className={styles.sectionHeading}>
                    <h3 id="job-description-title">Job Description</h3>
                    {editingSection !== 'jobDescription' && <WorkspaceActionButton icon="edit" onClick={() => beginSectionEdit('jobDescription')}>
                      Edit
                    </WorkspaceActionButton>}
                  </div>
                  {editingSection === 'jobDescription' ? <form className={styles.inlineEditor} onSubmit={event => void saveSection(event, 'jobDescription')}>
                    <textarea aria-label="Job Description" rows={14} maxLength={20000} value={contentDraft} disabled={savingSection} onChange={event => setContentDraft(event.target.value)} />
                    {sectionError && <p className={styles.sectionError} role="alert">{sectionError}</p>}
                    <div><button type="submit" disabled={savingSection}>{savingSection ? 'Saving...' : 'Save Changes'}</button>
                      <button type="button" disabled={savingSection} onClick={() => setEditingSection(null)}>Cancel</button></div>
                  </form> : jobDescription ? <p>{jobDescription}</p> : <WorkspaceEmptyState
                    icon="document"
                    title="No job description yet"
                    description="Add the role description to keep the opportunity details in one place."
                  />}
                </section>
              </div>

              <div
                id="application-notes-panel"
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby="application-notes-tab"
                hidden={detailTab !== 'notes'}
              >
                <section className={styles.contentSection} aria-labelledby="application-notes-title">
                  <div className={styles.sectionHeading}>
                    <h3 id="application-notes-title">Notes</h3>
                    {editingSection !== 'notes' && <WorkspaceActionButton icon="edit" onClick={() => beginSectionEdit('notes')}>
                      Edit
                    </WorkspaceActionButton>}
                  </div>
                  {editingSection === 'notes' ? <form className={styles.inlineEditor} onSubmit={event => void saveSection(event, 'notes')}>
                    <textarea aria-label="Notes" rows={7} maxLength={2000} value={contentDraft} disabled={savingSection} onChange={event => setContentDraft(event.target.value)} />
                    {sectionError && <p className={styles.sectionError} role="alert">{sectionError}</p>}
                    <div><button type="submit" disabled={savingSection}>{savingSection ? 'Saving...' : 'Save Changes'}</button>
                      <button type="button" disabled={savingSection} onClick={() => setEditingSection(null)}>Cancel</button></div>
                  </form> : notes ? <p>{notes}</p> : <WorkspaceEmptyState
                    icon="notes"
                    title="No notes yet"
                    description="Capture research, contacts, or preparation notes for this application."
                  />}
                </section>
              </div>

              <div
                id="application-schedule-panel"
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby="application-schedule-tab"
                hidden={detailTab !== 'schedule'}
              >
                <ApplicationSchedule application={application} onBusyChange={() => undefined} onChanged={() => {
                  setJourneyRevision(value => value + 1);
                  onChanged();
                }} />
              </div>
            </>
          )}
        </div>
        <ApplicationTimeline
          application={application}
          refreshToken={journeyRevision}
          onChanged={onChanged}
        />
      </div>
    </article>
  </section>;
}
