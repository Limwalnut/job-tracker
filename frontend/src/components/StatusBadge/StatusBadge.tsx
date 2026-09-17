import type { ApplicationStatus } from '../../types/application';
import styles from './StatusBadge.module.scss';

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{status}</span>;
}

export function StatusOption({ status }: { status: ApplicationStatus }) {
  return <span className={`${styles.option} ${styles[status]}`}>{status}</span>;
}
