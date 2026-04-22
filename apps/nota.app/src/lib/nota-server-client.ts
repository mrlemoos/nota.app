import {
  fetchNotaProEntitled as fetchNotaProEntitledRequest,
  postNotaProInvalidate as postNotaProInvalidateRequest,
  postSearchIndexNote as postSearchIndexNoteRequest,
  postSemanticSearch as postSemanticSearchRequest,
  postSearchReindexAll as postSearchReindexAllRequest,
} from '@nota.app/nota-server-client';
import { getClerkAccessToken } from './clerk-token-ref';

function notaServerBase(): string | undefined {
  const b = import.meta.env.VITE_NOTA_SERVER_API_URL;
  if (typeof b !== 'string' || !b.trim()) {
    return undefined;
  }
  return b.replace(/\/$/, '');
}

/** `GET` on nota-server; Bearer Clerk session JWT. Missing `VITE_NOTA_SERVER_API_URL` → 401 without calling the network. */
export async function fetchNotaProEntitled(): Promise<Response> {
  return fetchNotaProEntitledRequest(
    notaServerBase(),
    await getClerkAccessToken(),
  );
}

/** `POST` on nota-server; same Bearer auth as `fetchNotaProEntitled`. */
export async function postNotaProInvalidate(): Promise<Response> {
  return postNotaProInvalidateRequest(
    notaServerBase(),
    await getClerkAccessToken(),
  );
}

/** Semantic search (`POST /api/semantic-search`). Requires Nota Pro and `VITE_NOTA_SERVER_API_URL`. */
export async function postSemanticSearch(body: {
  query: string;
}): Promise<Response> {
  return postSemanticSearchRequest(
    notaServerBase(),
    await getClerkAccessToken(),
    body,
  );
}

/** Upsert semantic index row for one note (`POST /api/search/index-note`). */
export async function postSearchIndexNote(body: {
  noteId: string;
}): Promise<Response> {
  return postSearchIndexNoteRequest(
    notaServerBase(),
    await getClerkAccessToken(),
    body,
  );
}

/** Full vault semantic reindex (`POST /api/search/reindex-all`). */
export async function postSearchReindexAll(): Promise<Response> {
  return postSearchReindexAllRequest(
    notaServerBase(),
    await getClerkAccessToken(),
  );
}
