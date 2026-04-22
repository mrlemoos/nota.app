import { describe, expect, it } from 'vitest';
import { formatRecordingDuration } from './format-recording-duration';

describe('formatRecordingDuration', () => {
  it('formats zero as 00:00', () => {
    // Arrange
    const seconds = 0;

    // Act
    const result = formatRecordingDuration(seconds);

    // Assert
    expect(result).toBe('00:00');
  });

  it('formats seconds under one minute', () => {
    // Arrange
    const seconds = 65;

    // Act
    const result = formatRecordingDuration(seconds);

    // Assert
    expect(result).toBe('01:05');
  });

  it('formats values above 59 minutes without wrapping minutes', () => {
    // Arrange
    const seconds = 90 * 60;

    // Act
    const result = formatRecordingDuration(seconds);

    // Assert
    expect(result).toBe('90:00');
  });

  it('clamps negative input to 00:00', () => {
    // Arrange
    const seconds = -10;

    // Act
    const result = formatRecordingDuration(seconds);

    // Assert
    expect(result).toBe('00:00');
  });
});
