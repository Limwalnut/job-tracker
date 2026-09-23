import { useEffect, useRef, useState } from 'react';
import { getPagedApplications } from '../api/applications';
import type {
  ApplicationScope,
  ApplicationSort,
  ApplicationStatus,
  PagedApplicationsResponse,
} from '../types/application';

const pageSize = 20;
const emptyCounts = {
  activeCount: 0,
  closedCount: 0,
  allCount: 0,
};

export function usePagedApplications() {
  const [data, setData] = useState<PagedApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScopeState] = useState<ApplicationScope>('active');
  const [status, setStatusState] = useState<ApplicationStatus | null>(null);
  const [sort, setSortState] = useState<ApplicationSort>('newest');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPageState] = useState(1);
  const [revision, setRevision] = useState(0);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const nextSearch = searchInput.trim();
    if (nextSearch === search) return;

    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      setSearch(nextSearch);
      setPageState(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;

    getPagedApplications({
      page,
      pageSize,
      scope,
      status,
      search,
      sort,
      signal: controller.signal,
    })
      .then(response => {
        if (controller.signal.aborted) return;
        setData(response);
        if (response.page !== page) setPageState(response.page);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error
            ? requestError.message
            : 'Unable to load applications.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, revision, scope, search, sort, status]);

  function setScope(nextScope: ApplicationScope) {
    setLoading(true);
    setError(null);
    setScopeState(nextScope);
    setStatusState(null);
    setPageState(1);
  }

  function setStatus(nextStatus: ApplicationStatus | null) {
    setLoading(true);
    setError(null);
    setStatusState(nextStatus);
    setPageState(1);
  }

  function setSort(nextSort: ApplicationSort) {
    setLoading(true);
    setError(null);
    setSortState(nextSort);
    setPageState(1);
  }

  function setPage(nextPage: number) {
    setLoading(true);
    setError(null);
    setPageState(Math.max(1, nextPage));
  }

  function refresh() {
    setLoading(true);
    setError(null);
    setRevision(current => current + 1);
  }

  function clearFilters() {
    setLoading(true);
    setError(null);
    setStatusState(null);
    setSearchInput('');
    setSearch('');
    setSortState('newest');
    setPageState(1);
  }

  return {
    applications: data?.items ?? [],
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 1,
    counts: data ? {
      activeCount: data.activeCount,
      closedCount: data.closedCount,
      allCount: data.allCount,
    } : emptyCounts,
    loading,
    error,
    scope,
    status,
    sort,
    searchInput,
    setScope,
    setStatus,
    setSort,
    setSearchInput,
    setPage,
    refresh,
    clearFilters,
  };
}
