import { afterEach, describe, expect, it } from 'bun:test';
import { notaServerExposeErrorDetails } from './nota-server-error-detail.server.ts';

describe('notaServerExposeErrorDetails', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDebug = process.env.NOTA_SERVER_DEBUG_ERRORS;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevDebug === undefined) {
      delete process.env.NOTA_SERVER_DEBUG_ERRORS;
    } else {
      process.env.NOTA_SERVER_DEBUG_ERRORS = prevDebug;
    }
  });

  it('returns false in production unless NOTA_SERVER_DEBUG_ERRORS=1', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NOTA_SERVER_DEBUG_ERRORS;
    expect(notaServerExposeErrorDetails()).toBe(false);
    process.env.NOTA_SERVER_DEBUG_ERRORS = '1';
    expect(notaServerExposeErrorDetails()).toBe(true);
  });

  it('returns true outside production without debug flag', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NOTA_SERVER_DEBUG_ERRORS;
    expect(notaServerExposeErrorDetails()).toBe(true);
  });
});
