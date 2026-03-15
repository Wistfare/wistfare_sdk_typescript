/** Base error for all Wistfare SDK errors. */
export class WistfareError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message);
    this.name = 'WistfareError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export class AuthenticationError extends WistfareError {
  constructor(message = 'Invalid or expired API key', requestId?: string) {
    super(message, 401, 'authentication_error', requestId);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends WistfareError {
  constructor(message = 'Insufficient permissions', requestId?: string) {
    super(message, 403, 'permission_error', requestId);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends WistfareError {
  constructor(message = 'Resource not found', requestId?: string) {
    super(message, 404, 'not_found', requestId);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends WistfareError {
  readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]>, requestId?: string) {
    super(message, 400, 'validation_error', requestId);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class RateLimitError extends WistfareError {
  readonly retryAfter: number;

  constructor(retryAfter: number, requestId?: string) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`, 429, 'rate_limit', requestId);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class InternalError extends WistfareError {
  constructor(message = 'Internal server error', requestId?: string) {
    super(message, 500, 'internal_error', requestId);
    this.name = 'InternalError';
  }
}
