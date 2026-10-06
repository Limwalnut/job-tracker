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
        description="Track job applications, interviews, notes and follow-ups, then prepare for each role with a focused AI interview plan and practice questions."
        title="Applyline — Job Application Tracker"
      />
      <header className={styles.header}>
        <div className={styles.shell}>
          <Link className={styles.brand} to="/">
            <BrandLogo tone="light" />
          </Link>

          <nav className={styles.navigation} aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a className={styles.aiNavLink} href="#interview-preparation">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2 2.1 7.2 7.2 2.1-7.2 2.1L12 20.6l-2.1-7.2L2.7 11.3l7.2-2.1L12 2Z" /><path d="m19 15 .8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8L19 15Z" /></svg>
              AI Prepare
            </a>
            <a href="#why-applyline">Why Applyline</a>
            <Link to="/guide/job-application-tracking">Guide</Link>
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
              Track applications, interviews and next steps, then use AI interview prep to turn each role's details into a focused plan.
            </p>

            <Link className={styles.heroAction} to={primaryDestination}>
              <span>{user ? 'Open your tracker' : 'Build your path'}</span>
              <span className={styles.actionArrow} aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
        <HomePortraitCarousel />
        <HowItWorks />
        <section className={styles.preparationSection} id="interview-preparation" aria-labelledby="preparation-title">
          <div className={styles.preparationShell}>
            <div className={styles.preparationIntro}>
              <span className={styles.preparationEyebrow}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.1 7.2 7.2 2.1-7.2 2.1L12 20.6l-2.1-7.2L2.7 11.3l7.2-2.1L12 2Z" /><path d="m19 15 .8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8L19 15Z" /></svg>
                AI interview preparation
              </span>
              <h2 id="preparation-title">Walk into interviews prepared.</h2>
              <p>Turn an application’s job description, notes and checklist into preparation that fits the role. Start from any application—even before an interview is scheduled.</p>
              <ul className={styles.preparationFeatures}>
                <li><span aria-hidden="true">01</span><div><strong>Personalized preparation</strong><small>Bring the role’s details together in one focused plan.</small></div></li>
                <li><span aria-hidden="true">02</span><div><strong>Practice questions</strong><small>Rehearse questions shaped around the opportunity.</small></div></li>
                <li><span aria-hidden="true">03</span><div><strong>You choose what to save</strong><small>Review checklist suggestions and confirm the ones you want.</small></div></li>
              </ul>
              <Link className={styles.preparationAction} to={primaryDestination}>
                {user ? 'Open your applications' : 'Get started'} <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className={styles.preparationPreview} aria-label="Example interview preparation preview">
              <div className={styles.previewTopline}><span>EXAMPLE PREVIEW</span><span className={styles.previewSparkle} aria-hidden="true">✦</span></div>
              <div className={styles.previewRole}><span>APPLICATION</span><strong>Product Designer · Northstar</strong></div>
              <div className={styles.previewBlock}>
                <h3>Preparation plan</h3>
                <ol><li>Connect your recent work to the role’s product challenges.</li><li>Prepare a clear example of how you use research to guide decisions.</li></ol>
              </div>
              <div className={styles.previewBlock}>
                <h3>Practice question</h3>
                <p>How would you decide what to improve in a product experience?</p>
              </div>
              <div className={styles.previewSuggestion}><span className={styles.previewCheck} aria-hidden="true" /> <span><small>SUGGESTED CHECKLIST ITEM</small><strong>Choose a portfolio case study</strong></span><em>Review before adding</em></div>
              <p className={styles.previewDisclaimer}>Example content for illustration</p>
            </div>
          </div>
        </section>
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
