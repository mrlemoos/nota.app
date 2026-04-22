import type { Request, Response } from 'express';
import { getUserIdFromBearer } from '../auth.ts';
import { getServerNotaProEntitled } from '../lib/clerk-billing.server.ts';
import { isAllowedAudioUploadMime } from '../lib/audio-upload.server.ts';
import {
  buildStudyNotesSystemPrompt,
  fallbackStudyNotesFromTranscript,
  parseStudyNotesJson,
  sanitizeAudioToNoteTextField,
  transcribeAudioWithXai,
  streamXaiChatCompletion,
  transcriptUserMessage,
  type StudyNotesResult,
} from '../lib/xai-audio-note.server.ts';

function bearerWebRequest(req: Request): globalThis.Request {
  return new Request('http://127.0.0.1/', {
    headers: { authorization: req.headers.authorization ?? '' },
  });
}

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Express handler: expects `multer` to have attached `req.file` for field `audio`.
 */
export async function audioToNoteHandler(req: Request, res: Response): Promise<void> {
  const webReq = bearerWebRequest(req);
  const userId = await getUserIdFromBearer(webReq);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!(await getServerNotaProEntitled(userId))) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!process.env.XAI_API_KEY?.trim()) {
    res.status(503).json({ error: 'Audio-to-note is not configured on the server.' });
    return;
  }

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file?.buffer?.length) {
    res.status(400).json({ error: 'Missing audio file (field: audio)' });
    return;
  }

  if (!isAllowedAudioUploadMime(file.mimetype)) {
    res.status(400).json({ error: `Unsupported audio type: ${file.mimetype ?? 'unknown'}` });
    return;
  }

  const localeRaw =
    typeof req.body?.locale === 'string'
      ? sanitizeAudioToNoteTextField(req.body.locale, { maxChars: 32 })
      : undefined;
  const locale = localeRaw && localeRaw.length > 0 ? localeRaw : undefined;
  const courseNameRaw =
    typeof req.body?.courseName === 'string'
      ? sanitizeAudioToNoteTextField(req.body.courseName, { maxChars: 200 })
      : undefined;
  const courseName =
    courseNameRaw && courseNameRaw.length > 0 ? courseNameRaw : undefined;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const { text: transcript, duration } = await transcribeAudioWithXai({
      audio: file.buffer,
      filename: file.originalname || 'recording.webm',
      mime: file.mimetype,
      language: locale,
    });

    sseWrite(res, 'transcript', { text: transcript, duration });

    const system = buildStudyNotesSystemPrompt(courseName);
    const user = transcriptUserMessage(transcript);

    let notesResult: StudyNotesResult;
    try {
      const raw = await streamXaiChatCompletion({
        system,
        user,
        onDelta: (chunk) => {
          sseWrite(res, 'notes_delta', { text: chunk });
        },
      });
      notesResult = parseStudyNotesJson(raw);
    } catch {
      notesResult = fallbackStudyNotesFromTranscript(transcript);
      sseWrite(res, 'notes_parse_fallback', { ok: true });
    }

    sseWrite(res, 'notes_done', notesResult);
    res.end();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Audio-to-note failed';
    sseWrite(res, 'error', { message });
    res.end();
  }
}
