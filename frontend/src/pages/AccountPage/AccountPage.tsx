import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { getAccount, updatePassword, updateProfile, type AccountDetails } from '../../api/auth';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import { useAuth } from '../../auth/useAuth';
import { userDisplayName, userInitials } from '../../utils/userPresentation';
import styles from './AccountPage.module.scss';
import PersonalApiTokens from './PersonalApiTokens';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [tokenRefreshKey, setTokenRefreshKey] = useState(0);
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'tokens'>('profile');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getAccount()
      .then(data => {
        if (controller.signal.aborted) return;
        setAccount(data);
        setDisplayName(data.displayName ?? '');
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setPageError(error instanceof Error ? error.message : 'Unable to load account settings.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError('');
    setProfileMessage('');

    try {
      const updated = await updateProfile(displayName.trim());
      setAccount(updated);
      setDisplayName(updated.displayName ?? '');
      await refreshUser();
      setProfileMessage('Profile updated.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to update your profile.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordBusy(true);
    try {
      const updated = await updatePassword(
        account?.hasPassword ? currentPassword : null,
        newPassword,
      );
      setAccount(updated);
      setTokenRefreshKey(current => current + 1);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage(account?.hasPassword ? 'Password changed.' : 'Password sign-in added.');
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to update your password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function signOut() {
    await logout();
    navigate('/', { replace: true });
  }

  const presentedUser = user ?? account;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} to="/"><BrandLogo compact tone="light" /></Link>
        <div className={styles.headerActions}>
          <Link to="/applications">Back to tracker</Link>
          {presentedUser && <span className={styles.headerAvatar} aria-hidden="true">{userInitials(presentedUser)}</span>}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.heading}>
          <h1>Account settings</h1>
          <span>Manage your profile, sign-in methods, and API access.</span>
        </div>

        {loading && <section className={styles.state} role="status">Loading account settings…</section>}
        {!loading && pageError && <section className={styles.state} role="alert">{pageError}</section>}

        {account && <div className={styles.settingsLayout}>
          <nav className={styles.sectionNav} aria-label="Account settings sections">
            {([
              ['profile', 'Profile'],
              ['security', 'Security'],
              ['tokens', 'API tokens'],
            ] as const).map(([section, label]) => (
              <button
                key={section}
                type="button"
                className={activeSection === section ? styles.activeNavButton : undefined}
                aria-current={activeSection === section ? 'page' : undefined}
                onClick={() => setActiveSection(section)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className={styles.sectionContent}>
            {activeSection === 'profile' && <section className={`${styles.card} ${styles.profileCard}`} aria-labelledby="profile-settings-title">
              <div className={styles.cardHeading}>
                <h2 id="profile-settings-title">Profile</h2>
              </div>

              <form className={styles.form} onSubmit={saveProfile}>
                <label>
                  <span>Display name</span>
                  <input
                    type="text"
                    value={displayName}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="How should we address you?"
                    onChange={event => setDisplayName(event.target.value)}
                  />
                  <small>This name appears in your Applyline workspace.</small>
                </label>
                <label>
                  <span>Email address</span>
                  <input type="email" value={account.email} disabled />
                  <small>Your email is currently used as your account identifier.</small>
                </label>

                {profileError && <p className={styles.error} role="alert">{profileError}</p>}
                {profileMessage && <p className={styles.success} role="status">{profileMessage}</p>}

                <button type="submit" disabled={profileBusy}>
                  {profileBusy ? 'Saving…' : 'Save profile'}
                </button>
              </form>

              <div className={styles.sessionSummary}>
                <div><strong>Signed in as {userDisplayName(account)}</strong><span>{account.email}</span></div>
                <button type="button" className={styles.secondaryButton} onClick={() => void signOut()}>Sign out</button>
              </div>
            </section>}

            {activeSection === 'security' && <section className={styles.card} aria-labelledby="security-settings-title">
              <div className={styles.cardHeading}>
                <h2 id="security-settings-title">Security</h2>
              </div>

              <h3 className={styles.subheading}>Sign-in methods</h3>
              <div className={styles.methods}>
                <div>
                  <span className={styles.methodMark} aria-hidden="true">G</span>
                  <span><strong>Google</strong><small>{account.googleConnected ? 'Connected' : 'Not connected'}</small></span>
                  <span className={styles.methodStatus} data-active={account.googleConnected}>{account.googleConnected ? 'Active' : 'Unavailable'}</span>
                </div>
                <div>
                  <span className={styles.methodMark} aria-hidden="true">••</span>
                  <span><strong>Email and password</strong><small>{account.hasPassword ? 'Available for sign in' : 'Add as a backup method'}</small></span>
                  <span className={styles.methodStatus} data-active={account.hasPassword}>{account.hasPassword ? 'Active' : 'Not set'}</span>
                </div>
              </div>

              <div className={styles.passwordSection}>
                <div className={styles.passwordHeading}>
                  <div>
                    <h3>{account.hasPassword ? 'Password' : 'Password sign-in'}</h3>
                    <p>{account.hasPassword ? 'Update the password used to sign in.' : 'Add password sign-in as a backup to your Google account.'}</p>
                  </div>
                  <button type="button" className={styles.secondaryButton} aria-expanded={showPasswordForm} aria-controls="password-update-form" onClick={() => {
                    const opening = !showPasswordForm;
                    setShowPasswordForm(opening);
                    if (!opening) {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }
                    setPasswordError('');
                    setPasswordMessage('');
                  }}>
                    {showPasswordForm ? 'Cancel' : account.hasPassword ? 'Change password' : 'Add password'}
                  </button>
                </div>

                <form id="password-update-form" hidden={!showPasswordForm} className={`${styles.form} ${styles.passwordForm}`} onSubmit={savePassword}>
                  {account.hasPassword && <label>
                    <span>Current password</span>
                    <input type="password" autoComplete="current-password" maxLength={256} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required />
                  </label>}
                  <label>
                    <span>New password</span>
                    <input type="password" autoComplete="new-password" minLength={6} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} required />
                    <small>Use uppercase, lowercase, a number and a symbol.</small>
                  </label>
                  <label>
                    <span>Confirm new password</span>
                    <input type="password" autoComplete="new-password" minLength={6} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required />
                  </label>

                  {passwordError && <p className={styles.error} role="alert">{passwordError}</p>}

                  <button type="submit" disabled={passwordBusy}>
                    {passwordBusy ? 'Updating…' : account.hasPassword ? 'Change password' : 'Set password'}
                  </button>
                </form>
                {passwordMessage && <p className={styles.success} role="status">{passwordMessage}</p>}
              </div>
            </section>}

            <PersonalApiTokens refreshKey={tokenRefreshKey} hidden={activeSection !== 'tokens'} />
          </div>
        </div>}
      </main>
    </div>
  );
}
