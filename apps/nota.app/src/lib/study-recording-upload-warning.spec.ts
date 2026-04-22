import { describe, expect, it } from 'vitest';
import { formatStudyRecordingUploadWarning } from './study-recording-upload-warning';

describe('formatStudyRecordingUploadWarning', () => {
  it('includes Error message detail when present', () => {
    // Arrange
    const err = new Error('Storage quota exceeded');

    // Act
    const result = formatStudyRecordingUploadWarning(err);

    // Assert
    expect(result).toContain('Storage quota exceeded');
    expect(result).toContain('Your study notes were still saved.');
    expect(result).toMatch(/^Could not save the original recording /);
  });

  it('uses generic detail when Error message is empty', () => {
    // Arrange
    const err = new Error('');

    // Act
    const result = formatStudyRecordingUploadWarning(err);

    // Assert
    expect(result).toContain('Something went wrong while saving the recording.');
    expect(result).toContain('Your study notes were still saved.');
  });

  it('uses generic detail for non-Error values', () => {
    // Arrange
    const err = { code: 'X' };

    // Act
    const result = formatStudyRecordingUploadWarning(err);

    // Assert
    expect(result).toContain('Something went wrong while saving the recording.');
    expect(result).not.toContain('[object Object]');
  });

  it('truncates very long Error messages', () => {
    // Arrange
    const long = 'x'.repeat(300);
    const err = new Error(long);

    // Act
    const result = formatStudyRecordingUploadWarning(err);

    // Assert
    expect(result.length).toBeLessThan(long.length + 80);
    expect(result).toContain('…');
  });
});
