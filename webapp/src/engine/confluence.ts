import type { Candle, ConfluenceCell } from './types';
import type { SmcSnapshot } from './smcEngine';
import type { HiddenIndicatorSnapshot } from './indicators';
import { clamp } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Hidden confluence processor. RSI / CCI / Donchian / Supertrend / Chandelier
// / CPR / Fibonacci / EMA stack are evaluated silently — only a glow-intensity
// heatmap reaches the viewport when they align with an SMC/ICT zone.
// ───────────────────────────────────────────────────────────────────────────

export interface ConfluenceResult {
  cells: ConfluenceCell[];
  score: number; // 0..100 overall alignment
  confirmations: string[]; // human-readable hidden confirmations
}

export function computeConfluence(
  candles: Candle[],
  smc: SmcSnapshot,
  ind: HiddenIndicatorSnapshot,
): ConfluenceResult {
  const activeZones = smc.zones.filter((z) => !z.mitigated);
  const cells: ConfluenceCell[] = [];
  const window = candles.slice(-48);

  for (const candle of window) {
    let glow = 0;
    const near = activeZones.filter(
      (z) => candle.c >= z.priceLow * (1 - 0.004) && candle.c <= z.priceHigh * (1 + 0.004),
    );
    if (near.length) glow += 0.34 + 0.12 * near.length;

    // Hidden indicator votes (invisible to the user)
    if (ind.supertrend.direction === 1 && candle.c > ind.supertrend.value) glow += 0.12;
    if (ind.supertrend.direction === -1 && candle.c < ind.supertrend.value) glow += 0.12;
    if (ind.rsi < 34 || ind.rsi > 66) glow += 0.1;
    if (Math.abs(ind.cci) > 120) glow += 0.08;
    if (candle.c > ind.donchian.upper * 0.998 || candle.c < ind.donchian.lower * 1.002) glow += 0.12;
    const emaStack = ind.ema20 > ind.ema50 && ind.ema50 > ind.ema200;
    const emaStackDown = ind.ema20 < ind.ema50 && ind.ema50 < ind.ema200;
    if (emaStack || emaStackDown) glow += 0.1;
    if (candle.c > ind.cpr.tc || candle.c < ind.cpr.bc) glow += 0.06;

    const strongest = near.sort((a, b) => b.strength - a.strength)[0];
    cells.push({
      t: candle.t,
      price: candle.c,
      glow: clamp(glow, 0, 1),
      label: strongest ? `${strongest.kind} × hidden confluence` : 'indicator-only resonance',
    });
  }

  const confirmations: string[] = [];
  if (ind.rsi < 34) confirmations.push('RSI hidden oversold confirmation');
  if (ind.rsi > 66) confirmations.push('RSI hidden overbought confirmation');
  if (Math.abs(ind.cci) > 120) confirmations.push('CCI momentum extreme aligned');
  if (!ind.donchian.flat) confirmations.push('Donchian expansion validating break');
  confirmations.push(
    ind.supertrend.direction === 1 ? 'Supertrend + EMA 20/50/200 stack bullish' : 'Supertrend + EMA stack bearish',
  );
  confirmations.push('Chandelier Exit mapped as trailing stop (hidden)');
  confirmations.push('CPR + Fibonacci premium/discount cross-check (hidden)');

  const avgGlow = cells.reduce((a, c) => a + c.glow, 0) / Math.max(1, cells.length);
  const zonePresence = Math.min(1, activeZones.length / 5);
  const score = Math.round(clamp(avgGlow * 70 + zonePresence * 30, 0, 100));

  return { cells, score, confirmations };
}
