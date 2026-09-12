/**
 * Presenting calendar events produced by @palebluebytes/cms.
 *
 * The four `kind` values are not decoration: a `date` event has no time and
 * must never be shifted by a timezone, and a `floating` event means the wall
 * clock time as written, wherever you are. Formatting through `new Date()`
 * alone silently gets both wrong — an all-day event on the 5th renders as the
 * 4th for anyone west of UTC.
 */

export type EventKind = 'date' | 'floating' | 'zoned' | 'instant';

export interface CalendarEvent {
  id: string;
  summary: string | undefined;
  description: string;
  location: string;
  kind: EventKind;
  isMultiDay: boolean;
  start: string;
  end: string | undefined;
  timeZone: string | undefined;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

const monthName = (year: number, month: number, day: number): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));

/** Format a `YYYY-MM-DD` string without letting a timezone move the day. */
function formatDateOnly(value: string): string | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  return monthName(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Format a timezone-less timestamp exactly as written. */
function formatWallClock(value: string): string | null {
  const match = WALL_CLOCK.exec(value);
  if (!match) return null;
  const date = monthName(Number(match[1]), Number(match[2]), Number(match[3]));
  return `${date}, ${match[4]}:${match[5]}`;
}

function formatInstant(value: string, timeZone: string | undefined): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  // Never fall through to the machine's zone. Omitting `timeZone` makes
  // Intl use the host default, so the same event would render one time in CI
  // and another on a laptop - a build whose output depends on where it ran.
  // UTC is wrong-looking but deterministic; the source zone is preferred when
  // it is usable.
  //
  // The source zone is whatever the calendar said and is not guaranteed to be
  // IANA - Outlook writes "W. Europe Standard Time" - so an unusable value
  // must not throw at render time.
  try {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: timeZone ?? 'UTC' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(date);
  }
}

export function formatEventDate(event: CalendarEvent): string {
  if (event.kind === 'date') {
    const start = formatDateOnly(event.start);
    if (start === null) return event.start;
    if (!event.isMultiDay || !event.end) return start;
    const end = formatDateOnly(event.end);
    return end === null ? start : `${start} – ${end}`;
  }

  if (event.kind === 'floating') {
    return formatWallClock(event.start) ?? event.start;
  }

  return formatInstant(event.start, event.timeZone) ?? event.start;
}

/** Milliseconds since the epoch, or 0 for anything unparseable. */
const instantOf = (value: string): number => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const startOf = (event: CalendarEvent): number => instantOf(event.start);

/**
 * The instant an event stops being upcoming. An all-day event stays upcoming
 * for the whole of its day rather than expiring at midnight.
 */
function expiryOf(event: CalendarEvent): number {
  const dateOnly = DATE_ONLY.exec(event.end ?? event.start);
  if (dateOnly) {
    return Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59, 59, 999);
  }
  return instantOf(event.start);
}

/**
 * Partition into upcoming and past. The instant is a parameter, not a call to
 * `Date.now()`, so this stays pure and testable.
 */
export function splitByDate(
  events: CalendarEvent[],
  now: Date,
): { upcoming: CalendarEvent[]; past: CalendarEvent[] } {
  const cutoff = now.getTime();
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];

  for (const event of events) {
    (expiryOf(event) >= cutoff ? upcoming : past).push(event);
  }

  upcoming.sort((a, b) => startOf(a) - startOf(b));
  past.sort((a, b) => startOf(b) - startOf(a));
  return { upcoming, past };
}
