import styles from './BrandLogo.module.scss';

interface Props {
  className?: string;
  compact?: boolean;
  tone?: 'dark' | 'light';
}

export default function BrandLogo({
  className,
  compact = false,
  tone = 'dark',
}: Props) {
  const logoClassName = [
    styles.logo,
    styles[tone],
    compact ? styles.compact : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={logoClassName} aria-label="Applyline">
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <path className={styles.letter} d="M10.5 35.5 20.5 12l10 23.5" />
          <path className={styles.route} d="M15 27h23" />
          <circle className={styles.routeNode} cx="16" cy="27" r="2" />
          <circle className={styles.routeNode} cx="23" cy="27" r="1.7" />
          <circle className={styles.routeNode} cx="30" cy="27" r="1.7" />
          <circle className={styles.finalNode} cx="38" cy="27" r="3.2" />
        </svg>
      </span>
      <span className={styles.wordmark}>Applyline</span>
    </span>
  );
}
