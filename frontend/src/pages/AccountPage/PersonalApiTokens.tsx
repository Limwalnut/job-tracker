import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import {
  createPersonalApiToken,
  getPersonalApiTokens,
  revokePersonalApiToken,
  type PersonalApiTokenMetadata,
} from '../../api/personalTokens';
import styles from './PersonalApiTokens.module.scss';

interface Props {
  refreshKey: number;
  hidden: boolean;
}

interface TokenLimitProblem {
  code?: unknown;
  maxActiveTokens?: unknown;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const payload = error.payload as TokenLimitProblem | null;
    if (error.status === 409 && payload?.code === 'token_limit_reached') {
      const limit = typeof payload.maxActiveTokens === 'number' ? payload.maxActiveTokens : 10;
      return `You have reached the limit of ${limit} active API tokens. Revoke an active token before creating another.`;
    }
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatStatus(status: PersonalApiTokenMetadata['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function PersonalApiTokens({ refreshKey, hidden }: Props) {
  const [tokens, setTokens] = useState<PersonalApiTokenMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const [oneTimeTokenId, setOneTimeTokenId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState('');
  const createInFlight = useRef(false);
  const revokeInFlight = useRef<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadTokens = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getPersonalApiTokens(signal);
      if (!signal?.aborted) setTokens(result);
    } catch (error) {
      if (!signal?.aborted) setLoadError(getErrorMessage(error, 'Unable to load API tokens.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Defer state updates until after the effect has mounted; cleanup cancels a stale refresh.
    const load = window.setTimeout(() => void loadTokens(controller.signal), 0);
    return () => {
      window.clearTimeout(load);
      controller.abort();
    };
  }, [loadTokens, refreshKey]);

  useEffect(() => {
    if (showCreateForm) nameInputRef.current?.focus();
  }, [showCreateForm]);

  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createInFlight.current || createBusy || oneTimeSecret) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setCreateError('Enter a name for this token.');
      return;
    }

    const expiryIso = expiryDays === 'never'
      ? undefined
      : new Date(Date.now() + Number(expiryDays) * 24 * 60 * 60 * 1000).toISOString();

    createInFlight.current = true;
    setCreateBusy(true);
    setCreateError('');
    setOneTimeSecret(null);
    setOneTimeTokenId(null);
    setCopyMessage('');
    try {
      const created = await createPersonalApiToken(trimmedName, expiryIso);
      const { token, ...metadata } = created;
      setTokens(current => [metadata, ...current.filter(item => item.id !== metadata.id)]);
      if (token) {
        setOneTimeSecret(token);
        setOneTimeTokenId(metadata.id);
        setShowCreateForm(false);
        setName('');
        setExpiryDays('30');
      } else {
        setCreateError('The token was created, but its one-time secret was missing from the response. Revoke it and create a new token.');
      }
    } catch (error) {
      setCreateError(getErrorMessage(error, 'Unable to create an API token.'));
    } finally {
      createInFlight.current = false;
      setCreateBusy(false);
    }
  }

  function cancelCreate() {
    setShowCreateForm(false);
    setName('');
    setExpiryDays('30');
    setCreateError('');
  }

  async function copySecret() {
    if (!oneTimeSecret) return;
    setCopyMessage('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(oneTimeSecret);
      setCopyMessage('Copied to clipboard.');
    } catch {
      setCopyMessage('Could not access the clipboard. Select the token above and copy it manually.');
    }
  }

  async function revokeToken(id: string) {
    if (revokeInFlight.current || revokingId) return;
    revokeInFlight.current = id;
    setRevokingId(id);
    setRevokeError('');
    try {
      await revokePersonalApiToken(id);
      setTokens(current => current.map(token => token.id === id
        ? { ...token, status: 'revoked', revokedAtUtc: new Date().toISOString() }
        : token));
      if (oneTimeTokenId === id) {
        setOneTimeSecret(null);
        setOneTimeTokenId(null);
        setCopyMessage('');
      }
      setConfirmingRevokeId(null);
    } catch (error) {
      setRevokeError(getErrorMessage(error, 'Unable to revoke this API token.'));
    } finally {
      revokeInFlight.current = null;
      setRevokingId(null);
    }
  }

  return (
    <section hidden={hidden} className={`${styles.card} ${styles.tokenCard}`} aria-labelledby="api-tokens-title">
      <div className={styles.cardHeading}>
        <div>
          <h2 id="api-tokens-title">Personal API tokens</h2>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => showCreateForm ? cancelCreate() : setShowCreateForm(true)}
            disabled={createBusy || Boolean(oneTimeSecret)}
            aria-expanded={showCreateForm}
            aria-controls="create-personal-token"
          >
            {showCreateForm ? 'Cancel' : 'Create token'}
          </button>
          <button type="button" className={styles.refreshButton} onClick={() => void loadTokens()} disabled={loading || createBusy || revokingId !== null}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <p className={styles.description}>
        Create a token for scripts that access your Applyline data. Treat it like a password. The secret is shown only once.
      </p>

      {oneTimeSecret && <div className={styles.secretNotice} role="status" aria-live="polite">
        <div>
          <strong>Copy your new token now</strong>
          <p>You will not be able to see this secret again after you dismiss this message or leave the page.</p>
          <code>{oneTimeSecret}</code>
          {copyMessage && <small>{copyMessage}</small>}
        </div>
        <div className={styles.secretActions}>
          <button type="button" onClick={() => void copySecret()}>Copy token</button>
          <button type="button" className={styles.secondaryButton} onClick={() => {
            setOneTimeSecret(null);
            setOneTimeTokenId(null);
            setCopyMessage('');
          }}>Dismiss secret</button>
        </div>
      </div>}

      <form id="create-personal-token" hidden={!showCreateForm} className={styles.createForm} onSubmit={event => void createToken(event)}>
        <label className={styles.nameLabel} htmlFor="personal-token-name">Token name</label>
        <input
          ref={nameInputRef}
          className={styles.nameInput}
          id="personal-token-name"
          type="text"
          value={name}
          maxLength={100}
          required
          autoComplete="off"
          placeholder="e.g. Gogo assistant"
          onChange={event => {
            setName(event.target.value);
            setCreateError('');
          }}
        />
        <label className={styles.expiryLabel} htmlFor="personal-token-expires-at">Token expiry</label>
        <select
          className={styles.expiryInput}
          id="personal-token-expires-at"
          value={expiryDays}
          onChange={event => {
            setExpiryDays(event.target.value);
            setCreateError('');
          }}
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="60">60 days</option>
          <option value="90">90 days</option>
          <option value="180">180 days</option>
          <option value="365">1 year</option>
          <option value="never">Never expires</option>
        </select>
        <small className={styles.expiryHelp}>Choose how long this token will work.</small>
        {createError && <p className={styles.error} role="alert">{createError}</p>}
        <button className={styles.submitButton} type="submit" disabled={createBusy || loading}>
          {createBusy ? 'Creating…' : 'Create token'}
        </button>
      </form>

      <div className={styles.tokenListHeading}>
        <h3>Your tokens</h3>
        <span>{tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}</span>
      </div>

      {loadError && <p className={styles.error} role="alert">
        {loadError} <button type="button" className={styles.inlineButton} disabled={loading} onClick={() => void loadTokens()}>Retry</button>
      </p>}
      {revokeError && <p className={styles.error} role="alert">{revokeError}</p>}
      {loading ? <p className={styles.state} role="status">Loading tokens…</p>
        : tokens.length === 0 ? <p className={styles.state}>No API tokens yet.</p>
          : <ul className={styles.tokenList}>
            {tokens.map(token => <li key={token.id} className={styles.tokenRow}>
              <div className={styles.tokenIdentity}>
                <strong>{token.name}</strong>
                <code>{token.displayPrefix}</code>
                <span className={styles.status} data-status={token.status}>{formatStatus(token.status)}</span>
              </div>
              <dl className={styles.tokenMetadata}>
                <div><dt>Created</dt><dd>{formatDate(token.createdAtUtc)}</dd></div>
                <div><dt>Expires</dt><dd>{formatDate(token.expiresAtUtc)}</dd></div>
                <div><dt>Last used</dt><dd>{formatDate(token.lastUsedAtUtc)}</dd></div>
              </dl>
              {token.status === 'active' && (confirmingRevokeId === token.id
                ? <div className={styles.confirmation} role="group" aria-label={`Confirm revocation of ${token.name}`}>
                  <span>Revoke this token? Scripts using it will stop working.</span>
                  <button type="button" className={styles.dangerButton} disabled={revokingId !== null} onClick={() => void revokeToken(token.id)}>
                    {revokingId === token.id ? 'Revoking…' : 'Confirm revoke'}
                  </button>
                  <button type="button" className={styles.secondaryButton} disabled={revokingId !== null} onClick={() => setConfirmingRevokeId(null)}>Cancel</button>
                </div>
                : <button type="button" className={styles.revokeButton} disabled={revokingId !== null} onClick={() => {
                  setRevokeError('');
                  setConfirmingRevokeId(token.id);
                }}>Revoke</button>)}
            </li>)}
          </ul>}

    </section>
  );
}
