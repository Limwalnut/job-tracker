import { requestJson, requestVoid } from './client';

export type PersonalApiTokenStatus = 'active' | 'revoked' | 'expired';

export interface PersonalApiTokenMetadata {
  id: string;
  name: string;
  displayPrefix: string;
  createdAtUtc: string;
  expiresAtUtc: string | null;
  lastUsedAtUtc: string | null;
  revokedAtUtc: string | null;
  status: PersonalApiTokenStatus;
}

export interface CreatedPersonalApiToken extends PersonalApiTokenMetadata {
  token: string | null;
}

export function getPersonalApiTokens(signal?: AbortSignal) {
  return requestJson<PersonalApiTokenMetadata[]>('/account/tokens', { signal });
}

export function createPersonalApiToken(name: string, expiresAt?: string) {
  return requestJson<CreatedPersonalApiToken>('/account/tokens', {
    method: 'POST',
    body: JSON.stringify({ name, ...(expiresAt ? { expiresAt } : {}) }),
  });
}

export function revokePersonalApiToken(id: string) {
  return requestVoid(`/account/tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
