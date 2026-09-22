import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import styles from '../AuthPage.module.scss';
import { ApiError } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import BrandLogo from '../../components/BrandLogo/BrandLogo';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email.trim(), password, rememberMe);
      navigate('/applications', { replace: true });
    } catch (problem) {
      if (problem instanceof ApiError && problem.status === 401) {
        setError('Email or password is incorrect.');
      } else {
        setError('Unable to sign in right now. Please try again.');
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

      <section className={styles.card} aria-labelledby="login-title">
        <p className={styles.eyebrow}>Welcome back</p>
        <h1 id="login-title">Sign in</h1>
        <p className={styles.introduction}>
          Sign in to manage your applications and upcoming interviews.
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className={styles.rememberMe}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me for 7 days</span>
          </label>

          {error && (
            <p className={styles.error} role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.alternative}>
          Do not have an account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
