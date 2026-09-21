import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './WorkspaceActionButton.module.scss';

type ActionIcon = 'add' | 'edit';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon: ActionIcon;
  variant?: 'accent' | 'neutral';
}

function ActionIconGraphic({ icon }: { icon: ActionIcon }) {
  if (icon === 'add') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 16.5-.7 4.2 4.2-.7L19 8.5 15.5 5 4 16.5Z" />
      <path d="m13.8 6.7 3.5 3.5" />
    </svg>
  );
}

export default function WorkspaceActionButton({
  children,
  className,
  icon,
  type = 'button',
  variant = 'neutral',
  ...buttonProps
}: Props) {
  const buttonClassName = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClassName} type={type} {...buttonProps}>
      <ActionIconGraphic icon={icon} />
      <span>{children}</span>
    </button>
  );
}
