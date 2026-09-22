import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { register } from '../../api/auth';
import { useAuth } from '../../auth/useAuth';
import styles from '../AuthPage.module.scss';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import GoogleSignInButton from '../../components/GoogleSignInButton/GoogleSignInButton';

function getGoogleError(code: string | null) {
  if (!code) return '';
  if (code === 'not_configured') return 'Google sign-up is not available yet.';
  if (code === 'email_unavailable') {
    return 'Google did not provide an email address for this account.';
  }
  return 'We could not create your account with Google. Please try again.';
}

function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(() => {
    const parameters = new URLSearchParams(window.location.search);
    return getGoogleError(parameters.get('googleError'));
  });
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

        <GoogleSignInButton label="Sign up with Google" />

        <div className={styles.divider} aria-hidden="true">
          <span>or sign up with email</span>
        </div>

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
