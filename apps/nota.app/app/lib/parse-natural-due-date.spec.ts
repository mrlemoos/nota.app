import { describe, expect, it } from 'vitest';
import {
  allDateSpansInText,
  dateSpanContainingOffset,
  firstDateFromText,
  parseNaturalDueDate,
} from './parse-natural-due-date';

describe('parseNaturalDueDate', () => {
  it('returns null for empty or whitespace input', () => {
    const ref = new Date('2025-06-15T12:00:00.000Z');
    expect(parseNaturalDueDate('', ref)).toBeNull();
    expect(parseNaturalDueDate('   ', ref)).toBeNull();
  });

  it('returns null when no date can be parsed', () => {
    const ref = new Date('2025-06-15T12:00:00.000Z');
    expect(parseNaturalDueDate('not a date at all', ref)).toBeNull();
  });

  it('parses an explicit calendar date', () => {
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const result = parseNaturalDueDate('4 July 2025 at 3pm', ref);
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(6);
    expect(result!.getDate()).toBe(4);
    expect(result!.getHours()).toBe(15);
  });
});

describe('firstDateFromText', () => {
  it('extracts a date embedded in a longer phrase', () => {
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const result = firstDateFromText('My birthday is 20 May 2003', ref);
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2003);
    expect(result!.getMonth()).toBe(4);
    expect(result!.getDate()).toBe(20);
  });
});

describe('dateSpanContainingOffset', () => {
  const ref = new Date('2025-06-15T12:00:00.000Z');

  it('returns the embedded date span when offset is inside it', () => {
    const text = 'My birthday is 20 May 2003';
    const inner = '20 May 2003';
    const start = text.indexOf(inner);
    expect(dateSpanContainingOffset(text, start + 3, ref)).toEqual({
      start,
      end: start + inner.length,
    });
  });

  it('returns the full trimmed span when whole-string parse applies', () => {
    const text = '  4 July 2025 at 3pm  ';
    const trimmed = '4 July 2025 at 3pm';
    const lead = text.indexOf(trimmed);
    expect(dateSpanContainingOffset(text, lead + 2, ref)).toEqual({
      start: lead,
      end: lead + trimmed.length,
    });
  });

  it('returns null when offset is outside any date span', () => {
    expect(dateSpanContainingOffset('My birthday is 20 May 2003', 2, ref)).toBeNull();
  });

  it('includes the gap position after the last character of the match', () => {
    const text = 'due next Friday';
    const span = dateSpanContainingOffset(text, text.length, ref);
    expect(span).not.toBeNull();
    expect(text.slice(span!.start, span!.end)).toMatch(/Friday/i);
  });
});

describe('allDateSpansInText', () => {
  it('returns merged spans for parsed phrases', () => {
    const ref = new Date('2025-06-15T12:00:00.000Z');
    const text = 'My birthday is 20 May 2003';
    const spans = allDateSpansInText(text, ref);
    expect(spans.length).toBeGreaterThanOrEqual(1);
    const inner = '20 May 2003';
    const start = text.indexOf(inner);
    expect(spans.some((s) => s.start === start && s.end === start + inner.length)).toBe(true);
  });
});
