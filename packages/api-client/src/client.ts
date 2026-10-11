/**
 * Lightweight fetch wrapper used by every web app in the monorepo.
 * Handles JSON parsing, normalized errors, optional auth token, and base URL.
 * Auto-unwraps the backend's `{ success, data }` envelope.
 */
import { ApiError } from './errors';
import type { ApiError as ApiErrorEnvelope, ApiResponse } from '@anzara/shared-types';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
  signal?: AbortSignal;
  /** When true, skip envelope unwrapping and return the raw response. */
  raw?: boolean;
  /** When true, send cookies for cross-origin requests. */
  withCredentials?: boolean;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export function createApiClient(baseUrl: string) {
  return {
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
      const url = buildUrl(baseUrl, path);
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      };
      if (options.token) headers['Authorization'] = `Bearer ${options.token}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      let response: Response;
      try {
        response = await fetch(url, {
          method: options.method ?? 'GET',
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          credentials: options.withCredentials ? 'include' : 'same-origin',
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new ApiError(0, 'TIMEOUT', 'Request timed out');
        }
        throw new ApiError(0, 'NETWORK', err instanceof Error ? err.message : 'Network error');
      }
      clearTimeout(timeout);

      if (options.raw) return response as unknown as T;

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const payload: unknown = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const { code, message, details } = extractError(payload, response.status);
        throw new ApiError(response.status, code, message, details);
      }

      // Unwrap the { success, data } envelope when present.
      if (
        payload &&
        typeof payload === 'object' &&
        'success' in payload &&
        (payload as { success: unknown }).success === true &&
        'data' in payload
      ) {
        return (payload as ApiResponse<T>).data;
      }

      // Unwrap error envelope if it's been sent with a 2xx (shouldn't, but be safe).
      if (
        payload &&
        typeof payload === 'object' &&
        'success' in payload &&
        (payload as { success: unknown }).success === false
      ) {
        const err = (payload as ApiErrorEnvelope).error;
        throw new ApiError(response.status, err.code, err.message, err.details);
      }

      return payload as T;
    },
  };
}

function buildUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

function extractError(
  payload: unknown,
  status: number,
): { code: string; message: string; details: unknown } {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj['success'] === false && obj['error'] && typeof obj['error'] === 'object') {
      const err = obj['error'] as { code?: string; message?: string; details?: unknown };
      return {
        code: typeof err.code === 'string' ? err.code : `HTTP_${status}`,
        message: typeof err.message === 'string' ? err.message : 'Request failed',
        details: err.details ?? null,
      };
    }
    const code = typeof obj['code'] === 'string' ? obj['code'] : `HTTP_${status}`;
    const message =
      typeof obj['message'] === 'string'
        ? obj['message']
        : typeof obj['error'] === 'string'
          ? (obj['error'] as string)
          : 'Request failed';
    return { code, message, details: obj['details'] ?? null };
  }
  return { code: `HTTP_${status}`, message: 'Request failed', details: payload };
}

export type ApiClient = ReturnType<typeof createApiClient>;
