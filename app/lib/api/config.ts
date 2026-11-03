const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, "");

export const HTTP_REQUEST_TIMEOUT_MS = 5000;

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}
