import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItems,
  updateChecklistItem,
} from '../../api/checklist';
import type { JobApplication } from '../../types/application';
import type { ChecklistItem, ChecklistItemRequest } from '../../types/checklist';
import ChecklistStageSelect from '../ChecklistStageSelect/ChecklistStageSelect';
import WorkspaceActionButton from '../WorkspaceActionButton/WorkspaceActionButton';
import WorkspaceEmptyState from '../WorkspaceEmptyState/WorkspaceEmptyState';
import styles from './ApplicationChecklist.module.scss';

interface Props {
  application: JobApplication;
}

const emptyDraft: ChecklistItemRequest = { title: '', stage: 'General', dueDate: null };

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`));
}

function isOverdue(item: ChecklistItem) {
  if (!item.dueDate || item.isCompleted) return false;
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return item.dueDate < localDate;
}

export default function ApplicationChecklist({ application }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [draft, setDraft] = useState<ChecklistItemRequest>(emptyDraft);
  const [showEditor, setShowEditor] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | 'form' | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getChecklistItems(application.id, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setItems(data);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Unable to load checklist.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [application.id, revision]);

  const incompleteItems = items.filter(item => !item.isCompleted);
  const completedItems = items.filter(item => item.isCompleted);
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ChecklistItem[]>();
    incompleteItems.forEach(item => groups.set(item.stage, [...(groups.get(item.stage) ?? []), item]));
    return [...groups.entries()];
  }, [incompleteItems]);
  const percentage = items.length === 0 ? 0 : Math.round((completedItems.length / items.length) * 100);

  function beginCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setShowEditor(true);
    setError(null);
  }

  function beginEdit(item: ChecklistItem) {
    setEditing(item);
    setDraft({ title: item.title, stage: item.stage, dueDate: item.dueDate });
    setShowEditor(true);
    setDeletingId(null);
    setError(null);
  }

  function closeEditor() {
    setEditing(null);
    setDraft(emptyDraft);
    setShowEditor(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = { ...draft, title: draft.title.trim(), stage: draft.stage.trim() || 'General' };
    if (!request.title || busyId) return;
    setBusyId('form');
    setError(null);
    try {
      if (editing) {
        await updateChecklistItem(editing.id, { ...request, isCompleted: editing.isCompleted });
      } else {
        await createChecklistItem(application.id, request);
      }
      closeEditor();
      setRevision(value => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save checklist item.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(item: ChecklistItem) {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      await updateChecklistItem(item.id, {
        title: item.title,
        stage: item.stage,
        dueDate: item.dueDate,
        isCompleted: !item.isCompleted,
      });
      setItems(current => current.map(candidate => candidate.id === item.id
        ? { ...candidate, isCompleted: !candidate.isCompleted }
        : candidate));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update checklist item.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: ChecklistItem) {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      await deleteChecklistItem(item.id);
      setItems(current => current.filter(candidate => candidate.id !== item.id));
      setDeletingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete checklist item.');
    } finally {
      setBusyId(null);
    }
  }

  function renderItem(item: ChecklistItem, completed = false) {
    const overdue = isOverdue(item);
    return <li key={item.id} className={styles.item} data-completed={completed || undefined}>
      <button
        type="button"
        className={styles.checkbox}
        aria-label={item.isCompleted ? `Reopen ${item.title}` : `Complete ${item.title}`}
        aria-pressed={item.isCompleted}
        disabled={busyId !== null}
        onClick={() => void toggle(item)}
      >
        {item.isCompleted && <span aria-hidden="true">✓</span>}
      </button>
      <div className={styles.itemContent}>
        <strong>{item.title}</strong>
        <div className={styles.itemMeta}>
          <span>{item.stage}</span>
          {item.dueDate && <time dateTime={item.dueDate} data-overdue={overdue || undefined}>
            {overdue ? 'Overdue · ' : 'Due '}{formatDueDate(item.dueDate)}
          </time>}
        </div>
      </div>
      <div className={styles.itemActions}>
        <button type="button" aria-label={`Edit ${item.title}`} disabled={busyId !== null} onClick={() => beginEdit(item)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.7 4.2 4.2-.7L19 8.5 15.5 5 4 16.5Z" /><path d="m13.8 6.7 3.5 3.5" /></svg>
        </button>
        <button type="button" className={styles.deleteButton} aria-label={`Delete ${item.title}`} disabled={busyId !== null} onClick={() => setDeletingId(item.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" /></svg>
        </button>
      </div>
      {deletingId === item.id && <div className={styles.deleteConfirmation}>
        <span>Delete this checklist item?</span>
        <button type="button" disabled={busyId !== null} onClick={() => void remove(item)}>Delete</button>
        <button type="button" disabled={busyId !== null} onClick={() => setDeletingId(null)}>Cancel</button>
      </div>}
    </li>;
  }

  return <section className={styles.checklist} aria-label="Application checklist">
    <div className={styles.heading}>
      <div>
        <h3>Checklist</h3>
        {items.length > 0 && <span>{completedItems.length} of {items.length} completed</span>}
      </div>
      {!showEditor && <WorkspaceActionButton icon="add" variant="accent" onClick={beginCreate}>Add Item</WorkspaceActionButton>}
    </div>

    {items.length > 0 && <div className={styles.progress} aria-label={`${percentage}% completed`}>
      <span style={{ width: `${percentage}%` }} />
    </div>}
    {error && <p className={styles.error} role="alert">{error}</p>}

    {showEditor && <form className={styles.editor} onSubmit={event => void save(event)}>
      <label className={styles.titleField}>
        <span>Checklist item</span>
        <input autoFocus value={draft.title} maxLength={200} disabled={busyId !== null}
          placeholder="What needs to be done?" onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} />
      </label>
      <label className={styles.stageField}>
        <span>Stage</span>
        <ChecklistStageSelect value={draft.stage} disabled={busyId !== null}
          onChange={stage => setDraft(current => ({ ...current, stage }))} />
      </label>
      <label>
        <span>Due date <small>Optional</small></span>
        <input type="date" value={draft.dueDate ?? ''} disabled={busyId !== null}
          onChange={event => setDraft(current => ({ ...current, dueDate: event.target.value || null }))} />
      </label>
      <div className={styles.formActions}>
        <button type="submit" disabled={!draft.title.trim() || busyId !== null}>{busyId === 'form' ? 'Saving...' : editing ? 'Save Changes' : 'Add Item'}</button>
        <button type="button" disabled={busyId !== null} onClick={closeEditor}>Cancel</button>
      </div>
    </form>}

    {loading && <p className={styles.loading} role="status">Loading checklist...</p>}
    {!loading && items.length === 0 && !showEditor && <WorkspaceEmptyState
      className={styles.empty}
      icon="notes"
      title="No checklist items yet"
      description="Add the next action you want to complete for this application."
    />}

    {!loading && groupedItems.map(([stage, stageItems]) => <section className={styles.group} key={stage}>
      <h4>{stage}</h4>
      <ul>{stageItems.map(item => renderItem(item))}</ul>
    </section>)}

    {completedItems.length > 0 && <details className={styles.completed}>
      <summary>Completed <span>{completedItems.length}</span></summary>
      <ul>{completedItems.map(item => renderItem(item, true))}</ul>
    </details>}
  </section>;
}
