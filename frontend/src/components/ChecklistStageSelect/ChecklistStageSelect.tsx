import { Dropdown } from 'antd';
import { applicationStatuses, type ApplicationStatus } from '../../types/application';
import styles from './ChecklistStageSelect.module.scss';

interface Props {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const stageOptions = ['General', ...applicationStatuses];

function statusClass(stage: string): ApplicationStatus | 'General' {
  return applicationStatuses.includes(stage as ApplicationStatus)
    ? stage as ApplicationStatus
    : 'General';
}

export default function ChecklistStageSelect({ value, disabled = false, onChange }: Props) {
  const options = stageOptions.includes(value) ? stageOptions : [value, ...stageOptions];
  const selectedClass = statusClass(value);

  return <Dropdown
    disabled={disabled}
    placement="bottomLeft"
    trigger={['click']}
    autoAdjustOverflow
    classNames={{ root: styles.popup }}
    menu={{
      selectable: true,
      selectedKeys: [value],
      items: options.map(stage => {
        const stageClass = statusClass(stage);
        return {
          key: stage,
          label: <span className={styles.option}>
            <span className={`${styles.dot} ${styles[`dot${stageClass}`]}`} aria-hidden="true" />
            <span>{stage}</span>
            {stage === value && <span className={styles.check} aria-hidden="true">✓</span>}
          </span>,
        };
      }),
      onClick: ({ key }) => { if (key !== value) onChange(key); },
    }}
  >
    <button
      type="button"
      className={`${styles.trigger} ${styles[selectedClass]}`}
      disabled={disabled}
      aria-label="Stage"
    >
      <span className={styles.selected}>
        <span className={`${styles.dot} ${styles[`dot${selectedClass}`]}`} aria-hidden="true" />
        <span>{value}</span>
      </span>
      <svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1.5 1.5 4.5 4 4.5-4" /></svg>
    </button>
  </Dropdown>;
}
