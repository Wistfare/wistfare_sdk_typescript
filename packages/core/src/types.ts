/** Wistfare SDK client configuration. */
export interface WistfareConfig {
  /** API key (wf_live_* or wf_test_*). */
  apiKey: string;
  /** Base URL override. Defaults to https://api-production.wistfare.com. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Maximum number of automatic retries. Defaults to 2. */
  maxRetries?: number;
}

/** Standard paginated list response. */
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

/** Standard pagination parameters. */
export interface PaginationParams {
  page?: number;
  perPage?: number;
}

/** Shared address type. */
export interface Address {
  city: string;
  street: string;
  district: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

/** Shared contact info type. */
export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
}

/** API error response body. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  request_id?: string;
}
