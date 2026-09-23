import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { requestPasswordReset } from '../../api/auth';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import styles from '../AuthPage.module.scss';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch {
      setError('Unable to send a reset email right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} to="/">
        <BrandLogo tone="light" />
      </Link>

      <section className={styles.card} aria-labelledby="forgot-password-title">
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 id="forgot-password-title">Reset your password</h1>
        <p className={styles.introduction}>
          Enter your email and we will send you a secure password reset link.
        </p>

        {submitted ? (
          <div className={styles.confirmation} role="status">
            <strong>Check your inbox</strong>
            <p>
              If an Applyline account exists for <strong>{email.trim()}</strong>,
              you will receive a reset link shortly.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Email address</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </label>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <button className={styles.submit} type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <p className={styles.alternative}>
          Remembered your password? <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}
