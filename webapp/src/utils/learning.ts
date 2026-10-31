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
/**
 * The distinctive phrase that proves a proposal was really tested.
 *
 * The bare keyword is far too loose ("ema" matches almost every query), so
 * the phrase carries the concrete parameter values of the proposed change.
 */
export function proposalTestPhrase(proposal: Proposal): string {
  switch (proposal.testKeyword) {
    case 'donchian':
      return 'Donchian period 24';
    case 'fvg':
      return 'FVG depth 3';
    case 'supertrend':
      return 'Supertrend multiplier 2.5';
    case 'ema':
      return '21 EMA instead of 20 EMA';
    default:
      return proposal.testKeyword;
  }
}

/**
 * The report that actually tested `phrase` — exact phrase match, and the
 * backend's automatic cadence checks are excluded so they can never be
 * mistaken for the proof of a specific rule change.
 */
export function testStatus(phrase: string, reports: FlashReport[]): FlashReport | undefined {
  const needle = phrase.trim().toLowerCase();
  if (!needle) return undefined;
  return reports.find((r) => !r.auto && r.query.toLowerCase().includes(needle));
}

/**
 * Turns the proposed rule changes into an actual genome mutation.
 *
 * This is the "modify" half of the learning loop: the post-mortem proposes a
 * rule, and the rule becomes concrete strategy parameters that can be
 * backtested against the baseline.
 */
export function proposeGenome(baseline: StrategyGenome, proposals: Proposal[]): StrategyGenome {
  const g: StrategyGenome = { ...baseline, id: `gen-learn-${baseline.id}-${proposals.length}` };
  for (const p of proposals) {
    switch (p.testKeyword) {
      case 'donchian':
        // Tighter breakout + stricter oversold filter → fewer false breakouts.
        g.donchianPeriod = clampInt(g.donchianPeriod + 4, 10, 40);
        g.rsiOversold = clampInt(g.rsiOversold - 2, 22, 45);
        break;
      case 'fvg':
        // Wait one more structural candle before entering the imbalance.
        g.fvgDepth = clampInt(g.fvgDepth + 1, 1, 4);
        break;
      case 'supertrend':
        // Wider ATR trail for option shorts.
        g.supertrendMult = clampNumber(g.supertrendMult + 0.5, 1.8, 4.5);
        break;
      case 'ema':
        // Slightly faster EMA + slower trend filter → cleaner R:R floor.
        g.emaFast = clampInt(g.emaFast + 1, 9, 34);
        g.emaSlow = clampInt(g.emaSlow + 6, 40, 200);
        break;
      default:
        break;
    }
  }
  if (g.emaSlow <= g.emaFast + 8) g.emaSlow = g.emaFast + 10;
  return g;
}

/** One concrete parameter change worth backtesting. */
export interface GenomeCandidate {
  genome: StrategyGenome;
  /** Human readable description of the change, e.g. "Donchian 20 → 24". */
  label: string;
  proposal: Proposal;
}

/**
 * Candidate mutations for a post-mortem.
 *
 * A post-mortem says *what* went wrong; the engine still has to find *how* to
 * fix it. Every candidate here is a single, deterministic parameter change
 * inside the rule family the proposal belongs to, and every one of them is
 * backtested for real before anything is called an improvement.
 */
const FAMILY_DELTAS: Record<string, Array<{ param: keyof StrategyGenome; deltas: number[]; label: (g: StrategyGenome, v: number) => string }>> = {
  donchian: [
    { param: 'donchianPeriod', deltas: [2, 4, 6, 8], label: (g, v) => `Donchian ${g.donchianPeriod} → ${v}` },
    { param: 'rsiOversold', deltas: [2, 4, 6, 8], label: (g, v) => `RSI oversold ${g.rsiOversold} → ${v}` },
  ],
  fvg: [
    { param: 'fvgDepth', deltas: [1, 2], label: (g, v) => `FVG depth ${g.fvgDepth} → ${v}` },
  ],
  supertrend: [
    { param: 'supertrendMult', deltas: [0.3, 0.5, 0.8], label: (g, v) => `Supertrend mult ${g.supertrendMult} → ${v}` },
  ],
  ema: [
    { param: 'emaFast', deltas: [1, 2, 4, 6], label: (g, v) => `EMA fast ${g.emaFast} → ${v}` },
    { param: 'emaSlow', deltas: [4, 8, 12], label: (g, v) => `EMA slow ${g.emaSlow} → ${v}` },
  ],
};

const PARAM_BOUNDS: Record<string, [number, number]> = {
  donchianPeriod: [10, 40],
  rsiOversold: [22, 45],
  rsiOverbought: [55, 82],
  fvgDepth: [1, 4],
  supertrendMult: [1.8, 4.5],
  emaFast: [9, 34],
  emaSlow: [40, 200],
};

/** Build every deterministic candidate mutation for the given proposals. */
export function proposeCandidates(baseline: StrategyGenome, proposals: Proposal[]): GenomeCandidate[] {
  const out: GenomeCandidate[] = [];
  const seen = new Set<string>();

  for (const proposal of proposals) {
    const families = FAMILY_DELTAS[proposal.testKeyword] ?? [];
    for (const family of families) {
      for (const delta of family.deltas) {
        const current = Number(baseline[family.param]);
        const next = family.param === 'supertrendMult'
          ? clampNumber(current + delta, PARAM_BOUNDS[family.param][0], PARAM_BOUNDS[family.param][1])
          : clampInt(current + delta, PARAM_BOUNDS[family.param][0], PARAM_BOUNDS[family.param][1]);
        if (next === current) continue;
        const key = `${proposal.testKeyword}:${family.param}:${next}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const genome: StrategyGenome = { ...baseline, id: `gen-learn-${baseline.id}-${key}` };
        genome[family.param] = next as never;
        if (genome.emaSlow <= genome.emaFast + 8) genome.emaSlow = genome.emaFast + 10;
        out.push({ genome, label: family.label(baseline, next), proposal });
      }
    }
  }
  return out;
}

/**
 * A Flash Backtest query that mentions every proposal keyword, so the
 * Learning Loop view can match the report back to each proposal.
 */
export function learningQueryForProposals(proposals: Proposal[], pm: PostMortem): string {
  const keywords = [...new Set(proposals.map((p) => p.testKeyword))];
  const parts: string[] = [];
  for (const k of keywords) {
    if (k === 'donchian') parts.push('Donchian period 24');
    else if (k === 'fvg') parts.push('FVG depth 3');
    else if (k === 'supertrend') parts.push('Supertrend multiplier 2.5');
    else if (k === 'ema') parts.push('21 EMA instead of 20 EMA');
  }
  if (!parts.length) parts.push('21 EMA instead of 20 EMA');
  const symbol = pm.asset.includes('BANKNIFTY') || pm.asset.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY';
  return `Test ${parts.join(' and ')} on ${symbol}`;
}

/**
 * A query that belongs to exactly ONE proposal.
 *
 * Each proposal gets its own report, so a test for the FVG rule can never be
 * mistaken for proof of the whale-volume rule — every keyword in the query
 * maps to the proposal that was actually validated.
 */
export function queryForProposal(proposal: Proposal, pm: PostMortem): string {
  const symbol = pm.asset.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY';
  switch (proposal.testKeyword) {
    case 'donchian':
      return `Test Donchian period 24 on ${symbol}`;
    case 'fvg':
      return `Test FVG depth 3 on ${symbol}`;
    case 'supertrend':
      return `Test Supertrend multiplier 2.5 for ${symbol}`;
    case 'ema':
      return `Test 21 EMA instead of 20 EMA on ${symbol}`;
    default:
      return `Test 21 EMA instead of 20 EMA on ${symbol}`;
  }
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(v)));
}

function clampNumber(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * A Flash Backtest query that mirrors the exact parameter change that was
 * validated, and always carries the proposal keyword so the Learning Loop can
 * match the report back to the right proposal (and only that one).
 */
export function queryForVariant(
  baseline: StrategyGenome,
  variant: StrategyGenome,
  proposal: Proposal,
  pm: PostMortem,
): string {
  const symbol = pm.asset.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY';
  const parts: string[] = [];
  if (variant.donchianPeriod !== baseline.donchianPeriod) parts.push(`Donchian period ${variant.donchianPeriod}`);
  if (variant.rsiOversold !== baseline.rsiOversold) parts.push(`RSI threshold ${variant.rsiOversold}`);
  if (variant.emaFast !== baseline.emaFast) parts.push(`${variant.emaFast} EMA instead of ${baseline.emaFast} EMA`);
  if (variant.emaSlow !== baseline.emaSlow) parts.push(`EMA slow ${variant.emaSlow}`);
  if (variant.supertrendMult !== baseline.supertrendMult) parts.push(`Supertrend multiplier ${variant.supertrendMult}`);
  if (variant.fvgDepth !== baseline.fvgDepth) parts.push(`FVG depth ${variant.fvgDepth}`);

  const joined = parts.join(' ').toLowerCase();
  if (!joined.includes(proposal.testKeyword)) {
    if (proposal.testKeyword === 'donchian') parts.push(`Donchian period ${variant.donchianPeriod}`);
    else if (proposal.testKeyword === 'fvg') parts.push(`FVG depth ${variant.fvgDepth}`);
    else if (proposal.testKeyword === 'supertrend') parts.push(`Supertrend multiplier ${variant.supertrendMult}`);
    else if (proposal.testKeyword === 'ema') parts.push(`${variant.emaFast} EMA instead of ${baseline.emaFast} EMA`);
  }
  if (!parts.length) parts.push(`${variant.emaFast} EMA instead of ${baseline.emaFast} EMA`);
  return `Test ${parts.join(' and ')} on ${symbol}`;
}
