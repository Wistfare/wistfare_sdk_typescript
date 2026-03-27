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

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(backoffMs(attempt));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const headers: Record<string, string> = {
          'X-API-Key': this.apiKey,
          'User-Agent': `wistfare-node/${SDK_VERSION}`,
          'Accept': 'application/json',
        };

        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (options?.body !== undefined) {
          headers['Content-Type'] = 'application/json';
          init.body = JSON.stringify(options.body);
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
          if (attempt < this.maxRetries) {
            await sleep(retryAfter * 1000);
            continue;
          }
          throw new RateLimitError(retryAfter, requestId);
        }

        if (response.status >= 500 && attempt < this.maxRetries) {
          lastError = new InternalError(message, requestId);
          continue;
        }

        throw this.buildError(response.status, message, errorBody, requestId);
      } catch (err) {
        if (err instanceof WistfareError) throw err;
        lastError = err as Error;
        if (attempt >= this.maxRetries) break;
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

interface RequestOptions {
  body?: unknown;
  query?: Record<string, unknown>;
}

function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 10_000) + Math.random() * 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
