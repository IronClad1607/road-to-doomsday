import { useEffect, useState } from 'react';

/**
 * Avengers: Doomsday — 18 Dec 2026, 09:00 IST.
 *
 * The offset is explicit so the countdown targets the same instant everywhere.
 * The prototype parsed this as a floating local time, which only lined up with
 * the advertised IST showtime for viewers already in IST.
 */
export const DOOMSDAY_AT = Date.parse('2026-12-18T09:00:00+05:30');

export interface Countdown {
  /** Zero-padded, ready to render. Days is not padded to a fixed width. */
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  /** Milliseconds left, floored at zero once the date passes. */
  msRemaining: number;
}

const pad = (value: number): string => String(value).padStart(2, '0');

function countdownTo(target: number, now: number): Countdown {
  const msRemaining = Math.max(0, target - now);
  return {
    days: pad(Math.floor(msRemaining / 86_400_000)),
    hours: pad(Math.floor(msRemaining / 3_600_000) % 24),
    minutes: pad(Math.floor(msRemaining / 60_000) % 60),
    seconds: pad(Math.floor(msRemaining / 1000) % 60),
    msRemaining,
  };
}

/**
 * Ticks once a second toward `target`.
 *
 * Kept as its own hook so the per-second re-render is contained to the
 * countdown display — the ~100 entry cards below it never re-render on a tick.
 */
export function useCountdown(target: number = DOOMSDAY_AT): Countdown {
  const [countdown, setCountdown] = useState(() => countdownTo(target, Date.now()));

  useEffect(() => {
    setCountdown(countdownTo(target, Date.now()));
    const timer = setInterval(() => setCountdown(countdownTo(target, Date.now())), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return countdown;
}
