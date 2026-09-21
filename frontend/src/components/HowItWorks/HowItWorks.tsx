import { useEffect, useRef, useState } from 'react';
import styles from './HowItWorks.module.scss';

const steps = [
  {
    eyebrow: 'Capture',
    title: 'Save every opportunity in one place.',
    description: 'Record the company, role, application date and full job description before the listing disappears.',
    screen: 'applications',
  },
  {
    eyebrow: 'Progress',
    title: 'Keep every application moving.',
    description: 'Update each stage, preserve the complete timeline and always know where an opportunity stands.',
    screen: 'detail',
  },
  {
    eyebrow: 'Plan',
    title: 'Turn every next step into a clear plan.',
    description: 'Schedule interviews, assessments and follow-ups around the application they belong to.',
    screen: 'calendar',
  },
  {
    eyebrow: 'Understand',
    title: 'See the whole search clearly.',
    description: 'Use the dashboard to understand your pipeline, recent activity and where your attention is needed.',
    screen: 'dashboard',
  },
] as const;

type ScreenName = (typeof steps)[number]['screen'];

function ApplicationsScreen() {
  return (
    <div className={styles.productScreen}>
      <div className={styles.screenHeading}>
        <div><strong>Applications</strong></div>
        <button type="button" tabIndex={-1}>Add Application</button>
      </div>
      <p className={styles.applicationCount}>3 applications <span>· Select a row to view details</span></p>
      <div className={styles.tableHeader}><span>Company</span><span>Job Title</span><span>Status</span><span>Applied Date</span><span /></div>
      <div className={`${styles.tableRow} ${styles.highlightRow}`}>
        <span><b>Atlassian</b></span><span>Product Engineer</span><span><em className={styles.Applied}>Applied</em></span><span>18 Sept</span><span>→</span>
      </div>
      <div className={styles.tableRow}>
        <span><b>Canva</b></span><span>Full Stack Engineer</span><span><em className={styles.Screening}>Screening</em></span><span>15 Sept</span><span>→</span>
      </div>
      <div className={styles.tableRow}>
        <span><b>Xero</b></span><span>Software Engineer</span><span><em className={styles.Interviewing}>Interviewing</em></span><span>11 Sept</span><span>→</span>
      </div>
    </div>
  );
}

function DetailScreen() {
  return (
    <div className={styles.productScreen}>
      <div className={styles.detailHeading}>
        <div><span>Application details</span><strong>Product Engineer</strong><small>Atlassian</small></div>
        <button type="button" tabIndex={-1}>Edit application</button>
      </div>
      <div className={styles.detailMeta}>
        <div><span>Status</span><em className={styles.Offer}>Offer</em></div>
        <div><span>Applied date</span><b>18 September 2026</b></div>
      </div>
      <div className={styles.detailTabs}><b>Job Description</b><span>Notes</span><span>Schedule</span></div>
      <div className={styles.detailBody}>
        <div className={styles.descriptionPanel}>
          <strong>Job Description</strong>
          <p>Build reliable product experiences used by teams around the world.</p>
          <span /><span /><span className={styles.shortLine} />
        </div>
        <div className={`${styles.timelinePanel} ${styles.highlightPanel}`}>
          <div className={styles.timelineHeading}><span>Journey</span><strong>Application timeline</strong></div>
          <ol className={styles.previewTimeline}>
            <li><time>17 Sept 2026</time><i><b className={styles.Applied} /></i><div><em className={styles.Applied}>Applied</em><p>Application added</p></div></li>
            <li><time>21 Sept 2026<small>02:44 pm</small></time><i><b className={styles.Screening} /></i><div><em className={styles.Screening}>Screening</em><p>Moved from Applied</p></div></li>
            <li><time>21 Sept 2026<small>02:44 pm</small></time><i><b className={styles.Interviewing} /></i><div><em className={styles.Interviewing}>Interviewing</em><p>Moved from Screening</p></div></li>
            <li><time>21 Sept 2026<small>02:44 pm</small></time><i><b className={styles.Offer} /></i><div className={styles.currentTimelineEntry}><em className={styles.Offer}>Offer</em><p>Current stage</p><small>Moved from Interviewing</small><u>Undo status change</u></div></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function CalendarScreen() {
  const days = Array.from({ length: 35 }, (_, index) => index - 2);
  return (
    <div className={styles.productScreen}>
      <div className={styles.screenHeading}>
        <div><strong>September 2026</strong><span>Interview, assessment, and follow-up events.</span></div>
        <button type="button" tabIndex={-1}>Add Event</button>
      </div>
      <div className={styles.calendarToolbar}><div><span>Search company, role, or event</span><span>All event types⌄</span></div><nav><span>Previous</span><b>Today</b><span>Next</span></nav></div>
      <div className={styles.calendarWeek}><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
      <div className={styles.calendarGrid}>
        {days.map((day, index) => {
          const event = day === 8 ? 'Assessment due' : day === 15 ? 'Canva interview' : day === 22 ? 'Atlassian follow-up' : '';
          return <div className={event ? styles.eventDay : ''} key={index}><span>{day > 0 && day < 31 ? day : ''}</span>{event && <em>{event}</em>}</div>;
        })}
      </div>
    </div>
  );
}

function DashboardScreen() {
  return (
    <div className={styles.productScreen}>
      <div className={styles.screenHeading}>
        <div><span>Workspace / Dashboard</span><strong>Dashboard</strong></div>
      </div>
      <div className={styles.metrics}>
        <div><span>Total applications</span><strong>24</strong><small>All tracked roles</small></div>
        <div><span>Active pipeline</span><strong>17</strong><small>Still in progress</small></div>
        <div><span>Interviewing</span><strong>4</strong><small>Current interviews</small></div>
        <div><span>Offers</span><strong>2</strong><small>Received or accepted</small></div>
      </div>
      <div className={styles.dashboardPanels}>
        <div className={`${styles.pipelinePanel} ${styles.highlightPanel}`}>
          <span>Pipeline</span><strong>Applications by status</strong>
          {[76, 52, 38, 22].map((width, index) => <div key={width}><small>{['Applied', 'Screening', 'Assessment', 'Interviewing'][index]}</small><i><b style={{ width: `${width}%` }} /></i></div>)}
        </div>
        <div className={styles.recentPanel}><span>Latest activity</span><strong>Recent applications</strong><p>Atlassian <em>Assessment</em></p><p>Canva <em>Screening</em></p><p>Xero <em>Interviewing</em></p></div>
      </div>
    </div>
  );
}

function ProductScreen({ screen }: { screen: ScreenName }) {
  if (screen === 'applications') return <ApplicationsScreen />;
  if (screen === 'detail') return <DetailScreen />;
  if (screen === 'calendar') return <CalendarScreen />;
  return <DashboardScreen />;
}

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sectionElement = sectionRef.current;
    if (!sectionElement) return;

    const stepElements = Array.from(sectionElement.querySelectorAll<HTMLElement>('[data-how-step]'));
    const visualElement = sectionElement.querySelector<HTMLElement>('[data-how-visual]');
    let animationFrame = 0;

    function updateActiveStep() {
      animationFrame = 0;
      const visualBounds = visualElement?.getBoundingClientRect();
      const activationLine = visualBounds && visualBounds.height > 0
        ? visualBounds.top + visualBounds.height / 2
        : window.innerHeight * 0.48;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      stepElements.forEach((element, index) => {
        const copy = element.querySelector<HTMLElement>('[data-how-copy]');
        const bounds = (copy ?? element).getBoundingClientRect();
        const distance = Math.abs(bounds.top + bounds.height / 2 - activationLine);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActiveStep(current => current === nearestIndex ? current : nearestIndex);
    }

    function scheduleUpdate() {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateActiveStep);
    }

    updateActiveStep();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <section className={styles.section} id="how-it-works" ref={sectionRef}>
      <div className={styles.intro}>
        <p>How it works</p>
        <h2>From application to offer, without losing the thread.</h2>
        <span>Applyline turns a scattered job search into one clear, organized path.</span>
      </div>

      <div className={styles.story}>
        <div className={styles.steps}>
          {steps.map((step, index) => (
            <article className={`${styles.step} ${activeStep === index ? styles.activeStep : ''}`} data-how-step={index} key={step.title}>
              <div className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</div>
              <div data-how-copy><span>{step.eyebrow}</span><h3>{step.title}</h3><p>{step.description}</p></div>
              <div className={styles.mobileVisual}><div className={styles.browserFrame}><ProductScreen screen={step.screen} /></div></div>
            </article>
          ))}
        </div>

        <div className={styles.visualColumn}>
          <div className={styles.stickyVisual}>
            <div className={styles.browserFrame} data-how-visual>
              <div className={styles.screenStack}>
                {steps.map((step, index) => <div aria-hidden={activeStep !== index} className={`${styles.screenLayer} ${activeStep === index ? styles.activeScreen : ''}`} key={step.screen}><ProductScreen screen={step.screen} /></div>)}
              </div>
            </div>
            <div className={styles.visualProgress}><span>{String(activeStep + 1).padStart(2, '0')}</span><i><b style={{ transform: `scaleX(${(activeStep + 1) / steps.length})` }} /></i><span>{String(steps.length).padStart(2, '0')}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
