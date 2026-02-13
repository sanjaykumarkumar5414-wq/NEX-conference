/**
 * Global handler for 401 Unauthorized from API.
 * AuthProvider sets this to logout so the user is redirected to login when the token is invalid or expired.
 */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export function triggerUnauthorized(): void {
  onUnauthorized?.();
}
