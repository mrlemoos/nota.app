import { describe, expect, it } from 'vitest';
import {
  allDateSpansInText,
  dateSpanContainingOffset,
  firstDateFromText,
  parseNaturalDueDate,
} from './parse-natural-due-date';

describe('parseNaturalDueDate', () => {
  it('returns null for empty or whitespace input', () => {
    // Arrange
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const empty = '';
    const whitespace = '   ';

    // Act
    const emptyResult = parseNaturalDueDate(empty, ref);
    const wsResult = parseNaturalDueDate(whitespace, ref);

    // Assert
    expect(emptyResult).toBeNull();
    expect(wsResult).toBeNull();
  });

  it('returns null when no date can be parsed', () => {
    // Arrange
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const text = 'not a date at all';

    // Act
    const result = parseNaturalDueDate(text, ref);

    // Assert
    expect(result).toBeNull();
  });

  it('parses an explicit calendar date', () => {
    // Arrange
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const text = '4 July 2025 at 3pm';

    // Act
    const result = parseNaturalDueDate(text, ref);

    // Assert
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(6);
    expect(result!.getDate()).toBe(4);
    expect(result!.getHours()).toBe(15);
  });
});

describe('firstDateFromText', () => {
  it('extracts a date embedded in a longer phrase', () => {
    // Arrange
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const text = 'My birthday is 20 May 2003';

    // Act
    const result = firstDateFromText(text, ref);

    // Assert
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2003);
    expect(result!.getMonth()).toBe(4);
    expect(result!.getDate()).toBe(20);
  });
});

describe('dateSpanContainingOffset', () => {
  const ref = new Date('2025-06-15T12:00:00.000Z');

  it('returns the embedded date span when offset is inside it', () => {
    // Arrange
    const text = 'My birthday is 20 May 2003';
    const inner = '20 May 2003';
    const start = text.indexOf(inner);
    const offset = start + 3;

    // Act
    const span = dateSpanContainingOffset(text, offset, ref);

    // Assert
    expect(span).toEqual({
      start,
      end: start + inner.length,
    });
  });

  it('returns the full trimmed span when whole-string parse applies', () => {
    // Arrange
    const text = '  4 July 2025 at 3pm  ';
    const trimmed = '4 July 2025 at 3pm';
    const lead = text.indexOf(trimmed);
    const offset = lead + 2;

    // Act
    const span = dateSpanContainingOffset(text, offset, ref);

    // Assert
    expect(span).toEqual({
      start: lead,
      end: lead + trimmed.length,
    });
  });

  it('returns null when offset is outside any date span', () => {
    // Arrange
    const text = 'My birthday is 20 May 2003';
    const offset = 2;

    // Act
    const span = dateSpanContainingOffset(text, offset, ref);

    // Assert
    expect(span).toBeNull();
  });

  it('includes the gap position after the last character of the match', () => {
    // Arrange
    const text = 'due next Friday';
    const offset = text.length;

    // Act
    const span = dateSpanContainingOffset(text, offset, ref);

    // Assert
    expect(span).not.toBeNull();
    expect(text.slice(span!.start, span!.end)).toMatch(/Friday/i);
  });
});

describe('allDateSpansInText', () => {
  it('returns merged spans for parsed phrases', () => {
    // Arrange
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const text = 'My birthday is 20 May 2003';
    const inner = '20 May 2003';
    const start = text.indexOf(inner);

    // Act
    const spans = allDateSpansInText(text, ref);

    // Assert
    expect(spans.length).toBeGreaterThanOrEqual(1);
    expect(spans.some((s) => s.start === start && s.end === start + inner.length)).toBe(true);
  });
});
