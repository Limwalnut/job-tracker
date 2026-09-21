import styles from './WorkspaceEmptyState.module.scss';

type EmptyStateIcon = 'document' | 'notes' | 'schedule';

interface Props {
  className?: string;
  description: string;
  icon: EmptyStateIcon;
  title: string;
}

function EmptyStateIconGraphic({ icon }: { icon: EmptyStateIcon }) {
  if (icon === 'schedule') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
        <path d="M3 9h18M8 2v4M16 2v4M8 13h3M8 17h6" />
      </svg>
    );
  }

  if (icon === 'notes') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h11l3 3v15H5V3Z" />
        <path d="M15 3v4h4M8 11h8M8 15h8M8 19h5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h10l4 4v14H5V3Z" />
      <path d="M14 3v5h5M8 12h8M8 16h8" />
    </svg>
  );
}

export default function WorkspaceEmptyState({ className, description, icon, title }: Props) {
  const emptyStateClassName = [styles.emptyState, className].filter(Boolean).join(' ');

  return (
    <div className={emptyStateClassName}>
      <span className={styles.icon}>
        <EmptyStateIconGraphic icon={icon} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
