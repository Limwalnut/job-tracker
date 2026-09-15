import { createApplication, updateApplication } from '../../api/applications';
import { useState } from "react";
import type { SubmitEvent } from "react";
import type { CreateApplicationRequest, JobApplication } from "../../types/application";
import styles from "./ApplicationForm.module.scss";

interface ApplicationFormProps {
  onCreated: () => void;
  application?: JobApplication;
  onBusyChange?: (busy: boolean) => void;
}

function ApplicationForm({ onCreated, application, onBusyChange }: ApplicationFormProps) {
  const [companyName, setCompanyName] = useState(application?.companyName ?? "");
  const [jobTitle, setJobTitle] = useState(application?.jobTitle ?? "");
  const [appliedDate, setAppliedDate] = useState(application?.appliedDate ?? "");
  const [notes, setNotes] = useState(application?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!companyName.trim() || !jobTitle.trim() || !appliedDate) {
      setError("Please enter a company, job title, and application date.");
      return;
    }

    const request: CreateApplicationRequest = {
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      appliedDate,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    onBusyChange?.(true);

    try {
      if (application) {
        await updateApplication(application.id, request);
      } else {
        await createApplication(request);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to add application. Please try again."
      );
      return;
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }

    if (!application) {
    setCompanyName("");
    setJobTitle("");
    setAppliedDate("");
    setNotes("");
    }
    setSuccess(application ? "Application updated successfully." : "Application added successfully.");
    onCreated();
  }

  return (
    <section className={styles.card} aria-labelledby="application-form-title">
      <h2 id="application-form-title">{application ? "Edit Application" : "Add Application"}</h2>

      <form onSubmit={handleSubmit}>
        <fieldset className={styles.fields} disabled={submitting}>
          <div className={styles.grid}>
            <label className={styles.field} htmlFor="company-name">
              <span>Company</span>
              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className={styles.field} htmlFor="job-title">
              <span>Job Title</span>
              <input
                id="job-title"
                type="text"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className={styles.field} htmlFor="applied-date">
              <span>Applied Date</span>
              <input
                id="applied-date"
                type="date"
                value={appliedDate}
                onChange={(event) => setAppliedDate(event.target.value)}
                required
              />
            </label>

            <label
              className={`${styles.field} ${styles.fullWidth}`}
              htmlFor="notes"
            >
              <span>Notes (optional)</span>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                rows={3}
              />
            </label>
          </div>

          <button className={styles.submitButton} type="submit">
            {submitting ? "Saving..." : application ? "Save Changes" : "Add Application"}
          </button>
        </fieldset>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className={styles.success} role="status">
            {success}
          </p>
        )}
      </form>
    </section>
  );
}

export default ApplicationForm;
