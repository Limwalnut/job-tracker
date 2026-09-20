import { Select } from 'antd';
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
    <Select<ApplicationStatus>
      className={`${styles.statusSelect} ${styles[value]} ${fieldSize ? styles.fieldSize : ''}`}
      value={value}
      disabled={disabled}
      showSearch={false}
      placement="bottomLeft"
      listHeight={288}
      popupMatchSelectWidth={190}
      classNames={{ popup: { root: styles.statusPopup } }}
      aria-label={ariaLabel}
      suffixIcon={busy
        ? <span className={styles.statusSpinner} aria-hidden="true" />
        : <span className={styles.statusChevron} aria-hidden="true">⌄</span>}
      labelRender={({ value: selectedValue }) => {
        const status = selectedValue as ApplicationStatus;
        return <span className={styles.selectedStatus}>
          <span className={`${styles.statusDot} ${styles[`dot${status}`]}`} aria-hidden="true" />
          {status}
        </span>;
      }}
      optionRender={(option) => {
        const status = option.value as ApplicationStatus;
        return <span className={styles.statusOption}>
          <span className={`${styles.statusDot} ${styles[`dot${status}`]}`} aria-hidden="true" />
          <span>{status}</span>
          {status === value && <span className={styles.statusCheck} aria-hidden="true">✓</span>}
        </span>;
      }}
      options={applicationStatuses.map((status) => ({ value: status, label: status }))}
      onChange={onChange}
    />
  );
}
