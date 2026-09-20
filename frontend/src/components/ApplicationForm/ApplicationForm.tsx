import ApplicationStatusSelect from '../ApplicationStatusSelect/ApplicationStatusSelect';
import { createApplication, updateApplication } from '../../api/applications';
import { useId, useState } from "react";
import type { SubmitEvent } from "react";
import type { ApplicationStatus, CreateApplicationRequest, JobApplication } from "../../types/application";
import styles from "./ApplicationForm.module.scss";

interface ApplicationFormProps {
  onCreated: () => void;
  application?: JobApplication;
  disabled?: boolean;
  hideHeading?: boolean;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}

function ApplicationForm({ onCreated, application, hideHeading = false, onCancel, onBusyChange, disabled = false }: ApplicationFormProps) {
  const formId = useId();
  const today = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? "Applied");
  const [companyName, setCompanyName] = useState(application?.companyName ?? "");
  const [jobTitle, setJobTitle] = useState(application?.jobTitle ?? "");
  const [appliedDate, setAppliedDate] = useState(application?.appliedDate ?? today());
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState(application?.jobDescriptionUrl ?? "");
  const [contactName, setContactName] = useState(application?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(application?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(application?.contactEmail ?? "");
  const [jobDescription, setJobDescription] = useState(application?.jobDescription ?? "");
  const [notes, setNotes] = useState(application?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || disabled) {
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
      jobDescriptionUrl: jobDescriptionUrl.trim() || null,
      contactName: contactName.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim() || null,
      jobDescription: jobDescription.trim() || null,
      notes: notes.trim() || null,
    };

    setSubmitting(true);
    onBusyChange?.(true);

    try {
      if (application) {
        await updateApplication(application.id, { ...request, status });
      } else {
        await createApplication(request);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save application. Please try again."
      );
      return;
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }

    if (!application) {
    setCompanyName("");
    setJobTitle("");
    setAppliedDate(today());
    setJobDescriptionUrl("");
    setContactName("");
    setContactPhone("");
    setContactEmail("");
    setJobDescription("");
    setNotes("");
    }
    setSuccess(application ? "Application updated successfully." : "Application added successfully.");
    onCreated();
  }

  return (
    <section className={hideHeading ? styles.embedded : styles.card} aria-labelledby={hideHeading ? undefined : `${formId}-application-form-title`}>
      {!hideHeading && <h2 id={`${formId}-application-form-title`}>{application ? "Edit Application" : "Add Application"}</h2>}

      <form onSubmit={handleSubmit}>
        <fieldset className={styles.fields} disabled={submitting || disabled}>
          <div className={styles.grid}>
            <label className={styles.field} htmlFor={`${formId}-company-name`}>
              <span>Company</span>
              <input
                id={`${formId}-company-name`}
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className={styles.field} htmlFor={`${formId}-job-title`}>
              <span>Job Title</span>
              <input
                id={`${formId}-job-title`}
                type="text"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                maxLength={200}
                required
              />
            </label>

            <label className={styles.field} htmlFor={`${formId}-applied-date`}>
              <span>Applied Date</span>
              <input
                id={`${formId}-applied-date`}
                type="date"
                value={appliedDate}
                onChange={(event) => setAppliedDate(event.target.value)}
                required
              />
            </label>

            {application && (
              <div className={styles.field}>
                <span>Status</span>
                <ApplicationStatusSelect
                  value={status}
                  disabled={submitting || disabled}
                  busy={submitting || disabled}
                  fieldSize
                  ariaLabel="Application status"
                  onChange={setStatus}
                />
              </div>
            )}

            <label className={`${styles.field} ${styles.fullWidth}`} htmlFor={`${formId}-job-description-url`}>
              <span>Job Description Link <small>Optional</small></span>
              <input
                id={`${formId}-job-description-url`}
                type="url"
                value={jobDescriptionUrl}
                onChange={(event) => setJobDescriptionUrl(event.target.value)}
                maxLength={2000}
                placeholder="https://company.com/jobs/..."
              />
            </label>

            <label className={`${styles.field} ${styles.fullWidth}`} htmlFor={`${formId}-contact-name`}>
              <span>Contact Name <small>Optional</small></span>
              <input
                id={`${formId}-contact-name`}
                type="text"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                maxLength={200}
                autoComplete="name"
                placeholder="e.g. Alex Morgan"
              />
            </label>

            <label className={styles.field} htmlFor={`${formId}-contact-phone`}>
              <span>Contact Phone <small>Optional</small></span>
              <input
                id={`${formId}-contact-phone`}
                type="tel"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                maxLength={50}
                autoComplete="tel"
                placeholder="e.g. +61 400 000 000"
              />
            </label>

            <label className={styles.field} htmlFor={`${formId}-contact-email`}>
              <span>Contact Email <small>Optional</small></span>
              <input
                id={`${formId}-contact-email`}
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                maxLength={320}
                autoComplete="email"
                placeholder="recruiter@company.com"
              />
            </label>

            <label
              className={`${styles.field} ${styles.fullWidth}`}
              htmlFor={`${formId}-job-description`}
            >
              <span>Job Description</span>
              <textarea
                id={`${formId}-job-description`}
                className={styles.jobDescription}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                maxLength={20000}
                rows={10}
                placeholder="Paste the full job description here"
              />
            </label>

            {application && <label
              className={`${styles.field} ${styles.fullWidth}`}
              htmlFor={`${formId}-notes`}
            >
              <span>Notes <small>Optional</small></span>
              <textarea
                id={`${formId}-notes`}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                rows={3}
              />
            </label>}
          </div>

          <div className={styles.formActions}>
            <button className={styles.submitButton} type="submit">
              {submitting ? "Saving..." : application ? "Save Changes" : "Add Application"}
            </button>
            {onCancel && <button className={styles.secondaryButton} type="button" onClick={onCancel}>Cancel</button>}
          </div>
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
