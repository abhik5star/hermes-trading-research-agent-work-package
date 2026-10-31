// ───────────────────────────────────────────────────────────────────────────
// Market sessions — real exchange clock.
//
// Indian cash market (NSE/BSE) runs 09:15–15:30 IST on weekdays, with a
// pre-open window at 09:00. Crypto trades 24/7.
//
// When the Indian session is closed the dashboard must NOT keep inventing
// candles for NIFTY/BANKNIFTY/NSE stocks — it shows the last close and says
// "market closed" instead. That is the difference between a research tool and
// a data feed that lies.
// ───────────────────────────────────────────────────────────────────────────

export type SessionState = 'open' | 'pre-open' | 'closed' | 'weekend';

export interface MarketSession {
  state: SessionState;
  label: string;
  /** Local wall clock at the exchange, e.g. "14:32:07" */
  clock: string;
  /** Date at the exchange, e.g. "Fri, 31 Oct 2026" */
  date: string;
  /** Minutes until the next open (0 when open) */
  minutesToOpen: number;
  /** Minutes until the close (0 when closed) */
  minutesToClose: number;
}

const IST = 'Asia/Kolkata';

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: IST,
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const parts = (now: Date) => {
  const out: Record<string, string> = {};
  for (const p of FORMATTER.formatToParts(now)) out[p.type] = p.value;
  return out;
};

const OPEN_MIN = 9 * 60 + 15; // 09:15
const PRE_OPEN_MIN = 9 * 60; // 09:00
const CLOSE_MIN = 15 * 60 + 30; // 15:30

/** Current NSE/BSE session state. */
export function nseSession(now: Date = new Date()): MarketSession {
  const p = parts(now);
  const weekday = p.weekday;
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  const clock = `${p.hour}:${p.minute}:${p.second}`;
  const date = `${weekday}, ${p.day} ${p.month} ${p.year}`;

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  if (isWeekend) {
    return { state: 'weekend', label: 'Market closed · weekend', clock, date, minutesToOpen: 0, minutesToClose: 0 };
  }
  if (minutes < PRE_OPEN_MIN) {
    return {
      state: 'closed',
      label: 'Market closed · opens 09:15 IST',
      clock,
      date,
      minutesToOpen: PRE_OPEN_MIN - minutes,
      minutesToClose: 0,
    };
  }
  if (minutes < OPEN_MIN) {
    return {
      state: 'pre-open',
      label: 'Pre-open · 09:15 se lagega',
      clock,
      date,
      minutesToOpen: OPEN_MIN - minutes,
      minutesToClose: CLOSE_MIN - minutes,
    };
  }
  if (minutes <= CLOSE_MIN) {
    return {
      state: 'open',
      label: 'Market open',
      clock,
      date,
      minutesToOpen: 0,
      minutesToClose: CLOSE_MIN - minutes,
    };
  }
  return {
    state: 'closed',
    label: 'Market closed · opens 09:15 IST',
    clock,
    date,
    minutesToOpen: 24 * 60 - minutes + PRE_OPEN_MIN,
    minutesToClose: 0,
  };
}

/** True while the Indian cash market is trading. */
export function isNseOpen(now: Date = new Date()): boolean {
  return nseSession(now).state === 'open';
}

/** Crypto never closes. */
export function isCryptoOpen(): boolean {
  return true;
}

/** True when the given exchange can currently produce new candles. */
export function isExchangeOpen(exchange: 'NSE' | 'BINANCE', now: Date = new Date()): boolean {
  return exchange === 'NSE' ? isNseOpen(now) : isCryptoOpen();
}

/** Short badge text for a closed market. */
export function sessionBadge(state: SessionState): string {
  switch (state) {
    case 'open':
      return 'OPEN';
    case 'pre-open':
      return 'PRE-OPEN';
    case 'weekend':
      return 'WEEKEND';
    default:
      return 'CLOSED';
  }
}
