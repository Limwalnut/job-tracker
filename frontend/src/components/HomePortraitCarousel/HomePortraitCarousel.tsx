import {
    useCallback,
    useEffect,
    useRef,
    useState,
  } from 'react';
  import type { TransitionEvent, UIEvent } from 'react';
  import architectPortrait from '../../assets/home/portraits/architect.webp';
  import civilEngineerPortrait from '../../assets/home/portraits/civil-engineer.webp';
  import healthcarePortrait from '../../assets/home/portraits/healthcare-professional.webp';
  import lawyerPortrait from '../../assets/home/portraits/lawyer.webp';
  import softwareEngineerPortrait from '../../assets/home/portraits/software-engineer.webp';
  import teacherPortrait from '../../assets/home/portraits/teacher.webp';
  import HomeStageProgress from '../HomeStageProgress/HomeStageProgress';
  import styles from './HomePortraitCarousel.module.scss';
  
  const portraits = [
    {
      id: 'software-engineer',
      role: 'Software engineer',
      image: softwareEngineerPortrait,
      cardLabel: 'Upcoming technical interview',
    },
    {
      id: 'teacher',
      role: 'Teacher',
      image: teacherPortrait,
      cardLabel: 'Saved application note',
    },
    {
      id: 'lawyer',
      role: 'Lawyer',
      image: lawyerPortrait,
      cardLabel: 'Follow-up reminder',
    },
    {
      id: 'civil-engineer',
      role: 'Civil engineer',
      image: civilEngineerPortrait,
      cardLabel: 'Assessment checklist',
    },
    {
      id: 'healthcare-professional',
      role: 'Healthcare professional',
      image: healthcarePortrait,
      cardLabel: 'Recruiter contact',
    },
    {
      id: 'architect',
      role: 'Architect',
      image: architectPortrait,
      cardLabel: 'Offer received',
    },
  ];
  
  const desktopVisibleSlides = 5;
  const slideWidthPercentage = 100 / desktopVisibleSlides;
  const autoplayDelay = 2500;
  const stageCount = 5;

  function portraitCard(id: string) {
    switch (id) {
      case 'software-engineer':
        return <div className={`${styles.pathCard} ${styles.interviewCard}`}>
          <span className={styles.cardEyebrow}>Next interview</span>
          <div className={styles.interviewDetails}>
            <time dateTime="2026-09-24T10:30:00">
              <strong>24</strong>
              <span>SEP<br />TUE</span>
            </time>
            <div><strong>Technical interview</strong><span>10:30 AM · Online</span></div>
          </div>
        </div>;
      case 'teacher':
        return <div className={`${styles.pathCard} ${styles.noteCard}`}>
          <span className={styles.cardEyebrow}>Private note</span>
          <blockquote>“Ask about classroom support and mentoring.”</blockquote>
          <span className={styles.noteMeta}>Added after screening</span>
        </div>;
      case 'lawyer':
        return <div className={`${styles.pathCard} ${styles.followUpCard}`}>
          <div className={styles.followUpIcon} aria-hidden="true">↗</div>
          <div><span className={styles.cardEyebrow}>Follow-up</span><strong>Send thank-you note</strong></div>
          <span className={styles.dueBadge}>Due today</span>
        </div>;
      case 'civil-engineer':
        return <div className={`${styles.pathCard} ${styles.assessmentCard}`}>
          <span className={styles.cardEyebrow}>Assessment task</span>
          <strong>Project design exercise</strong>
          <ul>
            <li className={styles.taskDone}><i aria-hidden="true">✓</i> Brief reviewed</li>
            <li><i aria-hidden="true" /> Submit by Friday</li>
          </ul>
        </div>;
      case 'healthcare-professional':
        return <div className={`${styles.pathCard} ${styles.contactCard}`}>
          <span className={styles.cardEyebrow}>Recruiter contact</span>
          <div className={styles.contactDetails}>
            <span className={styles.avatar} aria-hidden="true">MR</span>
            <div><strong>Maya Reynolds</strong><span>Talent partner</span></div>
          </div>
          <span className={styles.contactSaved}>Email & phone saved</span>
        </div>;
      default:
        return <div className={`${styles.pathCard} ${styles.offerCard}`}>
          <span className={styles.cardEyebrow}>Milestone</span>
          <strong>Offer received</strong>
          <span>Review the details by Friday</span>
        </div>;
    }
  }
  
  function HomePortraitCarousel() {
    const [trackIndex, setTrackIndex] = useState(portraits.length);
    const [transitionEnabled, setTransitionEnabled] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeStageIndex, setActiveStageIndex] = useState(0);
    const [mobileSlideIndex, setMobileSlideIndex] = useState(0);
  
    const animationLocked = useRef(false);
  
    useEffect(() => {
      const mediaQuery = window.matchMedia('(max-width: 900px)');
  
      const updateLayout = () => {
        setIsMobile(mediaQuery.matches);
      };
  
      updateLayout();
      mediaQuery.addEventListener('change', updateLayout);
  
      return () => {
        mediaQuery.removeEventListener('change', updateLayout);
      };
    }, []);
  
    const moveNext = useCallback(() => {
      if (animationLocked.current || isMobile) {
        return;
      }
  
      animationLocked.current = true;
      setTransitionEnabled(true);
      setTrackIndex((currentIndex) => currentIndex + 1);
      setActiveStageIndex((currentIndex) => (currentIndex + 1) % stageCount);
    }, [isMobile]);
  
    useEffect(() => {
      if (isPaused || isMobile) {
        return;
      }
  
      const intervalId = window.setInterval(moveNext, autoplayDelay);
  
      return () => {
        window.clearInterval(intervalId);
      };
    }, [isMobile, isPaused, moveNext]);
  
    const handleTransitionEnd = (
      event: TransitionEvent<HTMLDivElement>,
    ) => {
      if (event.target !== event.currentTarget) {
        return;
      }
  
      animationLocked.current = false;
  
      if (trackIndex >= portraits.length * 2) {
        setTransitionEnabled(false);
        setTrackIndex(portraits.length);
        return;
      }
  
      if (trackIndex < portraits.length) {
        setTransitionEnabled(false);
        setTrackIndex(portraits.length * 2 - 1);
      }
    };
  
    const groups = isMobile ? [1] : [0, 1, 2];

    const handleMobileScroll = (event: UIEvent<HTMLDivElement>) => {
      if (!isMobile) {
        return;
      }

      const slideWidth = event.currentTarget.clientWidth * 0.72;
      const visibleSlideIndex = Math.round(
        event.currentTarget.scrollLeft / slideWidth,
      );

      setActiveStageIndex(visibleSlideIndex % stageCount);
      setMobileSlideIndex(visibleSlideIndex % portraits.length);
    };
  
    const trackStyle = isMobile
      ? undefined
      : {
          transform: `translate3d(-${
            trackIndex * slideWidthPercentage
          }%, 0, 0)`,
        };
  
    return (
      <section
        className={styles.carousel}
        id="product"
        aria-label="Profession portrait carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={styles.viewport} onScroll={handleMobileScroll}>
          <div
            className={`${styles.track} ${
              transitionEnabled ? '' : styles.trackWithoutTransition
            }`}
            style={trackStyle}
            onTransitionEnd={handleTransitionEnd}
          >
            {groups.map((groupIndex) =>
              portraits.map((portrait, portraitIndex) => {
                const isClone = groupIndex !== 1;
                const absoluteIndex = groupIndex * portraits.length + portraitIndex;
                const isStageActive = isMobile
                  ? groupIndex === 1 && portraitIndex === mobileSlideIndex
                  : absoluteIndex === trackIndex + activeStageIndex;
  
                return (
                  <article
                    className={`${styles.slide} ${isStageActive ? styles.stageActive : ''}`}
                    key={`${groupIndex}-${portrait.id}`}
                    aria-hidden={isClone}
                    aria-label={isClone ? undefined : `${portrait.role}: ${portrait.cardLabel}`}
                    tabIndex={isClone ? -1 : 0}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                  >
                    <img
                      src={portrait.image}
                      alt={isClone ? '' : portrait.role}
                      loading={
                        groupIndex === 1 && portraitIndex < 5
                          ? 'eager'
                          : 'lazy'
                      }
                    />
                    {portraitCard(portrait.id)}
                  </article>
                );
              }),
            )}
          </div>
        </div>
        <HomeStageProgress activeStageIndex={activeStageIndex} />
      </section>
    );
  }
  
  export default HomePortraitCarousel;
