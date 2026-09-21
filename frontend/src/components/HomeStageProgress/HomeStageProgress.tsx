import type { CSSProperties } from 'react';
import styles from './HomeStageProgress.module.scss';

const stages = [
  { name: 'Applied', detail: 'Application sent' },
  { name: 'Screening', detail: 'Recruiter review' },
  { name: 'Assessment', detail: 'Skills in progress' },
  { name: 'Interview', detail: 'Conversation scheduled' },
  { name: 'Offer', detail: 'Decision in hand' },
];

type HomeStageProgressProps = {
  activeStageIndex: number;
};

function HomeStageProgress({ activeStageIndex }: HomeStageProgressProps) {
  const safeStageIndex = Math.min(
    Math.max(activeStageIndex, 0),
    stages.length - 1,
  );
  const progressStyle = {
    '--stage-progress': safeStageIndex === stages.length - 1
      ? '100%'
      : `${10 + safeStageIndex * 20}%`,
    '--traveller-left': `${10 + safeStageIndex * 20}%`,
  } as CSSProperties;

  return (
    <div
      className={styles.progress}
      aria-label="Application progress"
      style={progressStyle}
    >
      <span className={styles.railBase} aria-hidden="true" />
      <span className={styles.railProgress} aria-hidden="true" />

      <ol className={styles.stageList}>
        {stages.map((stage, index) => {
          const stateClass =
            index < safeStageIndex
              ? styles.completed
              : index === safeStageIndex
                ? styles.active
                : styles.upcoming;

          return (
            <li
              className={`${styles.stage} ${stateClass}`}
              key={stage.name}
              aria-current={index === safeStageIndex ? 'step' : undefined}
            >
              <span className={styles.node} aria-hidden="true" />
              <span className={styles.stageLabel}>
                <strong>{stage.name}</strong>
                <small>{stage.detail}</small>
              </span>
            </li>
          );
        })}
      </ol>

      <span className={styles.traveller} aria-hidden="true">
        <span className={styles.travellerPulse} key={safeStageIndex} />
        <span className={styles.travellerCore} />
      </span>
    </div>
  );
}

export default HomeStageProgress;
