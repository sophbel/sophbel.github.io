import { describe, it, expect } from 'vitest';
import { formatEventDate, splitByDate, type CalendarEvent } from '../src/lib/events.ts';

const event = (over: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'x',
  summary: 'Event',
  description: '',
  location: '',
  kind: 'instant',
  isMultiDay: false,
  start: '2026-09-15T14:00:00-04:00',
  end: '2026-09-15T15:00:00-04:00',
  timeZone: 'America/New_York',
  ...over,
});

describe('formatEventDate', () => {
  it('shows a date without a time for an all-day event', () => {
    const text = formatEventDate(event({ kind: 'date', start: '2026-10-05', end: '2026-10-06', isMultiDay: false }));
    expect(text).toBe('5 October 2026');
    expect(text).not.toMatch(/\d\d:\d\d/);
  });

  it('shows an inclusive range for a multi-day all-day event', () => {
    // google-cms has already converted the exclusive end to inclusive.
    expect(
      formatEventDate(event({ kind: 'date', start: '2026-10-05', end: '2026-10-10', isMultiDay: true })),
    ).toBe('5 October 2026 – 10 October 2026');
  });

  it('shows a time for a timed event', () => {
    expect(formatEventDate(event({}))).toMatch(/15 September 2026/);
    expect(formatEventDate(event({}))).toMatch(/\d{2}:\d{2}/);
  });

  it('does not invent a timezone for a floating event', () => {
    const text = formatEventDate(event({ kind: 'floating', start: '2026-09-15T14:00:00', end: undefined, timeZone: undefined }));
    expect(text).toMatch(/15 September 2026/);
    expect(text).toMatch(/14:00/);
  });

  it('handles a missing end', () => {
    expect(() => formatEventDate(event({ end: undefined }))).not.toThrow();
  });

  it('falls back to the raw value rather than throwing on an unparseable date', () => {
    expect(formatEventDate(event({ kind: 'date', start: 'not-a-date', end: undefined }))).toBe('not-a-date');
  });
});

describe('splitByDate', () => {
  const now = new Date('2026-09-20T00:00:00Z');

  it('partitions around the supplied instant rather than a hidden clock', () => {
    const past = event({ id: 'past', start: '2026-09-15T14:00:00-04:00' });
    const future = event({ id: 'future', start: '2026-09-25T14:00:00-04:00' });
    const { upcoming, past: previous } = splitByDate([past, future], now);
    expect(upcoming.map((e) => e.id)).toEqual(['future']);
    expect(previous.map((e) => e.id)).toEqual(['past']);
  });

  it('orders upcoming soonest-first and past most-recent-first', () => {
    const events = [
      event({ id: 'a', start: '2026-09-25T00:00:00Z' }),
      event({ id: 'b', start: '2026-09-22T00:00:00Z' }),
      event({ id: 'c', start: '2026-09-10T00:00:00Z' }),
      event({ id: 'd', start: '2026-09-01T00:00:00Z' }),
    ];
    const { upcoming, past } = splitByDate(events, now);
    expect(upcoming.map((e) => e.id)).toEqual(['b', 'a']);
    expect(past.map((e) => e.id)).toEqual(['c', 'd']);
  });

  it('treats an all-day event as upcoming for the whole of its day', () => {
    const today = event({ id: 'today', kind: 'date', start: '2026-09-20', end: undefined });
    expect(splitByDate([today], new Date('2026-09-20T18:00:00Z')).upcoming.map((e) => e.id)).toEqual(['today']);
  });
});
