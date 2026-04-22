import { getClerkAccessToken } from './clerk-token-ref';
import type { AudioNoteStudyResult } from './audio-note-blocks-to-doc';
import {
  ensureBlobForXaiStt,
  filenameForSttUpload,
} from './audio-to-xai-stt-format';

function notaServerBase(): string | undefined {
  const b = import.meta.env.VITE_NOTA_SERVER_API_URL;
  if (typeof b !== 'string' || !b.trim()) {
    return undefined;
  }
  return b.replace(/\/$/, '');
}

export type AudioToNoteSseEvent =
  | { event: 'transcript'; data: { text: string; duration: number } }
  | { event: 'notes_delta'; data: { text: string } }
  | { event: 'notes_done'; data: AudioNoteStudyResult }
  | { event: 'notes_parse_fallback'; data: { ok: boolean } }
  | { event: 'error'; data: { message: string } };

/**
 * POST multipart audio to nota-server; parses `text/event-stream` until the stream ends.
 */
export async function postAudioToNoteStream(
  audio: Blob,
  options: {
    locale?: string;
    courseName?: string;
    signal?: AbortSignal;
    onEvent?: (ev: AudioToNoteSseEvent) => void;
  } = {},
): Promise<AudioNoteStudyResult> {
  const base = notaServerBase();
  if (!base) {
    throw new Error(
      'Audio-to-note requires VITE_NOTA_SERVER_API_URL (apps/nota-server).',
    );
  }
  const token = await getClerkAccessToken();
  if (!token) {
    throw new Error('Unauthorized');
  }

  const payload = await ensureBlobForXaiStt(audio);
  const form = new FormData();
  form.append('audio', payload, filenameForSttUpload(payload));
  if (options.locale) {
    form.append('locale', options.locale);
  }
  if (options.courseName) {
    form.append('courseName', options.courseName);
  }

  const res = await fetch(`${base}/api/audio-to-note`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: options.signal,
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      res.status === 403 ? 'Nota Pro required' : 'Unauthorized',
    );
  }

  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Request failed: ${res.status}`);
  }

  const body = res.body;
  if (!body) {
    throw new Error('Empty response body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  let result: AudioNoteStudyResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    carry += decoder.decode(value, { stream: true });
    const blocks = carry.split('\n\n');
    carry = blocks.pop() ?? '';

    for (const block of blocks) {
      const ev = parseSseBlock(block);
      if (!ev) {
        continue;
      }
      options.onEvent?.(ev);
      if (ev.event === 'notes_done') {
        result = ev.data;
      }
      if (ev.event === 'error') {
        throw new Error(ev.data.message);
      }
    }
  }

  if (!result) {
    throw new Error('Stream ended without notes_done');
  }
  return result;
}

function parseSseBlock(block: string): AudioToNoteSseEvent | null {
  const lines = block.split('\n').filter((l) => l.length > 0);
  let eventName = 'message';
  const dataParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).trim());
    }
  }

  if (dataParts.length === 0) {
    return null;
  }

  const dataStr = dataParts.join('\n');
  const data: unknown = JSON.parse(dataStr);

  switch (eventName) {
    case 'transcript':
      return { event: 'transcript', data: data as { text: string; duration: number } };
    case 'notes_delta':
      return { event: 'notes_delta', data: data as { text: string } };
    case 'notes_done':
      return { event: 'notes_done', data: data as AudioNoteStudyResult };
    case 'notes_parse_fallback':
      return {
        event: 'notes_parse_fallback',
        data: data as { ok: boolean },
      };
    case 'error':
      return { event: 'error', data: data as { message: string } };
    default:
      return null;
  }
}
