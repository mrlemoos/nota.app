import { describe, expect, it } from 'vitest';
import { mapClerkToHashFragment } from './clerk-hash-navigation';

describe('mapClerkToHashFragment', () => {
  const current = 'http://localhost:4200/#/notes';

  it('maps /sign-in to /sign-in hash (Clerk Core 3 hash routing)', () => {
    expect(mapClerkToHashFragment('/sign-in', current)).toEqual({
      fragment: '/sign-in',
    });
  });

  it('maps /sign-in/verify to /sign-in/verify', () => {
    expect(
      mapClerkToHashFragment('/sign-in/verify-email-code', current),
    ).toEqual({ fragment: '/sign-in/verify-email-code' });
  });

  it('maps /sign-up to /sign-up hash', () => {
    expect(mapClerkToHashFragment('/sign-up', current)).toEqual({
      fragment: '/sign-up',
    });
  });

  it('maps /sign-up/verify-email-address to /sign-up/verify-email-address', () => {
    expect(
      mapClerkToHashFragment('/sign-up/verify-email-address', current),
    ).toEqual({ fragment: '/sign-up/verify-email-address' });
  });

  it('preserves /login and subpaths', () => {
    expect(mapClerkToHashFragment('/login', current)).toEqual({
      fragment: '/login',
    });
    expect(mapClerkToHashFragment('/login/foo', current)).toEqual({
      fragment: '/login/foo',
    });
  });

  it('preserves /signup and subpaths', () => {
    expect(mapClerkToHashFragment('/signup', current)).toEqual({
      fragment: '/signup',
    });
    expect(mapClerkToHashFragment('/signup/verify-email-address', current)).toEqual({
      fragment: '/signup/verify-email-address',
    });
  });

  it('appends search on mapped paths', () => {
    expect(mapClerkToHashFragment('/sign-up?a=1', current)).toEqual({
      fragment: '/sign-up?a=1',
    });
  });

  it('returns null for other origins', () => {
    expect(
      mapClerkToHashFragment('https://cool-colt-46.accounts.dev/sign-up', current),
    ).toBeNull();
  });

  it('returns null for unmapped same-origin paths', () => {
    expect(mapClerkToHashFragment('/notes', current)).toBeNull();
  });

  it('maps hyphenated hash-style paths if passed as pathname', () => {
    expect(mapClerkToHashFragment('/sign-up/verify-email-address', current)).toEqual({
      fragment: '/sign-up/verify-email-address',
    });
  });
});
