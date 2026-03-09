/**
 * Centralized API configuration.
 * All API base URL changes should be made here or via VITE_API_BASE_URL env.
 */

export const getBaseUrl = (): string =>
  (import.meta as ImportMeta & { env: ImportMetaEnv & { VITE_API_BASE_URL?: string } }).env
    .VITE_API_BASE_URL ?? "/api";
