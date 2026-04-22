import { describe, expect, it } from 'vitest';
import { dailyNoteDisplayTitle } from './todays-note';
import {
  formatStudyNoteTitle,
  studyNotePlaceholderQueuedTitle,
  studyNotePlaceholderRecordingTitle,
} from './study-note-title';

describe('formatStudyNoteTitle', () => {
  it('formats base title from note created_at', () => {
    // Arrange
    const created = '2026-04-15T10:00:00.000Z';
    const modelTitle = '  ';
    const day = dailyNoteDisplayTitle(new Date(created));

    // Act
    const title = formatStudyNoteTitle(created, modelTitle);

    // Assert
    expect(title).toBe(`Study note: ${day}`);
  });

  it('appends non-generic model title', () => {
    // Arrange
    const created = '2026-03-04T12:00:00.000Z';
    const modelTitle = 'Thermodynamics';
    const day = dailyNoteDisplayTitle(new Date(created));

    // Act
    const title = formatStudyNoteTitle(created, modelTitle);

    // Assert
    expect(title).toBe(`Study note: ${day} — Thermodynamics`);
  });

  it('omits generic fallback title', () => {
    // Arrange
    const created = '2026-01-01T00:00:00.000Z';
    const modelTitle = 'Study notes';
    const day = dailyNoteDisplayTitle(new Date(created));

    // Act
    const title = formatStudyNoteTitle(created, modelTitle);

    // Assert
    expect(title).toBe(`Study note: ${day}`);
  });
});

describe('placeholders', () => {
  it('recording and queued titles share Study note prefix', () => {
    // Arrange
    // (placeholder helpers take no arguments)

    // Act
    const recording = studyNotePlaceholderRecordingTitle();
    const queued = studyNotePlaceholderQueuedTitle();

    // Assert
    expect(recording).toMatch(/^Study note: /);
    expect(recording).toContain('recording');
    expect(queued).toMatch(/^Study note: /);
    expect(queued).toContain('queued for sync');
  });
});
