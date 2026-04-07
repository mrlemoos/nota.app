import { describe, expect, it } from 'vitest';
import { mapClerkToHashFragment } from './clerk-hash-navigation';

describe('mapClerkToHashFragment', () => {
  const current = 'http://localhost:4200/#/notes';

  it('maps /sign-in to /login', () => {
    expect(mapClerkToHashFragment('/sign-in', current)).toEqual({
      fragment: '/login',
    });
  });

  it('maps /sign-in/verify to /login/verify', () => {
    expect(
      mapClerkToHashFragment('/sign-in/verify-email-code', current),
    ).toEqual({ fragment: '/login/verify-email-code' });
  });

  it('maps /sign-up to /signup', () => {
    expect(mapClerkToHashFragment('/sign-up', current)).toEqual({
      fragment: '/signup',
    });
  });

  it('maps /sign-up/verify-email-address to /signup/verify-email-address', () => {
    expect(
      mapClerkToHashFragment('/sign-up/verify-email-address', current),
    ).toEqual({ fragment: '/signup/verify-email-address' });
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
      fragment: '/signup?a=1',
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
      fragment: '/signup/verify-email-address',
    });
  });
});
