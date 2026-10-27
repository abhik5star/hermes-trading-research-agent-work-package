import type { Candle, StrategyGenome } from './types';
import { gaussian, hashSeed, mulberry32 } from './rng';
import { emaSeries, rsi } from './indicators';

// ───────────────────────────────────────────────────────────────────────────
// Vectorised-ish daily-bar backtester used by the genetic Hatchery and the
// Flash Backtest Sandbox. Deterministic: same genome + symbol → same result.
// ───────────────────────────────────────────────────────────────────────────

export interface BacktestStats {
  trades: number;
  wins: number;
  winRate: number; // 0..1
  profitFactor: number;
  maxDrawdown: number; // positive fraction
  expectancy: number;
  netReturn: number; // fraction
}

export function synthesizeDailyHistory(symbol: string, days = 750): Candle[] {
  const rand = mulberry32(hashSeed(symbol + ':daily3y'));
  const base = symbol.startsWith('CRYPTO') ? 40 + rand() * 400 : symbol.startsWith('NSE') ? 200 + rand() * 3000 : 1000 + rand() * 50000;
  const dailyVol = symbol.startsWith('CRYPTO') ? 0.035 : 0.012;
  const candles: Candle[] = [];
  let price = base;
  let drift = 0;
  let regime = 25;
  const dayMs = 86_400_000;
  let t = Date.now() - days * dayMs;

  for (let i = 0; i < days; i++) {
    if (--regime <= 0) {
      regime = 18 + Math.floor(rand() * 30);
      drift = (rand() - 0.48) * dailyVol * 0.5;
    }
    const o = price;
    const c = o * (1 + drift + gaussian(rand) * dailyVol);
    const h = Math.max(o, c) * (1 + Math.abs(gaussian(rand)) * dailyVol * 0.4);
    const l = Math.min(o, c) * (1 - Math.abs(gaussian(rand)) * dailyVol * 0.4);
    const v = Math.round(1e6 * (0.6 + rand() * 0.9));
    candles.push({ t, o, h, l, c, v });
    price = c;
    t += dayMs;
  }
  return candles;
}

export function defaultGenome(): StrategyGenome {
  return {
    id: 'gen-active',
    generation: 4,
    codename: 'Alpha-Falcon-SMC',
    donchianPeriod: 20,
    rsiOversold: 35,
    rsiOverbought: 65,
    fvgDepth: 2,
    supertrendMult: 3,
    emaFast: 20,
    emaSlow: 50,
  };
}

export function runBacktest(candles: Candle[], g: StrategyGenome): BacktestStats {
  const closes = candles.map((c) => c.c);
  const rsiArr = rsi(closes, 14);
  const emaFast = emaSeries(closes, g.emaFast);
  const emaSlow = emaSeries(closes, g.emaSlow);
  const riskPerTrade = 0.012;
  const trailMult = 2.5 * riskPerTrade;

  let position: 1 | -1 | 0 = 0;
  let entry = 0;
  let extreme = 0; // best price seen while in a trade (for trailing stop)
  let equity = 0;
  let peakEquity = 0;
  let maxDd = 0;
  const pnls: number[] = [];
  let grossWin = 0;
  let grossLoss = 0;
  let wins = 0;

  const close = (ret: number) => {
    const adj = Math.max(ret, -riskPerTrade * 1.5);
    pnls.push(adj);
    equity += adj;
    peakEquity = Math.max(peakEquity, equity);
    maxDd = Math.max(maxDd, peakEquity - equity);
    if (adj > 0) {
      wins++;
      grossWin += adj;
    } else grossLoss += Math.abs(adj);
  };

  for (let i = Math.max(g.donchianPeriod, g.emaSlow) + 1; i < candles.length; i++) {
    const window = candles.slice(i - g.donchianPeriod, i);
    const upper = Math.max(...window.map((c) => c.h));
    const lower = Math.min(...window.map((c) => c.l));
    const c = candles[i];
    const r = rsiArr[i] ?? 50;
    const trendUp = emaFast[i] > emaSlow[i];
    const trendDn = emaFast[i] < emaSlow[i];
    // FVG-style imbalance validation (depth = fvgDepth candles)
    const fvgBull = c.l > candles[i - g.fvgDepth].h;
    const fvgBear = c.h < candles[i - g.fvgDepth].l;

    if (position === 0) {
      if (c.c > upper && r > g.rsiOversold && r < g.rsiOverbought + 12 && trendUp && (fvgBull || r > 52)) {
        position = 1;
        entry = c.c;
        extreme = c.h;
      } else if (c.c < lower && r < g.rsiOverbought && r > g.rsiOversold - 12 && trendDn && (fvgBear || r < 48)) {
        position = -1;
        entry = c.c;
        extreme = c.l;
      }
    } else {
      extreme = position === 1 ? Math.max(extreme, c.h) : Math.min(extreme, c.l);
      const hardStop = position === 1 ? c.l <= entry * (1 - riskPerTrade) : c.h >= entry * (1 + riskPerTrade);
      const trail = position === 1 ? c.l <= extreme * (1 - trailMult) : c.h >= extreme * (1 + trailMult);
      const reverse = position === 1 ? c.c < emaSlow[i] : c.c > emaSlow[i];
      if (hardStop || trail || reverse) {
        const ret = position === 1 ? (c.c - entry) / entry : (entry - c.c) / entry;
        close(ret);
        position = 0;
      }
    }
  }

  const trades = pnls.length;
  const netReturn = pnls.reduce((a, b) => a + b, 0);
  return {
    trades,
    wins,
    winRate: trades ? wins / trades : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 3 : 0) : grossWin / grossLoss,
    maxDrawdown: maxDd,
    expectancy: trades ? netReturn / trades : 0,
    netReturn,
  };
}

/** Composite fitness used by the genetic loop — rewards PF & win-rate,
 *  penalises drawdown beyond the 2% daily risk philosophy. */
export function fitnessOf(stats: BacktestStats): number {
  if (stats.trades < 8) return 0;
  const pfScore = Math.min(1, stats.profitFactor / 2.2);
  const wrScore = stats.winRate;
  const ddPenalty = Math.max(0, 1 - stats.maxDrawdown / 0.25);
  return Math.min(1, pfScore * 0.45 + wrScore * 0.35 + ddPenalty * 0.2);
}
