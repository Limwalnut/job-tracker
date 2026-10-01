import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { generateInterviewPreparation, type InterviewPreparationResult } from '../../api/interviewPreparation';
import { createChecklistItem, getChecklistItems } from '../../api/checklist';
import useAnimatedDismiss from '../../hooks/useAnimatedDismiss';
import { isDialogBackdropPointer } from '../../utils/dialog';
import styles from './InterviewPreparationDialog.module.scss';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    const payload = error.payload;
    if (typeof payload === 'object' && payload !== null && 'resetAtUtc' in payload
      && typeof payload.resetAtUtc === 'string') {
      const resetAt = new Date(payload.resetAtUtc);
      if (!Number.isNaN(resetAt.getTime())) {
        return `Daily preparation limit reached. You can try again after ${new Intl.DateTimeFormat(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(resetAt)}.`;
      }
    }
    return 'Daily preparation limit reached. Please try again later.';
  }
  if (error instanceof ApiError && error.status === 503) {
    return 'Interview preparation is temporarily unavailable. Please try again later.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function normalizeTitle(title: string) {
  return title.trim().toLocaleLowerCase();
}

export default function InterviewPreparationDialog({ onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const generationInFlight = useRef(false);
  const saveInFlight = useRef(false);
  const [result, setResult] = useState<InterviewPreparationResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set());
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(() => new Set());
  const [existingIndexes, setExistingIndexes] = useState<Set<number>>(() => new Set());
  const { closing, dismiss } = useAnimatedDismiss(onClose);
  const busy = generating || saving;
  const advice = result?.advice ?? null;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const suggestions = advice?.suggestedChecklistItems.filter((item, index, items) =>
    items.findIndex(candidate => normalizeTitle(candidate.title) === normalizeTitle(item.title)) === index,
  ) ?? [];

  function requestClose() {
    if (!busy && !closing) dismiss();
  }

  async function generate() {
    if (generationInFlight.current || busy) return;
    generationInFlight.current = true;
    setGenerating(true);
    setResult(null);
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setSelectedIndexes(new Set());
    setSavedIndexes(new Set());
    setExistingIndexes(new Set());
    try {
      const nextResult = await generateInterviewPreparation();
      setResult(nextResult);
      if (!nextResult.completed || !nextResult.advice) {
        setError('We could not prepare a reliable plan this time. Please try again.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      generationInFlight.current = false;
      setGenerating(false);
    }
  }

  function toggleSuggestion(index: number) {
    setSelectedIndexes(current => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function addSelectedItems() {
    if (saveInFlight.current || busy || !advice?.applicationId) return;
    const pendingIndexes = [...selectedIndexes]
      .filter(index => !savedIndexes.has(index) && !existingIndexes.has(index));
    if (pendingIndexes.length === 0) return;

    saveInFlight.current = true;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    let existingItems;
    try {
      existingItems = await getChecklistItems(advice.applicationId);
    } catch (requestError) {
      setSaveError(`Could not check the current checklist. ${getErrorMessage(requestError)}`);
      setSaving(false);
      saveInFlight.current = false;
      return;
    }

    const knownTitles = new Set(existingItems.map(item => normalizeTitle(item.title)));
    const savedThisRun = new Set<number>();
    const alreadyPresentThisRun = new Set<number>();
    const failures: string[] = [];

    for (const index of pendingIndexes) {
      const item = suggestions[index];
      if (!item) continue;
      const normalizedTitle = normalizeTitle(item.title);
      if (knownTitles.has(normalizedTitle)) {
        alreadyPresentThisRun.add(index);
        continue;
      }

      try {
        await createChecklistItem(advice.applicationId, {
          title: item.title,
          dueDate: item.dueDate,
        });
        knownTitles.add(normalizedTitle);
        savedThisRun.add(index);
      } catch (requestError) {
        failures.push(`${item.title}: ${getErrorMessage(requestError)}`);
      }
    }

    setSavedIndexes(current => new Set([...current, ...savedThisRun]));
    setExistingIndexes(current => new Set([...current, ...alreadyPresentThisRun]));
    const successfulCount = savedThisRun.size + alreadyPresentThisRun.size;
    if (savedThisRun.size > 0) onSaved();

    if (failures.length > 0) {
      setSaveError(`Some items could not be added. ${failures.join(' ')}`);
    }
    if (successfulCount > 0) {
      setSaveMessage(`${savedThisRun.size} item${savedThisRun.size === 1 ? '' : 's'} added; ${alreadyPresentThisRun.size} already on the checklist.`);
    }

    setSaving(false);
    saveInFlight.current = false;
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-closing={closing}
      aria-labelledby="interview-preparation-title"
      onPointerDown={event => { if (isDialogBackdropPointer(event)) requestClose(); }}
      onCancel={event => { event.preventDefault(); requestClose(); }}
    >
      <div className={styles.heading}>
        <div>
          <p>Interview preparation</p>
          <h2 id="interview-preparation-title">Prepare for your next interview</h2>
        </div>
        <button type="button" onClick={requestClose} disabled={busy || closing} aria-label="Close dialog">Close</button>
      </div>

      {(!result || !result.completed || !result.advice) && !generating && (
        <div className={styles.intro}>
          <p>{result
            ? 'We could not prepare a reliable plan. You can try again.'
            : 'Use your upcoming interview, job description and checklist to create a focused plan and practice questions.'}</p>
          <button type="button" className={styles.primary} onClick={() => void generate()}>
            {result || error ? 'Try again' : 'Generate preparation'}
          </button>
        </div>
      )}
      {generating && <p className={styles.status} role="status">Preparing your interview plan…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {advice && result?.completed && (
        <div className={styles.content}>
          {advice.applicationId === null && (
            <p className={styles.notice}>No upcoming interview was found. Add a scheduled interview to an application for tailored preparation.</p>
          )}
          <section>
            <h3>Summary</h3>
            <p>{advice.summary}</p>
          </section>
          {advice.preparationPlan.length > 0 && (
            <section>
              <h3>Preparation plan</h3>
              <ol>{advice.preparationPlan.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
            </section>
          )}
          {advice.practiceQuestions.length > 0 && (
            <section>
              <h3>Practice questions</h3>
              <ol>{advice.practiceQuestions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}</ol>
            </section>
          )}
          {suggestions.length > 0 && advice.applicationId !== null && (
            <section>
              <h3>Checklist suggestions</h3>
              <p>Select the suggestions you want to add to this application.</p>
              <ul className={styles.suggestions}>
                {suggestions.map((item, index) => {
                  const alreadySaved = savedIndexes.has(index) || existingIndexes.has(index);
                  return <li key={`${index}-${item.title}`}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedIndexes.has(index)}
                        disabled={busy || alreadySaved}
                        onChange={() => toggleSuggestion(index)}
                      />
                      <span>{item.title}{item.dueDate && <small>Due {item.dueDate}</small>}</span>
                    </label>
                    {alreadySaved && <span className={styles.saved}>Already on checklist</span>}
                  </li>;
                })}
              </ul>
              <button
                type="button"
                className={styles.primary}
                disabled={busy || ![...selectedIndexes].some(index =>
                  !savedIndexes.has(index) && !existingIndexes.has(index))}
                onClick={() => void addSelectedItems()}
              >
                {saving ? 'Adding selected items…' : 'Add selected items'}
              </button>
              <p className={styles.confirmation}>Only the items you select will be saved.</p>
              {saveMessage && <p className={styles.success} role="status">{saveMessage}</p>}
              {saveError && <p className={styles.error} role="alert">{saveError}</p>}
            </section>
          )}
        </div>
      )}

      <div className={styles.footer}>
        <button type="button" onClick={requestClose} disabled={busy || closing}>Close</button>
      </div>
    </dialog>
  );
}
