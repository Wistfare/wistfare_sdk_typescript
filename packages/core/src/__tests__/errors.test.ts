import { describe, it, expect } from 'vitest';
import {
  WistfareError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  InternalError,
} from '../errors.js';

describe('WistfareError', () => {
  it('has correct name, status, and code', () => {
    const err = new WistfareError('something broke', 500, 'server_error');
    expect(err.name).toBe('WistfareError');
    expect(err.status).toBe(500);
    expect(err.code).toBe('server_error');
    expect(err.message).toBe('something broke');
  });

  it('stores requestId when provided', () => {
    const err = new WistfareError('fail', 400, 'bad', 'req_123');
    expect(err.requestId).toBe('req_123');
  });

  it('requestId is undefined when not provided', () => {
    const err = new WistfareError('fail', 400, 'bad');
    expect(err.requestId).toBeUndefined();
  });

  it('extends Error', () => {
    const err = new WistfareError('msg', 400, 'code');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WistfareError);
  });
});

describe('AuthenticationError', () => {
  it('has correct defaults', () => {
    const err = new AuthenticationError();
    expect(err.name).toBe('AuthenticationError');
    expect(err.status).toBe(401);
    expect(err.code).toBe('authentication_error');
    expect(err.message).toBe('Invalid or expired API key');
  });

  it('accepts custom message and requestId', () => {
    const err = new AuthenticationError('bad key', 'req_1');
    expect(err.message).toBe('bad key');
    expect(err.requestId).toBe('req_1');
  });

  it('extends WistfareError', () => {
    const err = new AuthenticationError();
    expect(err).toBeInstanceOf(WistfareError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('PermissionError', () => {
  it('has correct defaults', () => {
    const err = new PermissionError();
    expect(err.name).toBe('PermissionError');
    expect(err.status).toBe(403);
    expect(err.code).toBe('permission_error');
  });

  it('extends WistfareError', () => {
    expect(new PermissionError()).toBeInstanceOf(WistfareError);
  });
});

describe('NotFoundError', () => {
  it('has correct defaults', () => {
    const err = new NotFoundError();
    expect(err.name).toBe('NotFoundError');
    expect(err.status).toBe(404);
    expect(err.code).toBe('not_found');
  });

  it('extends WistfareError', () => {
    expect(new NotFoundError()).toBeInstanceOf(WistfareError);
  });
});

describe('ValidationError', () => {
  it('has correct defaults and stores errors record', () => {
    const errors = { name: ['is required'] };
    const err = new ValidationError('invalid input', errors);
    expect(err.name).toBe('ValidationError');
    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_error');
    expect(err.errors).toEqual(errors);
  });

  it('extends WistfareError', () => {
    expect(new ValidationError('msg', {})).toBeInstanceOf(WistfareError);
  });
});

describe('RateLimitError', () => {
  it('has correct defaults and stores retryAfter', () => {
    const err = new RateLimitError(30);
    expect(err.name).toBe('RateLimitError');
    expect(err.status).toBe(429);
    expect(err.code).toBe('rate_limit');
    expect(err.retryAfter).toBe(30);
    expect(err.message).toBe('Rate limit exceeded. Retry after 30s');
  });

  it('extends WistfareError', () => {
    expect(new RateLimitError(5)).toBeInstanceOf(WistfareError);
  });
});

describe('InternalError', () => {
  it('has correct defaults', () => {
    const err = new InternalError();
    expect(err.name).toBe('InternalError');
    expect(err.status).toBe(500);
    expect(err.code).toBe('internal_error');
    expect(err.message).toBe('Internal server error');
  });

  it('extends WistfareError', () => {
    expect(new InternalError()).toBeInstanceOf(WistfareError);
  });
});
