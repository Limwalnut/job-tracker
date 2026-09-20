import { useEffect, useRef, useState } from 'react';
import { getApplications, updateApplicationStatus } from '../api/applications';
import type { ApplicationStatus, JobApplication } from '../types/application';

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

  async function changeStatus(id: number, status: ApplicationStatus) {
    let previousStatus: ApplicationStatus | undefined;

    setApplications((current) => current.map((application) => {
      if (application.id !== id) return application;
      previousStatus = application.status;
      return { ...application, status };
    }));

    try {
      await updateApplicationStatus(id, status);
    } catch (error) {
      const rollbackStatus = previousStatus;

      if (rollbackStatus) {
        setApplications((current) => current.map((application) =>
          application.id === id && application.status === status
            ? { ...application, status: rollbackStatus }
            : application,
        ));
      }

      throw error;
    }
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

  return { applications, loading, error, refresh, changeStatus };
}
