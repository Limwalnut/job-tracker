import { Link } from 'react-router';
import BrandLogo from '../BrandLogo/BrandLogo';
import styles from './SiteFooter.module.scss';

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.identity}>
          <Link to="/" aria-label="Applyline home">
            <BrandLogo tone="light" />
          </Link>
          <p>Every opportunity, moving in one clear direction.</p>
        </div>

        <nav aria-label="Footer navigation">
          <div>
            <span>Product</span>
            <a href="#how-it-works">How it works</a>
            <a href="#why-applyline">Why Applyline</a>
          </div>
          <div>
            <span>Company</span>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <div>
            <span>Contact</span>
            <a href="mailto:support@applyline.app">support@applyline.app</a>
          </div>
        </nav>
      </div>

      <div className={`${styles.shell} ${styles.footnote}`}>
        <span>© {new Date().getFullYear()} Applyline</span>
        <span>Built for a clearer job search.</span>
      </div>
    </footer>
  );
}
