import { Dropdown } from 'antd';
import { applicationStatuses } from '../../types/application';
import type { ApplicationStatus } from '../../types/application';
import styles from './ApplicationStatusSelect.module.scss';

interface Props {
  value: ApplicationStatus;
  disabled?: boolean;
  busy?: boolean;
  fieldSize?: boolean;
  ariaLabel: string;
  onChange: (status: ApplicationStatus) => void;
}

export default function ApplicationStatusSelect({ value, disabled = false, busy = false, fieldSize = false, ariaLabel, onChange }: Props) {
  return (
    <Dropdown
      disabled={disabled}
      placement="bottomLeft"
      trigger={['click']}
      autoAdjustOverflow
      classNames={{ root: styles.statusPopup }}
      menu={{
        selectable: true,
        selectedKeys: [value],
        items: applicationStatuses.map((status) => ({
          key: status,
          label: (
            <span className={styles.statusOption}>
              <span className={`${styles.statusDot} ${styles[`dot${status}`]}`} aria-hidden="true" />
              <span>{status}</span>
              {status === value && <span className={styles.statusCheck} aria-hidden="true">✓</span>}
            </span>
          ),
        })),
        onClick: ({ key }) => {
          if (key !== value) onChange(key as ApplicationStatus);
        },
      }}
    >
      <button
        type="button"
        className={`${styles.statusSelect} ${styles[value]} ${fieldSize ? styles.fieldSize : ''}`}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        <span className={styles.selectedStatus}>
          <span className={`${styles.statusDot} ${styles[`dot${value}`]}`} aria-hidden="true" />
          {value}
        </span>
        {busy
          ? <span className={styles.statusSpinner} aria-hidden="true" />
          : <span className={styles.statusChevron} aria-hidden="true">⌄</span>}
      </button>
    </Dropdown>
  );
}
