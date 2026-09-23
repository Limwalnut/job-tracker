import type { ReactNode } from 'react';
import { Dropdown } from 'antd';
import styles from './FilterSelect.module.scss';

export interface FilterSelectOption<T extends string> {
  value: T;
  label: string;
  dotColor?: string;
}

interface Props<T extends string> {
  ariaLabel: string;
  value: T;
  options: FilterSelectOption<T>[];
  icon?: ReactNode;
  className?: string;
  onChange: (value: T) => void;
}

export default function FilterSelect<T extends string>({
  ariaLabel,
  value,
  options,
  icon,
  className = '',
  onChange,
}: Props<T>) {
  const selectedOption = options.find(option => option.value === value) ?? options[0];

  return (
    <Dropdown
      placement="bottomLeft"
      trigger={['click']}
      autoAdjustOverflow
      classNames={{ root: styles.popup }}
      menu={{
        selectable: true,
        selectedKeys: [value],
        items: options.map(option => ({
          key: option.value,
          label: (
            <span className={styles.option}>
              {option.dotColor && (
                <span className={styles.dot} style={{ backgroundColor: option.dotColor }} aria-hidden="true" />
              )}
              <span>{option.label}</span>
              {option.value === value && <span className={styles.check} aria-hidden="true">✓</span>}
            </span>
          ),
        })),
        onClick: ({ key }) => {
          if (key !== value) onChange(key as T);
        },
      }}
    >
      <button
        type="button"
        className={`${styles.trigger} ${className}`.trim()}
        aria-label={ariaLabel}
      >
        {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
        <span className={styles.value}>
          {selectedOption.dotColor && (
            <span className={styles.dot} style={{ backgroundColor: selectedOption.dotColor }} aria-hidden="true" />
          )}
          <span>{selectedOption.label}</span>
        </span>
        <svg className={styles.chevron} viewBox="0 0 12 8" aria-hidden="true">
          <path d="m1.5 1.5 4.5 4 4.5-4" />
        </svg>
      </button>
    </Dropdown>
  );
}
