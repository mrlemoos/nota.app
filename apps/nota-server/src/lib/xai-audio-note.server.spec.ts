import { describe, expect, test } from 'bun:test';
import {
  buildStudyNotesSystemPrompt,
  fallbackStudyNotesFromTranscript,
  parseStudyNotesJson,
  sanitizeAudioToNoteTextField,
  studyNotesResultSchema,
  transcriptUserMessage,
} from './xai-audio-note.server.ts';

describe('parseStudyNotesJson', () => {
  test('parses strict JSON', () => {
    const raw = `{"title":"Thermodynamics","blocks":[{"type":"heading","level":2,"text":"Overview"},{"type":"paragraph","text":"Heat is energy."}]}`;
    const r = parseStudyNotesJson(raw);
    expect(r.title).toBe('Thermodynamics');
    expect(r.blocks).toHaveLength(2);
  });

  test('extracts JSON from surrounding noise', () => {
    const raw = `Here is the JSON:\n{"title":"A","blocks":[{"type":"paragraph","text":"B"}]}\nThanks`;
    const r = parseStudyNotesJson(raw);
    expect(studyNotesResultSchema.safeParse(r).success).toBe(true);
    expect(r.title).toBe('A');
  });
});

describe('fallbackStudyNotesFromTranscript', () => {
  test('wraps empty transcript', () => {
    const r = fallbackStudyNotesFromTranscript('   ');
    expect(r.title).toBe('Study notes');
    expect(r.blocks[0]).toEqual({
      type: 'paragraph',
      text: '(Empty transcript)',
    });
  });
});

describe('sanitizeAudioToNoteTextField', () => {
  test('strips NUL and caps length', () => {
    expect(sanitizeAudioToNoteTextField('a\u0000b', { maxChars: 99 })).toBe('ab');
    expect(sanitizeAudioToNoteTextField('abcdef', { maxChars: 3 })).toBe('abc');
  });
});

describe('transcriptUserMessage', () => {
  test('wraps transcript with delimiters', () => {
    const m = transcriptUserMessage('hello');
    expect(m).toContain('<<<NOTA_TRANSCRIPT>>>');
    expect(m).toContain('<<<END_NOTA_TRANSCRIPT>>>');
    expect(m).toContain('hello');
  });
});

describe('buildStudyNotesSystemPrompt', () => {
  test('embeds sanitised course name only', () => {
    const p = buildStudyNotesSystemPrompt('Thermo\u0007');
    expect(p).toContain('Thermo');
    expect(p).not.toContain('\u0007');
  });
});
