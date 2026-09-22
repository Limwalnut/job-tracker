import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { register } from '../../api/auth';
import { useAuth } from '../../auth/useAuth';
import styles from '../AuthPage.module.scss';
import BrandLogo from '../../components/BrandLogo/BrandLogo';

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const normalizedEmail = email.trim();
      await register(normalizedEmail, password);
      await login(normalizedEmail, password, false);
      navigate('/applications', { replace: true });
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : 'Unable to create your account. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} to="/">
        <BrandLogo tone="light" />
      </Link>

      <section className={styles.card} aria-labelledby="register-title">
        <p className={styles.eyebrow}>Start your search</p>
        <h1 id="register-title">Create account</h1>
        <p className={styles.introduction}>
          Keep every application, interview and next step in one place.
        </p>

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

          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-help"
              required
            />
          </label>
          <p className={styles.help} id="password-help">
            Use uppercase, lowercase, a number and a symbol.
          </p>

          <label className={styles.field}>
            <span>Confirm password</span>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className={styles.error} role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.alternative}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
