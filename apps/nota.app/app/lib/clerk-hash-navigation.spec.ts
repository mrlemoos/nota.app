import { afterEach, describe, expect, it, vi } from 'vitest';
import * as appNavigation from './app-navigation';
import {
  mapClerkToHashFragment,
  repairClerkAuthLocationHash,
  sanitizeClerkAuthHashFragment,
} from './clerk-hash-navigation';

function stubWindowLocation(opts: {
  origin: string;
  pathname: string;
  hash?: string;
}): void {
  const { origin, pathname, hash = '' } = opts;
  const prevWindow = globalThis.window;
  vi.stubGlobal('window', {
    ...prevWindow,
    location: {
      ...prevWindow.location,
      origin,
      pathname,
      hash,
      href: `${origin}${pathname}${hash}`,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it('maps auth targets whose path lives in the document hash (hash routing)', () => {
    expect(
      mapClerkToHashFragment(
        'http://localhost:4200/#/sign-up?redirect_url=%2Fnotes',
        current,
      ),
    ).toEqual({ fragment: '/sign-up?redirect_url=%2Fnotes' });
  });

  it('maps /sign-up relative to current when pathname is /', () => {
    expect(mapClerkToHashFragment('#/sign-in', 'http://localhost:4200/')).toEqual({
      fragment: '/sign-in',
    });
  });
});

describe('sanitizeClerkAuthHashFragment', () => {
  it('leaves short, non-nested Clerk redirect params unchanged', () => {
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const fragment =
      '/sign-up?sign_up_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes');
    expect(sanitizeClerkAuthHashFragment(fragment)).toBe(fragment);
  });

  it('replaces nested sign_* redirect chains with a single notes URL', () => {
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const inner =
      'http://localhost:4200/#/sign-in?sign_up_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes');
    const fragment =
      '/sign-up?sign_up_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes') +
      '&sign_in_force_redirect_url=' +
      encodeURIComponent(inner);
    const out = sanitizeClerkAuthHashFragment(fragment);
    expect(out).toMatch(/^\/sign-up\?/);
    const params = new URLSearchParams(out.slice('/sign-up?'.length));
    expect(params.get('sign_up_force_redirect_url')).toBe(
      'http://localhost:4200/#/notes',
    );
    expect(params.get('sign_in_force_redirect_url')).toBe(
      'http://localhost:4200/#/notes',
    );
  });

  it('replaces nested redirect_url pointing at sign-in with a clean sign-in URL', () => {
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const notes = 'http://localhost:4200/#/notes';
    const nestedRedirectToSignIn =
      'http://localhost:4200/#/sign-in?sign_up_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes') +
      '&sign_in_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes') +
      '&redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/sign-in');
    const fragment =
      '/sign-up?sign_up_force_redirect_url=' +
      encodeURIComponent(notes) +
      '&sign_in_force_redirect_url=' +
      encodeURIComponent(notes) +
      '&redirect_url=' +
      encodeURIComponent(nestedRedirectToSignIn);
    const out = sanitizeClerkAuthHashFragment(fragment);
    expect(out).toMatch(/^\/sign-up\?/);
    const params = new URLSearchParams(out.slice('/sign-up?'.length));
    expect(params.get('sign_up_force_redirect_url')).toBe(notes);
    expect(params.get('sign_in_force_redirect_url')).toBe(notes);
    expect(params.get('redirect_url')).toBe('http://localhost:4200/#/sign-in');
  });

  it('sanitises return_url with triple-encoded segments', () => {
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const poisoned =
      'http%3A%2F%2Flocalhost%3A4200%2F%23%2Fsign-in%3Fsign_up_force_redirect_url%3Dhttp%253A%252F%252Flocalhost%253A4200%252F%2523%252Fnotes';
    const fragment = `/sign-up?return_url=${poisoned}`;
    const out = sanitizeClerkAuthHashFragment(fragment);
    const params = new URLSearchParams(out.slice('/sign-up?'.length));
    expect(params.get('return_url')).toBe('http://localhost:4200/#/sign-in');
  });
});

describe('repairClerkAuthLocationHash', () => {
  it('calls replaceAppHash(signup) when the auth hash query is oversized', () => {
    const replaceSpy = vi
      .spyOn(appNavigation, 'replaceAppHash')
      .mockImplementation(() => {});
    const junk = 'z'.repeat(3000);
    const hash = `#/sign-up?${junk}`;
    const prevWindow = globalThis.window;
    vi.stubGlobal('window', {
      ...prevWindow,
      location: {
        ...prevWindow.location,
        origin: 'http://localhost:4200',
        pathname: '/',
        hash,
        href: `http://localhost:4200${hash.startsWith('#') ? hash : `#${hash}`}`,
      },
      history: prevWindow.history,
    });
    repairClerkAuthLocationHash();
    expect(replaceSpy).toHaveBeenCalledWith({ kind: 'signup' });
    replaceSpy.mockRestore();
  });
});
