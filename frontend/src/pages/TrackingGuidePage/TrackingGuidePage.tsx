import { Link } from 'react-router';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import PageMetadata from '../../components/PageMetadata/PageMetadata';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import styles from './TrackingGuidePage.module.scss';

const title = 'How to Track Job Applications | Applyline';
const description = 'A practical way to track job applications, interviews and follow-ups without losing the details behind each opportunity.';

export default function TrackingGuidePage() {
  return (
    <div className={styles.page}>
      <PageMetadata canonicalPath="/guide/job-application-tracking" description={description} title={title} />

      <header className={styles.header}>
        <div className={styles.shell}>
          <Link to="/" aria-label="Applyline home"><BrandLogo tone="dark" /></Link>
          <Link className={styles.homeLink} to="/">Back to home</Link>
        </div>
      </header>

      <main>
        <div className={`${styles.shell} ${styles.intro}`}>
          <p className={styles.eyebrow}>A clearer job search</p>
          <h1>How to track job applications without losing the next step</h1>
          <p className={styles.lede}>
            A useful tracker answers three questions at a glance: where did you apply, what happened next,
            and what do you need to do now? This simple workflow works whether you are managing a few roles
            or a busy search.
          </p>
        </div>

        <div className={`${styles.shell} ${styles.layout}`}>
          <nav className={styles.contents} aria-label="On this page">
            <span>In this guide</span>
            <a href="#capture">Capture the details</a>
            <a href="#stages">Track meaningful stages</a>
            <a href="#next-steps">Plan the next step</a>
            <a href="#review">Review your search</a>
          </nav>

          <article className={styles.article}>
            <section id="capture">
              <span className={styles.step}>01 / Capture</span>
              <h2>Save the details while the job listing is available</h2>
              <p>For each role, record the company, job title, date applied and a link to the listing. Save the job description too: listings can change or disappear before an interview.</p>
              <p>If a recruiter or hiring manager contacts you, add their name and contact details to that application. Keep a short note about where you found the role and anything you want to ask later.</p>
              <div className={styles.tip}><strong>A compact record</strong><span>Company · role · applied date · listing or description · contact · next action</span></div>
            </section>

            <section id="stages">
              <span className={styles.step}>02 / Progress</span>
              <h2>Update the stage when something actually changes</h2>
              <p>Start with “Applied”. Move the application forward when you receive a screening invitation, assessment, interview or offer. A status should describe the current position, not every email in the conversation.</p>
              <p>Keep context in notes instead: who you spoke with, what you learned and what you promised to send. This makes it easier to prepare for the next conversation without cluttering the status history.</p>
            </section>

            <section id="next-steps">
              <span className={styles.step}>03 / Plan</span>
              <h2>Give every commitment a date</h2>
              <p>When an interview, assessment or follow-up is agreed, add it to your schedule and connect it to the relevant application. Include the time, location or meeting link and any preparation you need to do.</p>
              <p>After an interview, write down the next expected response and plan when you will follow up. If the employer gives no date, choose a reasonable day to check in rather than relying on memory.</p>
            </section>

            <section id="review">
              <span className={styles.step}>04 / Review</span>
              <h2>Make a short weekly review part of the process</h2>
              <p>Scan your active applications and upcoming events once a week. Look for unanswered messages, approaching interviews and applications that need a follow-up. Close out roles that are no longer active so your view stays useful.</p>
              <p>Notice patterns, too. If many applications stop at the same stage, use that insight to improve the relevant part of your search rather than simply sending more applications.</p>
            </section>

            <aside className={styles.cta}>
              <div>
                <span>Put the workflow in one place</span>
                <h2>Track the role, the conversation and the next step together.</h2>
                <p>Applyline lets you keep application details, status history, notes and scheduled events connected.</p>
              </div>
              <Link to="/register">Start free <span aria-hidden="true">→</span></Link>
            </aside>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
