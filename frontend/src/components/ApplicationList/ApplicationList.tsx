import ApplicationRow from '../ApplicationRow/ApplicationRow';
import PrimaryActionButton from '../PrimaryActionButton/PrimaryActionButton';
import FilterSelect from '../FilterSelect/FilterSelect';
import { applicationStatuses } from '../../types/application';
import type {
  ApplicationScope,
  ApplicationSort,
  ApplicationStatus,
  JobApplication,
} from '../../types/application';
import styles from './ApplicationList.module.scss';

interface ApplicationListProps {
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  statusError: string | null;
  updatingStatusIds: Set<number>;
  scope: ApplicationScope;
  counts: { activeCount: number; closedCount: number; allCount: number };
  status: ApplicationStatus | null;
  sort: ApplicationSort;
  search: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onChanged: () => void;
  onAdd: () => void;
  onOpen: (id: number) => void;
  onStatusChange: (id: number, status: ApplicationStatus) => Promise<void>;
  onScopeChange: (scope: ApplicationScope) => void;
  onStatusFilterChange: (status: ApplicationStatus | null) => void;
  onSortChange: (sort: ApplicationSort) => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

const closedStatuses: ApplicationStatus[] = ['Accepted', 'Rejected', 'Withdrawn'];
const statusColors: Record<ApplicationStatus, string> = {
  Applied: '#3b82f6',
  Screening: '#06b6d4',
  Assessment: '#f59e0b',
  Interviewing: '#a855f7',
  Offer: '#22c55e',
  Accepted: '#059669',
  Rejected: '#ef4444',
  Withdrawn: '#64748b',
};

function visibleStatuses(scope: ApplicationScope) {
  if (scope === 'closed') return closedStatuses;
  if (scope === 'active') {
    return applicationStatuses.filter(status => !closedStatuses.includes(status));
  }
  return applicationStatuses;
}

function paginationItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const ordered = [...pages]
    .filter(value => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
  const result: Array<number | 'ellipsis'> = [];

  ordered.forEach((value, index) => {
    if (index > 0 && value - ordered[index - 1] > 1) result.push('ellipsis');
    result.push(value);
  });
  return result;
}

function ApplicationList({
  applications,
  loading,
  error,
  statusError,
  updatingStatusIds,
  scope,
  counts,
  status,
  sort,
  search,
  page,
  pageSize,
  totalCount,
  totalPages,
  onChanged,
  onAdd,
  onOpen,
  onStatusChange,
  onScopeChange,
  onStatusFilterChange,
  onSortChange,
  onSearchChange,
  onPageChange,
  onClearFilters,
}: ApplicationListProps) {
  const firstResult = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, totalCount);
  const hasFilters = Boolean(search || status || sort !== 'newest');
  const scopeOptions: Array<{ value: ApplicationScope; label: string; count: number }> = [
    { value: 'active', label: 'Active', count: counts.activeCount },
    { value: 'closed', label: 'Closed', count: counts.closedCount },
    { value: 'all', label: 'All', count: counts.allCount },
  ];

  return (
    <section className={styles.applicationsSection} aria-labelledby="applications-title">
      <div className={styles.heading}>
        <div>
          <h2 id="applications-title">Applications</h2>
          <p>Keep active opportunities in focus and closed outcomes within reach.</p>
        </div>
        <PrimaryActionButton onClick={onAdd}>Add application</PrimaryActionButton>
      </div>

      <div className={styles.scopeTabs} role="tablist" aria-label="Application groups">
        {scopeOptions.map(option => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={scope === option.value}
            data-active={scope === option.value}
            onClick={() => onScopeChange(option.value)}
          >
            <span>{option.label}</span>
            <strong>{option.count}</strong>
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <span className={styles.visuallyHidden}>Search applications</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" /></svg>
          <input
            type="search"
            value={search}
            placeholder="Search company or job title"
            onChange={event => onSearchChange(event.target.value)}
          />
        </label>

        <FilterSelect
          ariaLabel="Filter by status"
          value={status ?? ''}
          options={[
            { value: '', label: 'All statuses' },
            ...visibleStatuses(scope).map(option => ({
              value: option,
              label: option,
              dotColor: statusColors[option],
            })),
          ]}
          onChange={value => onStatusFilterChange(value ? value as ApplicationStatus : null)}
        />

        <FilterSelect
          ariaLabel="Sort applications"
          value={sort}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'company', label: 'Company A–Z' },
          ]}
          onChange={value => onSortChange(value as ApplicationSort)}
        />
      </div>

      {error && <p className={styles.errorMessage} role="alert">{error} <button type="button" onClick={onChanged}>Retry</button></p>}
      {statusError && <p className={styles.errorMessage} role="alert">{statusError}</p>}

      {loading ? (
        <p className={styles.loadingMessage} role="status">Loading applications…</p>
      ) : applications.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>{counts.allCount === 0
            ? 'No applications yet'
            : !hasFilters && scope === 'active'
              ? 'No active applications'
              : !hasFilters && scope === 'closed'
                ? 'No closed applications'
                : 'No applications found'}</h3>
          <p>{counts.allCount === 0
            ? 'Your job applications will appear here once you add them.'
            : scope === 'active' && !hasFilters
              ? 'New opportunities will appear here. Closed applications remain available in the Closed tab.'
            : scope === 'closed' && !hasFilters
              ? 'Rejected, withdrawn and accepted applications will appear here.'
              : 'Try changing your search or filters.'}</p>
          {counts.allCount > 0 && hasFilters && <button type="button" onClick={onClearFilters}>Clear filters</button>}
        </div>
      ) : (
        <>
          <p className={styles.applicationCount}>
            Showing {firstResult}–{lastResult} of {totalCount} {totalCount === 1 ? 'application' : 'applications'}
            <span aria-hidden="true"> · </span>
            <span>Select a row to view details</span>
          </p>

          <div className={styles.tableContainer} role="region" aria-label="Job applications" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Job Title</th>
                  <th scope="col">Status</th>
                  <th scope="col">Applied Date</th>
                  <th scope="col" className={styles.openColumn}><span className={styles.visuallyHidden}>Open application</span></th>
                </tr>
              </thead>

              <tbody>
                {applications.map(application => (
                  <ApplicationRow
                    key={application.id}
                    application={application}
                    updatingStatus={updatingStatusIds.has(application.id)}
                    onOpen={onOpen}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && <nav className={styles.pagination} aria-label="Application pages">
            <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button>
            <div>
              {paginationItems(page, totalPages).map((item, index) => item === 'ellipsis'
                ? <span key={`ellipsis-${index}`} aria-hidden="true">…</span>
                : <button
                    key={item}
                    type="button"
                    aria-current={item === page ? 'page' : undefined}
                    data-active={item === page}
                    onClick={() => onPageChange(item)}
                  >{item}</button>)}
            </div>
            <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
          </nav>}
        </>
      )}
    </section>
  );
}

export default ApplicationList;
