import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { resetPassword } from '../../api/auth';
import { ApiError } from '../../api/client';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import styles from '../AuthPage.module.scss';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const resetCode = searchParams.get('code') ?? '';
  const hasValidLink = Boolean(email && resetCode);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email, resetCode, password);
      setCompleted(true);
    } catch (problem) {
      if (problem instanceof ApiError && problem.status === 400) {
        const message = problem.message.toLowerCase();
        setError(message.includes('token')
          ? 'This reset link is invalid or has expired. Request a new link.'
          : problem.message);
      } else {
        setError('Unable to reset your password right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} to="/">
        <BrandLogo tone="light" />
      </Link>

      <section className={`${styles.card} ${styles.recoveryCard}`} aria-labelledby="reset-password-title">
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 className={styles.recoveryTitle} id="reset-password-title">Choose a new password</h1>

        {!hasValidLink ? (
          <>
            <p className={styles.error} role="alert">
              This reset link is incomplete or invalid.
            </p>
            <p className={styles.alternative}>
              <Link to="/forgot-password">Request a new reset link</Link>
            </p>
          </>
        ) : completed ? (
          <>
            <div className={styles.confirmation} role="status">
              <strong>Password updated</strong>
              <p>You can now sign in with your new password.</p>
            </div>
            <Link className={styles.primaryLink} to="/login">Continue to sign in</Link>
          </>
        ) : (
          <>
            <p className={styles.introduction}>
              Use at least eight characters with uppercase, lowercase, a number and a symbol.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>New password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoFocus
                />
              </label>

              <label className={styles.field}>
                <span>Confirm new password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>

              {error && <p className={styles.error} role="alert">{error}</p>}

              <button className={styles.submit} type="submit" disabled={submitting}>
                {submitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
