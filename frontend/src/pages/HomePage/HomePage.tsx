import { Link } from 'react-router';
import styles from './HomePage.module.scss';
import HomePortraitCarousel from '../../components/HomePortraitCarousel/HomePortraitCarousel';

function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.shell}>
          <Link className={styles.brand} to="/">
            JobTracker
          </Link>

          <nav className={styles.navigation} aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#stories">Stories</a>
          </nav>

          <div className={styles.accountActions}>
            <Link className={styles.signInLink} to="/login">
              Sign in
            </Link>

            <Link className={styles.startLink} to="/register">
              Start free
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
              Track applications, interviews and every next step—all moving
              in one clear direction.
            </p>

            <Link className={styles.heroAction} to="/register">
              Build your path
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
        <HomePortraitCarousel />
      </main>
    </div>
  );
}

export default HomePage;
