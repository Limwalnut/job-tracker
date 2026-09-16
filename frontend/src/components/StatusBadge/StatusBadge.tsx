import type { ApplicationStatus } from '../../types/application';
import styles from './StatusBadge.module.scss';

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{status}</span>;
}
