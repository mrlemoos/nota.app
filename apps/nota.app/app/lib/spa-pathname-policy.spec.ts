import { describe, expect, it } from 'vitest';
import { isSpaShellPathnameAllowed } from './spa-pathname-policy';

describe('isSpaShellPathnameAllowed', () => {
  it('allows the SPA shell and static prefixes', () => {
    expect(isSpaShellPathnameAllowed('/')).toBe(true);
    expect(isSpaShellPathnameAllowed('/index.html')).toBe(true);
    expect(isSpaShellPathnameAllowed('/favicon.svg')).toBe(true);
    expect(isSpaShellPathnameAllowed('/assets/main-abc123.js')).toBe(true);
    expect(isSpaShellPathnameAllowed('/notes')).toBe(true);
    expect(isSpaShellPathnameAllowed('/notes/any')).toBe(true);
    expect(isSpaShellPathnameAllowed('/notes/')).toBe(true);
  });

  it('rejects unknown pathnames', () => {
    expect(isSpaShellPathnameAllowed('/typo')).toBe(false);
    expect(isSpaShellPathnameAllowed('/blog/post')).toBe(false);
    expect(isSpaShellPathnameAllowed('/api')).toBe(false);
  });
});
