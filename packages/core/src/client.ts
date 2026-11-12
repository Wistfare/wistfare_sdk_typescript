import type { WistfareConfig, ApiErrorResponse } from './types.js';
import {
  WistfareError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  InternalError,
} from './errors.js';

const DEFAULT_BASE_URL = 'https://api-production.wistfare.com';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const SDK_VERSION = '0.1.0';

/** Core HTTP client shared by all service packages. */
export class Wistfare {
  private readonly apiKey: string;
  readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: WistfareConfig) {
    if (!config.apiKey) {
      throw new WistfareError(
        'API key is required. Pass { apiKey: "wf_live_..." } or { apiKey: "wf_test_..." }.',
        400,
        'missing_api_key',
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /** True if using a test-mode API key. */
  get isTestMode(): boolean {
    return this.apiKey.startsWith('wf_test_');
  }

  /** Send an HTTP request to the Wistfare API. */
  async request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | undefined;

    // Keep the exact payload and idempotency key stable across network retries.
    const body = options?.body === undefined ? undefined : JSON.stringify(options.body);
    const extraHeaders = new Headers(options?.headers);
    const safeToRetry = ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
      || !!extraHeaders.get('Idempotency-Key');
    const maxRetries = safeToRetry ? this.maxRetries : 0;
    const timeout = options?.timeout ?? this.timeout;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 2_147_483_647) {
      throw new RangeError('Request timeout must be a positive integer number of milliseconds within the timer range');
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(backoffMs(attempt));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        // Headers.set replaces case-insensitively; a plain object would merge
        // caller x-api-key with X-API-Key into one invalid comma-separated value.
        const headers = new Headers(extraHeaders);
        headers.set('X-API-Key', this.apiKey);
        headers.set('User-Agent', `wistfare-node/${SDK_VERSION}`);
        headers.set('Accept', 'application/json');

        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
          // Custom API-key headers must never be forwarded to a redirect target.
          redirect: 'error',
        };

        if (body !== undefined) {
          headers.set('Content-Type', 'application/json');
          init.body = body;
        }

        const finalUrl = options?.query
          ? `${url}?${new URLSearchParams(
              Object.fromEntries(
                Object.entries(options.query).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
              ),
            ).toString()}`
          : url;

        const response = await fetch(finalUrl, init);

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          return (await response.json()) as T;
        }

        const errorBody = await response.json().catch(() => null) as ApiErrorResponse | null;
        const requestId = errorBody?.request_id ?? response.headers.get('x-request-id') ?? undefined;
        const message = errorBody?.error?.message ?? response.statusText;

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('retry-after') ?? '5');
          if (attempt < maxRetries) {
            await sleep(retryAfter * 1000);
            continue;
          }
          throw new RateLimitError(retryAfter, requestId);
        }

        if (response.status >= 500 && attempt < maxRetries) {
          lastError = new InternalError(message, requestId);
          continue;
        }

        throw this.buildError(response.status, message, errorBody, requestId);
      } catch (err) {
        if (err instanceof WistfareError) throw err;
        lastError = err as Error;
        if (attempt >= maxRetries) break;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new InternalError('Request failed after retries');
  }

  /** Convenience methods. */
  async get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, { body });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private buildError(
    status: number,
    message: string,
    body: ApiErrorResponse | null,
    requestId?: string,
  ): WistfareError {
    switch (status) {
      case 401:
        return new AuthenticationError(message, requestId);
      case 403:
        return new PermissionError(message, requestId);
      case 404:
        return new NotFoundError(message, requestId);
      case 400:
      case 422:
        return new ValidationError(message, body?.error?.details ?? {}, requestId);
      default:
        return new WistfareError(message, status, body?.error?.code ?? 'unknown', requestId);
    }
  }
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Per-attempt request timeout in milliseconds; defaults to the client timeout. */
  timeout?: number;
}

function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 10_000) + Math.random() * 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
