const SESSION_KEY = "ZoSaVuTa26_S3ss!on1_3Xp!!r3s-";

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
export const REMEMBER_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function setSessionExpiry(rememberMe: boolean): void {
  if (typeof window === 'undefined') return;
  const duration = rememberMe ? REMEMBER_DURATION_MS : SESSION_DURATION_MS;
  localStorage.setItem(SESSION_KEY, String(Date.now() + duration));
}

export function clearSessionExpiry(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  return Date.now() > parseInt(raw, 10);
}
