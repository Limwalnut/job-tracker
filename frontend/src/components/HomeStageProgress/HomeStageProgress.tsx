import styles from './HomeStageProgress.module.scss';

const stages = [
  'Applied',
  'Screening',
  'Assessment',
  'Interview',
  'Offer',
];

type HomeStageProgressProps = {
  activeStageIndex: number;
};

function HomeStageProgress({ activeStageIndex }: HomeStageProgressProps) {
  return (
    <div className={styles.progress} aria-label="Application progress">
      <ol className={styles.stageList}>
        {stages.map((stage, index) => {
          const stateClass =
            index < activeStageIndex
              ? styles.completed
              : index === activeStageIndex
                ? styles.active
                : styles.upcoming;

          return (
            <li
              className={`${styles.stage} ${stateClass}`}
              key={stage}
              aria-current={index === activeStageIndex ? 'step' : undefined}
            >
              <span className={styles.node} aria-hidden="true" />
              <span className={styles.stageLabel}>{stage}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default HomeStageProgress;
