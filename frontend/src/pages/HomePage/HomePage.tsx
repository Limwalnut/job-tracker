import { Link } from 'react-router';
import styles from './HomePage.module.scss';
import HomePortraitCarousel from '../../components/HomePortraitCarousel/HomePortraitCarousel';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import HowItWorks from '../../components/HowItWorks/HowItWorks';
import WhyApplyline from '../../components/WhyApplyline/WhyApplyline';
import { useAuth } from '../../auth/useAuth';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import PageMetadata from '../../components/PageMetadata/PageMetadata';

function HomePage() {
  const { user } = useAuth();
  const primaryDestination = user ? '/applications' : '/register';

  return (
    <div className={styles.page}>
      <PageMetadata
        canonicalPath="/"
        description="Applyline keeps job applications, interviews and every next step moving in one clear direction."
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

          <div className={styles.accountActions}>
            <Link
              className={styles.signInLink}
              to={user ? '/applications' : '/login'}
            >
              {user ? user.email : 'Sign in'}
            </Link>

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
              Track applications, interviews and every next step—all moving in one clear direction.
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
