import { describe, expect, it } from 'vitest';
import {
  DEV_PORT,
  normalisedPackagedAppOrigin,
  PACKAGED_REMOTE_APP_ORIGIN,
  resolveMainWindowLoadUrl,
  ssoCallbackBaseUrl,
} from './app-load-url.js';

describe('app-load-url', () => {
  it('normalises packaged remote origin without trailing slash', () => {
    // Arrange
    // (module exports DEV_PORT, PACKAGED_REMOTE_APP_ORIGIN, normalisedPackagedAppOrigin)

    // Act
    const originEndsWithSlash = PACKAGED_REMOTE_APP_ORIGIN.endsWith('/');
    const normalised = normalisedPackagedAppOrigin();

    // Assert
    expect(originEndsWithSlash).toBe(false);
    expect(normalised).toBe('https://app.nota.mrlemoos.dev');
  });

  it('resolveMainWindowLoadUrl uses local Vite port in dev and hosted URL when packaged', () => {
    // Arrange
    const isDevelopment = true;
    const isProduction = false;

    // Act
    const devUrl = resolveMainWindowLoadUrl(isDevelopment);
    const prodUrl = resolveMainWindowLoadUrl(isProduction);

    // Assert
    expect(devUrl).toBe(`http://localhost:${String(DEV_PORT)}`);
    expect(prodUrl).toBe('https://app.nota.mrlemoos.dev/');
  });

  it('ssoCallbackBaseUrl matches load URL host without trailing slash for packaged', () => {
    // Arrange
    const isDevelopment = true;
    const isProduction = false;

    // Act
    const devBase = ssoCallbackBaseUrl(isDevelopment);
    const prodBase = ssoCallbackBaseUrl(isProduction);

    // Assert
    expect(devBase).toBe(`http://localhost:${String(DEV_PORT)}`);
    expect(prodBase).toBe('https://app.nota.mrlemoos.dev');
  });
});
