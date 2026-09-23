import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAnimatedDismiss(onDismiss: () => void, duration = 180) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const dismiss = useCallback((afterDismiss?: () => void) => {
    if (timerRef.current !== null) return;

    const finish = afterDismiss ?? onDismissRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      finish();
      return;
    }

    setClosing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setClosing(false);
      finish();
    }, duration);
  }, [duration]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return { closing, dismiss };
}
