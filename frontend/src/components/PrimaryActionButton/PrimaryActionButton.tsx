import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './PrimaryActionButton.module.scss';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export default function PrimaryActionButton({ children, type = 'button', ...buttonProps }: Props) {
  return (
    <button className={styles.button} type={type} {...buttonProps}>
      <span className={styles.icon} aria-hidden="true">＋</span>
      <span>{children}</span>
    </button>
  );
}
