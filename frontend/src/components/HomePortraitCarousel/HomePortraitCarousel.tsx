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
    },
    {
      id: 'teacher',
      role: 'Teacher',
      image: teacherPortrait,
    },
    {
      id: 'lawyer',
      role: 'Lawyer',
      image: lawyerPortrait,
    },
    {
      id: 'civil-engineer',
      role: 'Civil engineer',
      image: civilEngineerPortrait,
    },
    {
      id: 'healthcare-professional',
      role: 'Healthcare professional',
      image: healthcarePortrait,
    },
    {
      id: 'architect',
      role: 'Architect',
      image: architectPortrait,
    },
  ];
  
  const desktopVisibleSlides = 5;
  const slideWidthPercentage = 100 / desktopVisibleSlides;
  const autoplayDelay = 4500;
  const stageCount = 5;
  
  function HomePortraitCarousel() {
    const [trackIndex, setTrackIndex] = useState(portraits.length);
    const [transitionEnabled, setTransitionEnabled] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [activeStageIndex, setActiveStageIndex] = useState(0);
  
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
  
                return (
                  <article
                    className={styles.slide}
                    key={`${groupIndex}-${portrait.id}`}
                    aria-hidden={isClone}
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
