import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent, TouchEvent, TransitionEvent } from 'react';
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
  
const mobilePortraitIds = [
  'healthcare-professional',
  'teacher',
  'civil-engineer',
  'software-engineer',
  'architect',
];

const mobilePortraits = mobilePortraitIds.map((id) => (
  portraits.find((portrait) => portrait.id === id)!
));

const desktopVisibleSlides = 5;
const tabletVisibleSlides = 3;
const desktopAutoplayDelay = 2500;
const mobileAutoplayDelay = 4200;
const stageCount = 5;
const swipeThreshold = 44;

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
    const [isTablet, setIsTablet] = useState(false);
    const [activeStageIndex, setActiveStageIndex] = useState(0);
    const [interactiveSlideIndex, setInteractiveSlideIndex] = useState<number | null>(null);
    const animationLocked = useRef(false);
    const touchStartX = useRef<number | null>(null);
    const [autoplayResetKey, setAutoplayResetKey] = useState(0);
  
    useEffect(() => {
      const mobileMediaQuery = window.matchMedia('(max-width: 600px)');
      const tabletMediaQuery = window.matchMedia(
        '(min-width: 601px) and (max-width: 900px)',
      );
  
      let animationFrameId = 0;

      const updateLayout = () => {
        const mobile = mobileMediaQuery.matches;
        const tablet = tabletMediaQuery.matches;
        setIsMobile(mobile);
        setIsTablet(tablet);
        setTransitionEnabled(false);
        setTrackIndex(mobile ? mobilePortraits.length : portraits.length);
        setActiveStageIndex(0);
        setInteractiveSlideIndex(null);
        animationLocked.current = false;
        animationFrameId = window.requestAnimationFrame(() => {
          setTransitionEnabled(true);
        });
      };
  
      updateLayout();
      mobileMediaQuery.addEventListener('change', updateLayout);
      tabletMediaQuery.addEventListener('change', updateLayout);
  
      return () => {
        window.cancelAnimationFrame(animationFrameId);
        mobileMediaQuery.removeEventListener('change', updateLayout);
        tabletMediaQuery.removeEventListener('change', updateLayout);
      };
    }, []);

    const visiblePortraits = isMobile ? mobilePortraits : portraits;
    const visibleSlideCount = isTablet
      ? tabletVisibleSlides
      : desktopVisibleSlides;
    const slideWidthPercentage = 100 / visibleSlideCount;
  
    const moveNext = useCallback(() => {
      if (animationLocked.current) {
        return;
      }
  
      animationLocked.current = true;
      setTransitionEnabled(true);
      setTrackIndex((currentIndex) => currentIndex + 1);
      setActiveStageIndex((currentIndex) => (currentIndex + 1) % stageCount);
    }, []);

    const movePrevious = useCallback(() => {
      if (animationLocked.current) {
        return;
      }

      animationLocked.current = true;
      setTransitionEnabled(true);
      setTrackIndex((currentIndex) => currentIndex - 1);
      setActiveStageIndex((currentIndex) => (
        (currentIndex - 1 + stageCount) % stageCount
      ));
    }, []);
  
    useEffect(() => {
      if (isPaused) {
        return;
      }

      const intervalId = window.setInterval(
        moveNext,
        isMobile ? mobileAutoplayDelay : desktopAutoplayDelay,
      );
  
      return () => {
        window.clearInterval(intervalId);
      };
    }, [autoplayResetKey, isMobile, isPaused, moveNext]);
  
    const handleTransitionEnd = (
      event: TransitionEvent<HTMLDivElement>,
    ) => {
      if (event.target !== event.currentTarget) {
        return;
      }
  
      animationLocked.current = false;
  
      if (trackIndex >= visiblePortraits.length * 2) {
        setTransitionEnabled(false);
        setTrackIndex(visiblePortraits.length);
        return;
      }
  
      if (trackIndex < visiblePortraits.length) {
        setTransitionEnabled(false);
        setTrackIndex(visiblePortraits.length * 2 - 1);
      }
    };
  
    const groups = [0, 1, 2];

    const moveManually = (direction: 'next' | 'previous') => {
      if (direction === 'next') {
        moveNext();
      } else {
        movePrevious();
      }
      setAutoplayResetKey((currentKey) => currentKey + 1);
    };

    const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
      if (touchStartX.current === null) return;

      const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
      const distance = endX - touchStartX.current;
      touchStartX.current = null;

      if (Math.abs(distance) < swipeThreshold) return;
      moveManually(distance < 0 ? 'next' : 'previous');
    };

    const handleTouchCancel = () => {
      touchStartX.current = null;
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveManually('next');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveManually('previous');
      }
    };
  
    const trackStyle = isMobile
      ? {
          transform: `translate3d(-${trackIndex * 100}%, 0, 0)`,
        }
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
        onMouseEnter={() => {
          if (!isMobile) setIsPaused(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) {
            setInteractiveSlideIndex(null);
            setIsPaused(false);
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <div
          className={styles.viewport}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          <div
            className={`${styles.track} ${
              transitionEnabled ? '' : styles.trackWithoutTransition
            }`}
            style={trackStyle}
            onTransitionEnd={handleTransitionEnd}
          >
            {groups.map((groupIndex) =>
              visiblePortraits.map((portrait, portraitIndex) => {
                const isClone = groupIndex !== 1;
                const absoluteIndex = groupIndex * visiblePortraits.length + portraitIndex;
                const isStageActive = isMobile
                  ? absoluteIndex === trackIndex
                  : absoluteIndex === (
                      interactiveSlideIndex
                        ?? trackIndex + (isTablet ? 1 : activeStageIndex)
                    );
  
                return (
                  <article
                    className={`${styles.slide} ${isStageActive ? styles.stageActive : ''}`}
                    key={`${groupIndex}-${portrait.id}`}
                    aria-hidden={isClone}
                    aria-label={isClone ? undefined : `${portrait.role}: ${portrait.cardLabel}`}
                    tabIndex={isClone ? -1 : 0}
                    onMouseEnter={() => {
                      if (!isMobile) setInteractiveSlideIndex(absoluteIndex);
                    }}
                    onFocus={() => {
                      setIsPaused(true);
                      if (!isMobile) setInteractiveSlideIndex(absoluteIndex);
                    }}
                    onBlur={() => {
                      setIsPaused(false);
                      setInteractiveSlideIndex(null);
                    }}
                  >
                    <img
                      src={portrait.image}
                      alt={isClone ? '' : portrait.role}
                      loading={groupIndex === 1 && portraitIndex === 0 ? 'eager' : 'lazy'}
                      fetchPriority={groupIndex === 1 && portraitIndex === 0 ? 'high' : undefined}
                    />
                    {portraitCard(portrait.id)}
                  </article>
                );
              }),
            )}
          </div>

          {isMobile && (
            <div className={styles.mobileControls}>
              <button
                type="button"
                aria-label="Previous story"
                onClick={() => moveManually('previous')}
              >
                ←
              </button>
              <span aria-live="polite">
                {String(activeStageIndex + 1).padStart(2, '0')}
                <i aria-hidden="true" />
                {String(stageCount).padStart(2, '0')}
              </span>
              <button
                type="button"
                aria-label="Next story"
                onClick={() => moveManually('next')}
              >
                →
              </button>
            </div>
          )}
        </div>
        <HomeStageProgress activeStageIndex={activeStageIndex} />
      </section>
    );
}
  
export default HomePortraitCarousel;
