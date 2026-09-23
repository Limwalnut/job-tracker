import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  getAdminOverview,
  getAdminUser,
  getAdminUsers,
  updateAdminUserStatus,
  type AdminOverview,
  type AdminUserDetail,
  type AdminUsersResponse,
} from '../../api/admin';
import { useAuth } from '../../auth/useAuth';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import styles from './AdminPage.module.scss';

type UserStatusFilter = 'all' | 'active' | 'disabled';

const dateFormatter = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : 'Never';
}

function formatTime(value: string | null) {
  return value ? timeFormatter.format(new Date(value)) : 'Never';
}

function AdminPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUsersResponse | null>(null);
  const [overviewError, setOverviewError] = useState('');
  const [usersError, setUsersError] = useState('');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<UserStatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);

  async function loadOverview() {
    setLoadingOverview(true);
    setOverviewError('');
    try {
      setOverview(await getAdminOverview());
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to load platform statistics.');
    } finally {
      setLoadingOverview(false);
    }
  }

  useEffect(() => {
    let active = true;
    getAdminOverview()
      .then(result => { if (active) setOverview(result); })
      .catch((error: unknown) => {
        if (active) setOverviewError(error instanceof Error ? error.message : 'Unable to load platform statistics.');
      })
      .finally(() => { if (active) setLoadingOverview(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getAdminUsers({ page, search, status })
      .then(result => { if (active) setUsers(result); })
      .catch((error: unknown) => {
        if (active) setUsersError(error instanceof Error ? error.message : 'Unable to load users.');
      })
      .finally(() => { if (active) setLoadingUsers(false); });
    return () => { active = false; };
  }, [page, search, status]);

  const maxTrend = useMemo(
    () => Math.max(1, ...(overview?.newUsers.map(point => point.count) ?? [1])),
    [overview],
  );
  const maxStatus = useMemo(
    () => Math.max(1, ...(overview?.applicationStatuses.map(item => item.count) ?? [1])),
    [overview],
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function openUser(id: string) {
    setSelectedUser(null);
    setDetailLoading(true);
    setDetailError('');
    try {
      setSelectedUser(await getAdminUser(id));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to load this user.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeAccountStatus() {
    if (!selectedUser || statusBusy) return;
    const shouldDisable = selectedUser.user.disabledAtUtc === null;
    const verb = shouldDisable ? 'disable' : 'restore';
    if (!window.confirm(`Are you sure you want to ${verb} ${selectedUser.user.email}?`)) return;

    setStatusBusy(true);
    setDetailError('');
    try {
      const updated = await updateAdminUserStatus(selectedUser.user.id, shouldDisable);
      setSelectedUser(updated);
      const refreshedUsers = await getAdminUsers({ page, search, status });
      setUsers(refreshedUsers);
      await loadOverview();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to update this account.');
    } finally {
      setStatusBusy(false);
    }
  }

  async function signOut() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} to="/"><BrandLogo compact tone="light" /></Link>
        <span className={styles.adminBadge}>Admin</span>
        <nav aria-label="Administrator navigation">
          <Link to="/applications">Tracker</Link>
          <Link to="/account">Account</Link>
          <button type="button" onClick={() => void signOut()}>Sign out</button>
        </nav>
      </header>

      <main className={styles.main}>
        <header className={styles.heading}>
          <div><p>Platform administration</p><h1>Operations overview</h1></div>
          <span>Signed in as {user?.email}</span>
        </header>

        {overviewError && <div className={styles.error} role="alert">{overviewError} <button type="button" onClick={() => void loadOverview()}>Retry</button></div>}
        {loadingOverview && <div className={styles.state} role="status">Loading platform statistics…</div>}

        {overview && <>
          <section className={styles.metrics} aria-label="Platform statistics">
            <article><span>Total users</span><strong>{overview.totalUsers}</strong><small>Registered accounts</small></article>
            <article><span>Active · 7 days</span><strong>{overview.activeUsers7Days}</strong><small>Recently seen users</small></article>
            <article><span>Active · 30 days</span><strong>{overview.activeUsers30Days}</strong><small>Monthly active users</small></article>
            <article><span>Applications</span><strong>{overview.totalApplications}</strong><small>Across all accounts</small></article>
            <article><span>Scheduled events</span><strong>{overview.totalEvents}</strong><small>Interviews and next steps</small></article>
            <article data-warning={overview.disabledUsers > 0}><span>Disabled users</span><strong>{overview.disabledUsers}</strong><small>Accounts without access</small></article>
          </section>

          <section className={styles.insights}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}><p>Last 14 days</p><h2>New users</h2></div>
              <div className={styles.trend} aria-label="New users over the last 14 days">
                {overview.newUsers.map((point, index) => <div key={point.date}>
                  <span className={styles.barValue}>{point.count}</span>
                  <span className={styles.bar} style={{ height: `${Math.max(5, point.count / maxTrend * 100)}%` }} />
                  <small>{index % 3 === 0 || index === overview.newUsers.length - 1
                    ? new Date(`${point.date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                    : ''}</small>
                </div>)}
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.panelHeading}><p>All applications</p><h2>Pipeline distribution</h2></div>
              <div className={styles.statusList}>
                {overview.applicationStatuses.map(item => <div key={item.status}>
                  <span>{item.status}</span><div><i style={{ width: `${item.count / maxStatus * 100}%` }} /></div><strong>{item.count}</strong>
                </div>)}
              </div>
            </article>
          </section>
        </>}

        <section className={styles.usersPanel} aria-labelledby="admin-users-title">
          <div className={styles.usersHeading}>
            <div><p>User management</p><h2 id="admin-users-title">Users</h2></div>
            <span>{users?.totalCount ?? 0} accounts</span>
          </div>

          <form className={styles.filters} onSubmit={submitSearch}>
            <label><span className={styles.visuallyHidden}>Search users</span><input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search email or display name" /></label>
            <button type="submit">Search</button>
            <label><span className={styles.visuallyHidden}>Account status</span><select value={status} onChange={event => { setStatus(event.target.value as UserStatusFilter); setPage(1); }}><option value="all">All accounts</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
          </form>

          {usersError && <div className={styles.error} role="alert">{usersError}</div>}
          {loadingUsers && <div className={styles.state} role="status">Loading users…</div>}
          {!loadingUsers && users && <>
            <div className={styles.tableScroll} role="region" aria-label="Applyline users" tabIndex={0}>
              <table>
                <thead><tr><th>User</th><th>Joined</th><th>Last active</th><th>Sign-in</th><th>Usage</th><th>Status</th><th><span className={styles.visuallyHidden}>Actions</span></th></tr></thead>
                <tbody>{users.items.map(item => <tr key={item.id}>
                  <td><strong>{item.displayName || 'Unnamed user'}</strong><span>{item.email}</span></td>
                  <td>{formatDate(item.createdAtUtc)}</td>
                  <td>{formatTime(item.lastSeenAtUtc)}</td>
                  <td><span className={styles.methods}>{item.googleConnected && 'Google'}{item.googleConnected && item.hasPassword && ' · '}{item.hasPassword && 'Password'}{!item.googleConnected && !item.hasPassword && '—'}</span></td>
                  <td>{item.applicationCount} apps · {item.eventCount} events</td>
                  <td><span className={styles.accountStatus} data-disabled={item.disabledAtUtc !== null}>{item.disabledAtUtc ? 'Disabled' : 'Active'}</span></td>
                  <td><button className={styles.viewButton} type="button" onClick={() => void openUser(item.id)}>View</button></td>
                </tr>)}</tbody>
              </table>
            </div>
            {users.items.length === 0 && <div className={styles.empty}>No users match these filters.</div>}
            <div className={styles.pagination}>
              <button type="button" disabled={users.page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</button>
              <span>Page {users.page} of {users.totalPages}</span>
              <button type="button" disabled={users.page >= users.totalPages} onClick={() => setPage(value => value + 1)}>Next</button>
            </div>
          </>}
        </section>

        {overview && <section className={styles.auditPanel} aria-labelledby="audit-title">
          <div className={styles.panelHeading}><p>Security</p><h2 id="audit-title">Recent admin activity</h2></div>
          {overview.recentAuditLog.length === 0
            ? <p className={styles.emptyAudit}>No administrator actions recorded yet.</p>
            : <ul>{overview.recentAuditLog.map(entry => <li key={entry.id}><span className={styles.auditMark} aria-hidden="true">✓</span><div><strong>{entry.action === 'user.disabled' ? 'User disabled' : entry.action === 'user.enabled' ? 'User restored' : entry.action}</strong><span>{entry.detail}</span></div><time dateTime={entry.createdAtUtc}>{formatTime(entry.createdAtUtc)}</time></li>)}</ul>}
        </section>}
      </main>

      {(detailLoading || selectedUser || detailError) && <div className={styles.detailBackdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) { setSelectedUser(null); setDetailError(''); } }}>
        <section className={styles.detailPanel} role="dialog" aria-modal="true" aria-labelledby="admin-user-title">
          <button className={styles.closeButton} type="button" aria-label="Close user details" onClick={() => { setSelectedUser(null); setDetailError(''); }}>×</button>
          {detailLoading && <div className={styles.state}>Loading user…</div>}
          {detailError && <div className={styles.error} role="alert">{detailError}</div>}
          {selectedUser && <>
            <p className={styles.detailEyebrow}>User account</p>
            <h2 id="admin-user-title">{selectedUser.user.displayName || 'Unnamed user'}</h2>
            <a href={`mailto:${selectedUser.user.email}`}>{selectedUser.user.email}</a>
            <dl className={styles.detailFacts}>
              <div><dt>Joined</dt><dd>{formatDate(selectedUser.user.createdAtUtc)}</dd></div>
              <div><dt>Last active</dt><dd>{formatTime(selectedUser.user.lastSeenAtUtc)}</dd></div>
              <div><dt>Applications</dt><dd>{selectedUser.user.applicationCount}</dd></div>
              <div><dt>Events</dt><dd>{selectedUser.user.eventCount}</dd></div>
              <div><dt>Google</dt><dd>{selectedUser.user.googleConnected ? 'Connected' : 'Not connected'}</dd></div>
              <div><dt>Password</dt><dd>{selectedUser.user.hasPassword ? 'Configured' : 'Not configured'}</dd></div>
            </dl>
            <div className={styles.detailStatuses}>{selectedUser.applicationStatuses.filter(item => item.count > 0).map(item => <span key={item.status}>{item.status} <strong>{item.count}</strong></span>)}</div>
            <div className={styles.dangerZone} data-disabled={selectedUser.user.disabledAtUtc !== null}>
              <div><strong>{selectedUser.user.disabledAtUtc ? 'Account disabled' : 'Account access enabled'}</strong><p>{selectedUser.user.disabledAtUtc ? `Disabled ${formatTime(selectedUser.user.disabledAtUtc)}. Restore access when appropriate.` : 'Disabling signs the user out and blocks future API access.'}</p></div>
              <button type="button" disabled={statusBusy || selectedUser.user.id === user?.id} onClick={() => void changeAccountStatus()}>{statusBusy ? 'Updating…' : selectedUser.user.disabledAtUtc ? 'Restore access' : 'Disable account'}</button>
            </div>
          </>}
        </section>
      </div>}
    </div>
  );
}

export default AdminPage;
