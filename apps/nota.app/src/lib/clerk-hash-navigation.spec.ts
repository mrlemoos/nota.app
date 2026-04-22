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
    // Arrange
    const path = '/sign-in';

    // Act
    const result = mapClerkToHashFragment(path, current);

    // Assert
    expect(result).toEqual({
      fragment: '/sign-in',
    });
  });

  it('maps /sign-in/verify to /sign-in/verify', () => {
    // Arrange
    const path = '/sign-in/verify-email-code';

    // Act
    const result = mapClerkToHashFragment(path, current);

    // Assert
    expect(result).toEqual({ fragment: '/sign-in/verify-email-code' });
  });

  it('maps /sign-up to /sign-up hash', () => {
    // Arrange
    const path = '/sign-up';

    // Act
    const result = mapClerkToHashFragment(path, current);

    // Assert
    expect(result).toEqual({
      fragment: '/sign-up',
    });
  });

  it('maps /sign-up/verify-email-address to /sign-up/verify-email-address', () => {
    // Arrange
    const path = '/sign-up/verify-email-address';

    // Act
    const result = mapClerkToHashFragment(path, current);

    // Assert
    expect(result).toEqual({ fragment: '/sign-up/verify-email-address' });
  });

  it('preserves /login and subpaths', () => {
    // Arrange
    const login = '/login';
    const loginFoo = '/login/foo';

    // Act
    const loginResult = mapClerkToHashFragment(login, current);
    const fooResult = mapClerkToHashFragment(loginFoo, current);

    // Assert
    expect(loginResult).toEqual({
      fragment: '/login',
    });
    expect(fooResult).toEqual({
      fragment: '/login/foo',
    });
  });

  it('preserves /signup and subpaths', () => {
    // Arrange
    const signup = '/signup';
    const signupVerify = '/signup/verify-email-address';

    // Act
    const signupResult = mapClerkToHashFragment(signup, current);
    const verifyResult = mapClerkToHashFragment(signupVerify, current);

    // Assert
    expect(signupResult).toEqual({
      fragment: '/signup',
    });
    expect(verifyResult).toEqual({
      fragment: '/signup/verify-email-address',
    });
  });

  it('appends search on mapped paths', () => {
    // Arrange
    const path = '/sign-up?a=1';

    // Act
    const result = mapClerkToHashFragment(path, current);

    // Assert
    expect(result).toEqual({
      fragment: '/sign-up?a=1',
    });
  });

  it('returns null for other origins', () => {
    // Arrange
    const url = 'https://cool-colt-46.accounts.dev/sign-up';

    // Act
    const result = mapClerkToHashFragment(url, current);

    // Assert
    expect(result).toBeNull();
  });

  it('returns null for unmapped same-origin paths', () => {
    // Arrange
    const path = '/notes';

    // Act
    const result = mapClerkToHashFragment(path, current);

    // Assert
    expect(result).toBeNull();
  });

  it('maps hyphenated hash-style paths if passed as pathname', () => {
    // Arrange
    const path = '/sign-up/verify-email-address';

    // Act
    const result = mapClerkToHashFragment(path, current);

    // Assert
    expect(result).toEqual({
      fragment: '/sign-up/verify-email-address',
    });
  });

  it('maps auth targets whose path lives in the document hash (hash routing)', () => {
    // Arrange
    const url =
      'http://localhost:4200/#/sign-up?redirect_url=%2Fnotes';

    // Act
    const result = mapClerkToHashFragment(url, current);

    // Assert
    expect(result).toEqual({ fragment: '/sign-up?redirect_url=%2Fnotes' });
  });

  it('maps /sign-up relative to current when pathname is /', () => {
    // Arrange
    const hashPath = '#/sign-in';
    const base = 'http://localhost:4200/';

    // Act
    const result = mapClerkToHashFragment(hashPath, base);

    // Assert
    expect(result).toEqual({
      fragment: '/sign-in',
    });
  });
});

describe('sanitizeClerkAuthHashFragment', () => {
  it('leaves short, non-nested Clerk redirect params unchanged', () => {
    // Arrange
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const fragment =
      '/sign-up?sign_up_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes');

    // Act
    const out = sanitizeClerkAuthHashFragment(fragment);

    // Assert
    expect(out).toBe(fragment);
  });

  it('replaces nested sign_* redirect chains with a single notes URL', () => {
    // Arrange
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const inner =
      'http://localhost:4200/#/sign-in?sign_up_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes');
    const fragment =
      '/sign-up?sign_up_force_redirect_url=' +
      encodeURIComponent('http://localhost:4200/#/notes') +
      '&sign_in_force_redirect_url=' +
      encodeURIComponent(inner);

    // Act
    const out = sanitizeClerkAuthHashFragment(fragment);

    // Assert
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
    // Arrange
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

    // Act
    const out = sanitizeClerkAuthHashFragment(fragment);

    // Assert
    expect(out).toMatch(/^\/sign-up\?/);
    const params = new URLSearchParams(out.slice('/sign-up?'.length));
    expect(params.get('sign_up_force_redirect_url')).toBe(notes);
    expect(params.get('sign_in_force_redirect_url')).toBe(notes);
    expect(params.get('redirect_url')).toBe('http://localhost:4200/#/sign-in');
  });

  it('sanitises return_url with triple-encoded segments', () => {
    // Arrange
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const poisoned =
      'http%3A%2F%2Flocalhost%3A4200%2F%23%2Fsign-in%3Fsign_up_force_redirect_url%3Dhttp%253A%252F%252Flocalhost%253A4200%252F%2523%252Fnotes';
    const fragment = `/sign-up?return_url=${poisoned}`;

    // Act
    const out = sanitizeClerkAuthHashFragment(fragment);

    // Assert
    const params = new URLSearchParams(out.slice('/sign-up?'.length));
    expect(params.get('return_url')).toBe('http://localhost:4200/#/sign-in');
  });

  it('strips malformed query tokens parsed as a junk key (no equals sign)', () => {
    // Arrange
    stubWindowLocation({ origin: 'http://localhost:4200', pathname: '/' });
    const junk = '/sign-up?sign_0%2F%23%2Fsign-in';
    const junkWithEquals = '/sign-up?sign_0%2F%23%2Fsign-in=';

    // Act
    const outJunk = sanitizeClerkAuthHashFragment(junk);
    const outEquals = sanitizeClerkAuthHashFragment(junkWithEquals);

    // Assert
    expect(outJunk).toBe('/sign-up');
    expect(outEquals).toBe('/sign-up');
  });
});

describe('repairClerkAuthLocationHash', () => {
  it('calls replaceAppHash(signup) when the auth hash query is oversized', () => {
    // Arrange
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

    // Act
    repairClerkAuthLocationHash();

    // Assert
    expect(replaceSpy).toHaveBeenCalledWith({ kind: 'signup' });
    replaceSpy.mockRestore();
  });
});
