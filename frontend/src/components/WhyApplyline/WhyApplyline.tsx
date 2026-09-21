import { Link } from 'react-router';
import styles from './WhyApplyline.module.scss';

interface Props {
  ctaDestination: string;
  ctaLabel: string;
}

function ScatteredVisual() {
  return (
    <div className={`${styles.visual} ${styles.scatteredVisual}`} aria-hidden="true">
      <span className={styles.sourceEmail}>Inbox<strong>Interview details</strong></span>
      <span className={styles.sourceSheet}>Spreadsheet<strong>Applications.xlsx</strong></span>
      <span className={styles.sourceCalendar}>Calendar<strong>Follow up · Friday</strong></span>
      <span className={styles.sourceNotes}>Notes<strong>Questions to ask</strong></span>
      <i className={styles.dottedRoute} />
    </div>
  );
}

function ContextVisual() {
  return (
    <div className={`${styles.visual} ${styles.contextVisual}`} aria-hidden="true">
      <div className={styles.contextHeader}>
        <span>Product Engineer</span>
        <strong>Atlassian</strong>
        <em>Interviewing</em>
      </div>
      <div className={styles.contextGrid}>
        <span><small>Next event</small><strong>Technical interview</strong><em>24 Sept · 10:30</em></span>
        <span><small>Latest note</small><strong>Prepare system design examples</strong><em>Added today</em></span>
        <span><small>Contact</small><strong>Maya Reynolds</strong><em>Talent partner</em></span>
      </div>
    </div>
  );
}

function PathVisual() {
  const stages = ['Applied', 'Screening', 'Interview', 'Offer'];
  return (
    <div className={`${styles.visual} ${styles.pathVisual}`} aria-hidden="true">
      <div className={styles.pathLine}><i /></div>
      <ol>{stages.map((stage, index) => <li className={index === 2 ? styles.currentStage : ''} key={stage}><i /><span>{stage}</span></li>)}</ol>
      <div className={styles.nextStep}><span>Next step</span><strong>Technical interview</strong><small>Tomorrow · 10:30 AM</small></div>
    </div>
  );
}

export default function WhyApplyline({ ctaDestination, ctaLabel }: Props) {
  return (
    <section className={styles.section} id="why-applyline">
      <div className={styles.shell}>
        <header className={styles.intro}>
          <p>Why Applyline</p>
          <div>
            <h2>A job search should feel like progress, not scattered admin.</h2>
            <p>We designed Applyline to bring every application, conversation and next step into one clear path.</p>
          </div>
        </header>

        <div className={styles.narrative}>
          <aside className={styles.stickyCopy}>
            <span>Built for the real search</span>
            <h3>Opportunities rarely arrive in a neat order.</h3>
            <p>The tools around a job search hold fragments. Applyline keeps the whole story connected.</p>
          </aside>

          <div className={styles.reasons}>
            <article className={styles.reasonCard}>
              <header><span>01</span><em>The problem</em></header>
              <h3>Your job search is spread across too many places.</h3>
              <p>Job boards, inboxes, calendars, spreadsheets and notes each hold a different part of the story.</p>
              <ScatteredVisual />
            </article>

            <article className={styles.reasonCard}>
              <header><span>02</span><em>The idea</em></header>
              <h3>Every opportunity needs context.</h3>
              <p>An application is more than a company and a status. It includes conversations, preparation, deadlines and everything learned along the way.</p>
              <ContextVisual />
            </article>

            <article className={styles.reasonCard}>
              <header><span>03</span><em>The outcome</em></header>
              <h3>See where you are—and what comes next.</h3>
              <p>Applyline connects applications, events and progress, so your attention stays on the right opportunity.</p>
              <PathVisual />
            </article>
          </div>
        </div>

        <footer className={styles.finalCta}>
          <div><span>Your search, in motion</span><h2>Keep every opportunity moving.</h2></div>
          <Link to={ctaDestination}>
            <span>{ctaLabel}</span>
            <span className={styles.ctaArrow} aria-hidden="true">→</span>
          </Link>
        </footer>
      </div>
    </section>
  );
}
