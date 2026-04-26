import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchNotaProEntitled,
  postNotaProInvalidate,
  postSemanticSearch,
  postSearchIndexNote,
  postSearchReindexAll,
} from './nota-server-client.js';

describe('@nota.app/nota-server-client', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetchNotaProEntitled returns 401 and does not fetch when base URL is missing', async () => {
    // Arrange
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const baseUrl = '';
    const token = null;

    // Act
    const res = await fetchNotaProEntitled(baseUrl, token);

    // Assert
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: 'Unauthorized',
      entitled: false,
    });
    fetchSpy.mockRestore();
  });

  it('postNotaProInvalidate returns 401 and does not fetch when base URL is missing', async () => {
    // Arrange
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const baseUrl = undefined;
    const token = 't';

    // Act
    const res = await postNotaProInvalidate(baseUrl, token);

    // Assert
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
    fetchSpy.mockRestore();
  });

  it('fetchNotaProEntitled calls nota-server with Bearer when base and token are set', async () => {
    // Arrange
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ entitled: true })));
    const baseUrl = 'https://ns.example';
    const token = 'session-jwt';

    // Act
    await fetchNotaProEntitled(baseUrl, token);

    // Assert
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ns.example/api/nota-pro-entitled',
      expect.objectContaining({
        headers: { Authorization: 'Bearer session-jwt' },
      }),
    );
    fetchSpy.mockRestore();
  });

  it('postNotaProInvalidate POSTs to nota-server with Bearer and strips trailing slash on base', async () => {
    // Arrange
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const baseUrl = 'https://ns.example/';
    const token = 't';

    // Act
    await postNotaProInvalidate(baseUrl, token);

    // Assert
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
    // Arrange
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const baseUrl = 'https://ns.example';
    const token = null;

    // Act
    const res = await fetchNotaProEntitled(baseUrl, token);

    // Assert
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: 'Unauthorized',
      entitled: false,
    });
    fetchSpy.mockRestore();
  });

  it('postSemanticSearch returns 401 without fetch when base URL is missing', async () => {
    // Arrange
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const baseUrl = undefined;
    const token = 't';
    const body = { query: 'hello' };

    // Act
    const res = await postSemanticSearch(baseUrl, token, body);

    // Assert
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
    fetchSpy.mockRestore();
  });

  it('postSemanticSearch POSTs to /api/semantic-search when configured', async () => {
    // Arrange
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ results: [] })));
    const baseUrl = 'https://ns.example/';
    const token = 'jwt';
    const body = { query: 'foo' };

    // Act
    await postSemanticSearch(baseUrl, token, body);

    // Assert
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ns.example/api/semantic-search',
      expect.objectContaining({
        method: 'POST',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest nested `expect.objectContaining`
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt',
        }),
        body: JSON.stringify({ query: 'foo' }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('postSearchIndexNote POSTs note id to index endpoint', async () => {
    // Arrange
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const baseUrl = 'https://ns.example';
    const token = 'jwt';
    const body = { noteId: '00000000-0000-4000-8000-000000000001' };

    // Act
    await postSearchIndexNote(baseUrl, token, body);

    // Assert
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ns.example/api/search/index-note',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          noteId: '00000000-0000-4000-8000-000000000001',
        }),
      }),
    );
    fetchSpy.mockRestore();
  });

  it('postSearchReindexAll POSTs empty JSON body', async () => {
    // Arrange
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, indexed: 0 })));
    const baseUrl = 'https://ns.example';
    const token = 'jwt';

    // Act
    await postSearchReindexAll(baseUrl, token);

    // Assert
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ns.example/api/search/reindex-all',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    fetchSpy.mockRestore();
  });
});
