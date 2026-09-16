import { useEffect, useRef, useState } from 'react';
import { getApplications } from '../api/applications';
import type { JobApplication } from '../types/application';

export function useApplications() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeRequest = useRef<AbortController | null>(null);

  function refresh() {
    activeRequest.current?.abort();
    setError(null);
    setRefreshKey((current) => current + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;

    async function loadApplications() {
      try {
        const data = await getApplications(controller.signal);

        if (!controller.signal.aborted) {
          setApplications(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred.',
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadApplications();

    return () => controller.abort();
  }, [refreshKey]);

  return { applications, loading, error, refresh };
}
