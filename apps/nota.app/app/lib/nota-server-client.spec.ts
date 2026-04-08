import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./clerk-token-ref', () => ({
  getClerkAccessToken: vi.fn(),
}));

describe('nota-server-client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('fetchNotaProEntitled returns 401 and does not fetch when base URL is missing', async () => {
    vi.stubEnv('VITE_NOTA_SERVER_API_URL', '');
    vi.resetModules();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { getClerkAccessToken } = await import('./clerk-token-ref');
    const { fetchNotaProEntitled } = await import('./nota-server-client');

    const res = await fetchNotaProEntitled();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getClerkAccessToken).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: 'Unauthorized',
      entitled: false,
    });
    fetchSpy.mockRestore();
  });

  it('postNotaProInvalidate returns 401 and does not fetch when base URL is missing', async () => {
    vi.stubEnv('VITE_NOTA_SERVER_API_URL', '');
    vi.resetModules();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { getClerkAccessToken } = await import('./clerk-token-ref');
    const { postNotaProInvalidate } = await import('./nota-server-client');

    const res = await postNotaProInvalidate();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getClerkAccessToken).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
    fetchSpy.mockRestore();
  });

  it('fetchNotaProEntitled calls nota-server with Bearer when base and token are set', async () => {
    vi.stubEnv('VITE_NOTA_SERVER_API_URL', 'https://ns.example');
    vi.resetModules();
    const { getClerkAccessToken } = await import('./clerk-token-ref');
    vi.mocked(getClerkAccessToken).mockResolvedValue('session-jwt');

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ entitled: true })));

    const { fetchNotaProEntitled } = await import('./nota-server-client');
    await fetchNotaProEntitled();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ns.example/api/nota-pro-entitled',
      expect.objectContaining({
        headers: { Authorization: 'Bearer session-jwt' },
      }),
    );
    fetchSpy.mockRestore();
  });

  it('postNotaProInvalidate POSTs to nota-server with Bearer and strips trailing slash on base', async () => {
    vi.stubEnv('VITE_NOTA_SERVER_API_URL', 'https://ns.example/');
    vi.resetModules();
    const { getClerkAccessToken } = await import('./clerk-token-ref');
    vi.mocked(getClerkAccessToken).mockResolvedValue('t');

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const { postNotaProInvalidate } = await import('./nota-server-client');
    await postNotaProInvalidate();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ns.example/api/nota-pro-invalidate',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer t' },
      }),
    );
    fetchSpy.mockRestore();
  });

  it('fetchNotaProEntitled returns 401 without fetch when token is null', async () => {
    vi.stubEnv('VITE_NOTA_SERVER_API_URL', 'https://ns.example');
    vi.resetModules();
    const { getClerkAccessToken } = await import('./clerk-token-ref');
    vi.mocked(getClerkAccessToken).mockResolvedValue(null);

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { fetchNotaProEntitled } = await import('./nota-server-client');
    const res = await fetchNotaProEntitled();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: 'Unauthorized',
      entitled: false,
    });
    fetchSpy.mockRestore();
  });
});
