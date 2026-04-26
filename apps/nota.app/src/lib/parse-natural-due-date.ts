import { en } from 'chrono-node';

const option = { forwardDate: true } as const;

function trimBounds(text: string): { lead: number; trimmed: string; trailEnd: number } | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const lead = text.indexOf(trimmed);
  return { lead, trimmed, trailEnd: lead + trimmed.length };
}

function offsetTouchesSpan(
  offset: number,
  start: number,
  length: number,
): boolean {
  const endPos = start + length;
  return offset >= start && offset <= endPos;
}

/**
 * Every chrono match in the trimmed slice, mapped to indices in `text`, merged on overlap.
 */
export function allDateSpansInText(text: string, ref: Date): Array<{ start: number; end: number }> {
  const b = trimBounds(text);
  if (!b) {
    return [];
  }
  const { lead, trimmed, trailEnd } = b;
  const results = en.GB.parse(trimmed, ref, option);
  const spans =
    results.length > 0
      ? results.map((r) => ({
          start: lead + r.index,
          end: lead + r.index + r.text.length,
        }))
      : en.GB.parseDate(trimmed, ref, option)
        ? [{ start: lead, end: trailEnd }]
        : [];
  spans.sort((a, x) => a.start - x.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const s of spans) {
    const prev = merged[merged.length - 1];
    if (!prev || s.start >= prev.end) {
      merged.push({ ...s });
    } else {
      prev.end = Math.max(prev.end, s.end);
    }
  }
  return merged;
}

/**
 * Span of the date phrase under `offset` (0-based index into `text`, inclusive of gap after last char).
 * Uses {@link en.GB.parse} spans only when they exist so a sentence like "My birthday is 20 May 2003"
 * resolves to the date phrase, not the whole line ({@link en.GB.parseDate} can match the full string).
 * Prefers the narrowest span when several overlap. If {@link en.GB.parse} is empty but {@link en.GB.parseDate}
 * succeeds, the full trimmed slice is the span (rare).
 */
export function dateSpanContainingOffset(
  text: string,
  offset: number,
  ref: Date,
): { start: number; end: number } | null {
  const b = trimBounds(text);
  if (!b) {
    return null;
  }
  const { lead, trimmed, trailEnd } = b;
  const results = en.GB.parse(trimmed, ref, option);
  const candidates: Array<{ start: number; end: number }> = [];
  for (const r of results) {
    const start = lead + r.index;
    const len = r.text.length;
    if (offsetTouchesSpan(offset, start, len)) {
      candidates.push({ start, end: start + len });
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, c) => a.end - a.start - (c.end - c.start));
    return candidates[0];
  }
  if (
    results.length === 0 &&
    en.GB.parseDate(trimmed, ref, option) &&
    offsetTouchesSpan(offset, lead, trimmed.length)
  ) {
    return { start: lead, end: trailEnd };
  }
  return null;
}

/**
 * First calendar date found in text: tries whole-string parse, then embedded spans (chrono GB).
 */
export function firstDateFromText(input: string, ref: Date): Date | null {
  const b = trimBounds(input);
  if (!b) {
    return null;
  }
  const { trimmed } = b;
  const whole = en.GB.parseDate(trimmed, ref, option);
  if (whole) {
    return whole;
  }
  const results = en.GB.parse(trimmed, ref, option);
  if (results.length === 0) {
    return null;
  }
  return results[0].date();
}

/**
 * Parse natural-language date/time (whole string or embedded) using British-English casual rules.
 */
export function parseNaturalDueDate(input: string, ref: Date): Date | null {
  return firstDateFromText(input, ref);
}
