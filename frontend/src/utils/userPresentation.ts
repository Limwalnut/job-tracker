import type { CurrentUser } from '../api/auth';

export function userDisplayName(user: CurrentUser) {
  return user.displayName?.trim() || user.email.split('@')[0] || user.email;
}

export function userInitials(user: CurrentUser) {
  const name = userDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
  }

  return name.slice(0, 1).toUpperCase();
}
