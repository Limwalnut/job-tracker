import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import styles from './HomePage.module.scss';
import HomePortraitCarousel from '../../components/HomePortraitCarousel/HomePortraitCarousel';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import HowItWorks from '../../components/HowItWorks/HowItWorks';
import WhyApplyline from '../../components/WhyApplyline/WhyApplyline';
import { useAuth } from '../../auth/useAuth';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import PageMetadata from '../../components/PageMetadata/PageMetadata';
import { userDisplayName, userInitials } from '../../utils/userPresentation';
import useAnimatedDismiss from '../../hooks/useAnimatedDismiss';

function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const { closing: accountMenuClosing, dismiss: dismissAccountMenu } = useAnimatedDismiss(() => {
    if (accountMenuRef.current) accountMenuRef.current.open = false;
  }, 150);
  const primaryDestination = user ? '/applications' : '/register';

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const menu = accountMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        dismissAccountMenu();
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      const menu = accountMenuRef.current;
      if (event.key === 'Escape' && menu?.open) {
        dismissAccountMenu(() => {
          menu.open = false;
          menu.querySelector('summary')?.focus();
        });
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [dismissAccountMenu]);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.page}>
      <PageMetadata
        canonicalPath="/"
        description="Applyline is a job application tracker for organizing roles, application stages, interview schedules, notes and follow-ups in one place."
        title="Applyline — Job Application Tracker"
      />
      <header className={styles.header}>
        <div className={styles.shell}>
          <Link className={styles.brand} to="/">
            <BrandLogo tone="light" />
          </Link>

          <nav className={styles.navigation} aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#why-applyline">Why Applyline</a>
          </nav>

          <div className={styles.accountActions} data-authenticated={Boolean(user)}>
            {!user && <Link
              className={styles.signInLink}
              to="/login"
            >
              Sign in
            </Link>}

            {user && <details ref={accountMenuRef} className={styles.accountMenu} data-closing={accountMenuClosing}>
              <summary aria-label="Open account menu" onClick={event => {
                const menu = accountMenuRef.current;
                if (!menu) return;
                event.preventDefault();
                if (menu.open) dismissAccountMenu();
                else menu.open = true;
              }}>
                <span aria-hidden="true">{userInitials(user)}</span>
              </summary>
              <div className={styles.accountMenuPanel}>
                <div>
                  <strong>{userDisplayName(user)}</strong>
                  <small>{user.email}</small>
                </div>
                <Link to="/account" onClick={event => { event.preventDefault(); dismissAccountMenu(() => navigate('/account')); }}>Account settings</Link>
                <Link to="/applications" onClick={event => { event.preventDefault(); dismissAccountMenu(() => navigate('/applications')); }}>Open tracker</Link>
                <button type="button" onClick={() => dismissAccountMenu(() => void handleLogout())}>Sign out</button>
              </div>
            </details>}

            <Link className={styles.startLink} to={primaryDestination}>
              <span>{user ? 'Open tracker' : 'Start free'}</span>
              <span className={styles.compactArrow} aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Your search, in motion</p>

            <h1 className={styles.heroTitle}>
              <span className={styles.titleLine}>
                <span className={styles.titleText}>Keep Every</span>
              </span>
              <span className={styles.titleLine}>
                <span className={styles.titleText}>Opportunity Moving.</span>
              </span>
            </h1>

            <p className={styles.heroDescription}>
              Track job applications, interviews and next steps—all in one clear direction.
            </p>

            <Link className={styles.heroAction} to={primaryDestination}>
              <span>{user ? 'Open your tracker' : 'Build your path'}</span>
              <span className={styles.actionArrow} aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
        <HomePortraitCarousel />
        <HowItWorks />
        <WhyApplyline
          ctaDestination={primaryDestination}
          ctaLabel={user ? 'Open your tracker' : 'Build your path'}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

export default HomePage;
