import type { Candle } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Silent indicator suite. These power the confluence heatmap but are NEVER
// drawn as raw lines on the viewport (spec §2 — hidden confluence processing).
// ───────────────────────────────────────────────────────────────────────────

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

export function emaSeries(values: number[], period: number): number[] {
  const out: number[] = [];
  const k = 2 / (period + 1);
  let prev = values[0] ?? NaN;
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function emaAt(values: number[], period: number): number {
  return emaSeries(values, period).at(-1) ?? NaN;
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function cci(candles: Candle[], period = 20): number[] {
  const out: number[] = new Array(candles.length).fill(NaN);
  for (let i = period - 1; i < candles.length; i++) {
    const tps = candles.slice(i - period + 1, i + 1).map((c) => (c.h + c.l + c.c) / 3);
    const mean = tps.reduce((a, b) => a + b, 0) / period;
    const mad = tps.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    const tp = (candles[i].h + candles[i].l + candles[i].c) / 3;
    out[i] = mad === 0 ? 0 : (tp - mean) / (0.015 * mad);
  }
  return out;
}

export interface DonchianBand {
  upper: number;
  lower: number;
  middle: number;
  widthPct: number;
  flat: boolean;
}

export function donchian(candles: Candle[], period = 20): DonchianBand {
  const slice = candles.slice(-period - 1, -1);
  const window = slice.length ? slice : candles.slice(-period);
  const upper = Math.max(...window.map((c) => c.h));
  const lower = Math.min(...window.map((c) => c.l));
  const middle = (upper + lower) / 2;
  const widthPct = ((upper - lower) / middle) * 100;
  return { upper, lower, middle, widthPct, flat: widthPct < 1.2 };
}

export interface SupertrendPoint {
  value: number;
  direction: 1 | -1; // 1 bullish, -1 bearish
}

export function supertrend(candles: Candle[], period = 10, mult = 3): SupertrendPoint {
  if (candles.length < period + 1) return { value: candles.at(-1)!.c, direction: 1 };
  const slice = candles.slice(-period - 1);
  const atrs: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const tr = Math.max(
      slice[i].h - slice[i].l,
      Math.abs(slice[i].h - slice[i - 1].c),
      Math.abs(slice[i].l - slice[i - 1].c),
    );
    atrs.push(tr);
  }
  const atr = atrs.reduce((a, b) => a + b, 0) / atrs.length;
  const last = candles.at(-1)!;
  const hl2 = (last.h + last.l) / 2;
  const upper = hl2 + mult * atr;
  const lower = hl2 - mult * atr;
  const prev = candles.at(-2)!;
  const direction: 1 | -1 = last.c > prev.c ? 1 : -1;
  return { value: direction === 1 ? lower : upper, direction };
}

export interface ChandelierState {
  longStop: number;
  shortStop: number;
  atr: number;
}

export function chandelier(candles: Candle[], period = 22, mult = 3): ChandelierState {
  const slice = candles.slice(-period);
  const atrs: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const tr = Math.max(
      slice[i].h - slice[i].l,
      Math.abs(slice[i].h - slice[i - 1].c),
      Math.abs(slice[i].l - slice[i - 1].c),
    );
    atrs.push(tr);
  }
  const atr = atrs.length ? atrs.reduce((a, b) => a + b, 0) / atrs.length : 0;
  const highest = Math.max(...slice.map((c) => c.h));
  const lowest = Math.min(...slice.map((c) => c.l));
  return { longStop: highest - mult * atr, shortStop: lowest + mult * atr, atr };
}

/** Central Pivot Range from the prior session H/L/C. */
export interface CprBand {
  pivot: number;
  bc: number;
  tc: number;
}

export function cpr(prev: { h: number; l: number; c: number }): CprBand {
  const pivot = (prev.h + prev.l + prev.c) / 3;
  const bc = (prev.h + prev.l) / 2;
  const tc = pivot - (bc - pivot);
  return { pivot, bc, tc };
}

export interface FibLevel {
  ratio: number;
  price: number;
}

export function fibonacci(swingHigh: number, swingLow: number): FibLevel[] {
  return [0, 0.382, 0.5, 0.618, 0.786, 1].map((ratio) => ({
    ratio,
    price: swingHigh - (swingHigh - swingLow) * ratio,
  }));
}

export interface HiddenIndicatorSnapshot {
  rsi: number;
  cci: number;
  donchian: DonchianBand;
  supertrend: SupertrendPoint;
  chandelier: ChandelierState;
  cpr: CprBand;
  ema20: number;
  ema50: number;
  ema200: number;
  trendAlignment: number; // -1..1
}

export function snapshotIndicators(candles: Candle[]): HiddenIndicatorSnapshot {
  const closes = candles.map((c) => c.c);
  const rsiSeries = rsi(closes);
  const cciSeries = cci(candles);
  const dc = donchian(candles);
  const st = supertrend(candles);
  const ch = chandelier(candles);
  const pivotInput = candles.length > 22 ? candles[candles.length - 22] : candles[0];
  const ema20 = emaAt(closes, 20);
  const ema50 = emaAt(closes, 50);
  const ema200 = emaAt(closes, Math.min(200, closes.length - 1));
  const price = closes.at(-1) ?? 0;
  const votes =
    (st.direction === 1 ? 1 : -1) +
    (price > ema20 ? 1 : -1) +
    (ema20 > ema50 ? 1 : -1) +
    (ema50 > ema200 ? 1 : -1) +
    ((rsiSeries.at(-1) ?? 50) > 50 ? 1 : -1);
  return {
    rsi: rsiSeries.at(-1) ?? 50,
    cci: cciSeries.at(-1) ?? 0,
    donchian: dc,
    supertrend: st,
    chandelier: ch,
    cpr: cpr(pivotInput),
    ema20,
    ema50,
    ema200,
    trendAlignment: votes / 5,
  };
}
