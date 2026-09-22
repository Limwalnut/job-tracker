import type { ReactNode } from 'react';
import { Link } from 'react-router';
import BrandLogo from '../BrandLogo/BrandLogo';
import PageMetadata from '../PageMetadata/PageMetadata';
import styles from './LegalPage.module.scss';

interface Props {
  canonicalPath: string;
  children: ReactNode;
  description: string;
  eyebrow: string;
  introduction: string;
  lastUpdated: string;
  title: string;
}

export default function LegalPage({
  canonicalPath,
  children,
  description,
  eyebrow,
  introduction,
  lastUpdated,
  title,
}: Props) {
  return (
    <div className={styles.page}>
      <PageMetadata
        canonicalPath={canonicalPath}
        description={description}
        title={`${title} | Applyline`}
      />

      <header className={styles.header}>
        <div className={styles.shell}>
          <Link className={styles.brand} to="/" aria-label="Applyline home">
            <BrandLogo tone="dark" />
          </Link>
          <Link className={styles.backLink} to="/">Back to home</Link>
        </div>
      </header>

      <main className={`${styles.shell} ${styles.main}`}>
        <header className={styles.introduction}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.summary}>{introduction}</p>
          <p className={styles.updated}>Last updated: {lastUpdated}</p>
        </header>

        <article className={styles.content}>{children}</article>
      </main>

      <footer className={styles.footer}>
        <div className={styles.shell}>
          <p>© {new Date().getFullYear()} Applyline</p>
          <nav aria-label="Legal navigation">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <a href="mailto:support@applyline.app">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
