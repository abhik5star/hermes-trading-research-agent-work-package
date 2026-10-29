import type { PostMortem, StrategyGenome, TradeRecord, FlashReport } from '../engine/types';

/** Natural-language hypothesis query for a (possibly mutated) genome. */
export function hypothesisQueryFor(g: StrategyGenome): string {
  return `Test Donchian period ${g.donchianPeriod + 4}, ${g.emaFast + 1} EMA instead of ${g.emaFast} EMA and RSI threshold ${Math.max(25, g.rsiOversold - 2)} on NIFTY`;
}

/**
 * Shared learning-loop derivations.
 *
 * Both the Trade Autopsy view and the corner Miri assistant read from here, so
 * "kya mistake hua aur kya modification hui" is never derived twice (and can
 * never disagree between the two surfaces).
 */

export interface Proposal {
  condition: string;
  baseline: string;
  proposed: string;
  testKeyword: string;
}

/**
 * Turns a post-mortem (mistake + correction) into concrete rule changes
 * against the baseline genome.
 */
export function proposalsFor(pm: PostMortem, baseline: StrategyGenome): Proposal[] {
  const text = `${pm.mistake} ${pm.correction}`.toLowerCase();
  const rows: Proposal[] = [];
  if (text.includes('premium')) {
    rows.push({
      condition: 'Long entry location gate',
      baseline: 'Donchian / Supertrend breakout hi kaafi tha',
      proposed: 'ICT Premium zone ke andar longs veto — discount ya CHoCH zaroori',
      testKeyword: 'donchian',
    });
  }
  if (text.includes('sweep') || text.includes('fvg') || text.includes('mitigat')) {
    rows.push({
      condition: 'Post-sweep entry timing',
      baseline: `FVG depth ${baseline.fvgDepth} candle, turant entry`,
      proposed: `Sweep ke baad 1 structural candle wait + FVG depth ${baseline.fvgDepth + 1}`,
      testKeyword: 'fvg',
    });
  }
  if (text.includes('gamma') || text.includes('oi change') || text.includes('hedge')) {
    rows.push({
      condition: 'Option-short risk rule',
      baseline: 'Koi hard OI hedge threshold nahi',
      proposed: 'OI change > 6% pe far-OTM hedge; expiry pe 2.2× ATR trail',
      testKeyword: 'supertrend',
    });
  }
  if (text.includes('whale') || text.includes('iceberg') || text.includes('volume')) {
    rows.push({
      condition: 'Whale volume veto',
      baseline: 'Volume pe koi gate nahi',
      proposed: '20-candle avg volume ka 300% cross pe instant square-off',
      testKeyword: 'donchian',
    });
  }
  rows.push({
    condition: 'Minimum expectancy gate',
    baseline: 'Explicit R:R floor nahi tha',
    proposed: '1:2 se kam nearest-liquidity expectancy wale setups reject',
    testKeyword: 'ema',
  });
  return rows;
}

/** Natural-language backtest query derived from a post-mortem. */
export function learningQueryFor(pm: PostMortem): string {
  const text = `${pm.mistake} ${pm.correction}`.toLowerCase();
  if (text.includes('sweep') || text.includes('fvg')) return 'Test FVG depth 3 and Donchian period 24 on NIFTY';
  if (text.includes('gamma') || text.includes('hedge')) return 'Test Supertrend multiplier 2.5 for BANKNIFTY';
  if (text.includes('whale') || text.includes('volume')) return 'Test Donchian period 30 for BANKNIFTY';
  return 'Test 21 EMA instead of 20 EMA';
}

/** Trades that belong to the same instrument as a post-mortem. */
export function relatedTrades(pm: PostMortem, trades: TradeRecord[]): TradeRecord[] {
  const token = pm.asset.split(' ')[0].toLowerCase().replace('usdt', '');
  return trades
    .filter((t) => {
      const sym = t.symbol.toLowerCase();
      return sym.includes(token) || (token.length >= 4 && sym.includes(token.slice(0, 4)));
    })
    .slice(0, 3);
}

/** A Flash Backtest report that covers a given proposal keyword, if any. */
export function testStatus(keyword: string, reports: FlashReport[]): FlashReport | undefined {
  return reports.find((r) => r.query.toLowerCase().includes(keyword));
}
