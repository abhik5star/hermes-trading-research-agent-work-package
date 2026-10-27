import type { PostMortem, TradeRecord } from './types';
import { uid } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// AI Brain Learning Log — structured "Mistake, Correction & New Probability"
// post-mortems. Seeded with real-feeling ICT/SMC lessons and extended live as
// autonomous paper trades close.
// ───────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;

export function seedPostMortems(): PostMortem[] {
  const now = Date.now();
  return [
    {
      id: uid('pm'),
      asset: 'NIFTY 21200 CE',
      action: 'BUY',
      outcome: 'Loss — Stopped Out at FVG Invalidated',
      mistake:
        'Entered long on a Supertrend breakout, but failed to realise the market was in a Premium ICT Zone and a massive Bearish Order Block was sitting immediately overhead.',
      correction:
        'Updated Neural Policy: AI will now strictly veto any Long entries if the market is inside an ICT Premium Zone, regardless of Donchian/Supertrend breakouts.',
      previousProbability: 79.2,
      newProbability: 83.7,
      delta: 4.5,
      at: now - 2 * DAY,
    },
    {
      id: uid('pm'),
      asset: 'BANKNIFTY 51000 PE',
      action: 'SELL',
      outcome: 'Win — Theta harvest closed at 82% target',
      mistake:
        'Short straddle remained naked through the expiry session; a sudden PCR flip was treated as noise instead of gamma expansion risk.',
      correction:
        'Gamma Blast Radar now hard-hedges ATM shorts when OI change exceeds 6% with accelerating gamma; Chandelier trail tightened to 2.2× ATR on expiry days.',
      previousProbability: 74.1,
      newProbability: 80.4,
      delta: 6.3,
      at: now - DAY,
    },
    {
      id: uid('pm'),
      asset: 'BTCUSDT Perpetual',
      action: 'BUY',
      outcome: 'Loss — Whale wick stopped trailing entry',
      mistake:
        'Treated a sell-side liquidity sweep as trend continuation; dark-pool iceberg absorption below the swing low was not weighted heavily enough.',
      correction:
        'Dark Liquidity Tracker now vetoes breakout longs when purple-nebula iceberg intensity > 0.7 sits inside 0.3% of the entry; Time Machine Path C probability gets +12% weighting.',
      previousProbability: 71.8,
      newProbability: 78.9,
      delta: 7.1,
      at: now - 3 * DAY,
    },
  ];
}

const MISTAKE_BANK: Record<string, { mistake: string; correction: string }> = {
  premium: {
    mistake: 'Momentum entry fired inside the ICT Premium dealing zone while a bearish Order Block capped overhead.',
    correction: 'Neural policy now requires discount-zone location (or CHoCH confirmation) before any long risk is opened.',
  },
  sweep: {
    mistake: 'Breakout signal chased a liquidity sweep instead of waiting for the post-sweep CHoCH retest.',
    correction: 'Entry gate now waits one structural candle after a sweep; FVG mitigation must confirm before order release.',
  },
  gamma: {
    mistake: 'Option-selling position carried into accelerating gamma near ATM without a hedge leg.',
    correction: 'Gamma Blast Radar auto-deploys a far-OTM protective leg whenever ATM OI change crosses +6%.',
  },
  whale: {
    mistake: 'Iceberg fragmentation at the Volume Profile POC was misread as normal two-way flow.',
    correction: 'Whale Escape Engine now fires instant square-off when volume exceeds 300% of the 20-candle average.',
  },
  generic: {
    mistake: 'Signal stack agreed but risk/reward at the dealing-range edge was below the 1:2 threshold.',
    correction: 'Execution layer rejects any setup whose nearest liquidity target yields less than 1:2 expectancy.',
  },
};

export function postMortemFromTrade(trade: TradeRecord, previousProbability: number): PostMortem {
  const key = trade.reason.includes('Premium')
    ? 'premium'
    : trade.reason.includes('sweep')
      ? 'sweep'
      : trade.reason.includes('gamma')
        ? 'gamma'
        : trade.reason.includes('Whale') || trade.reason.includes('whale')
          ? 'whale'
          : 'generic';
  const lesson = MISTAKE_BANK[key];
  // Losses teach bigger lessons; wins still refine probability upward slightly.
  const delta = trade.outcome === 'loss' ? 3.2 + Math.random() * 4.8 : 1.1 + Math.random() * 2.2;
  const newProbability = Math.min(94, previousProbability + delta);
  return {
    id: uid('pm'),
    asset: trade.symbol,
    action: trade.side,
    outcome: trade.outcome === 'win' ? `Win — ${trade.reason}` : `Loss — ${trade.reason}`,
    mistake: lesson.mistake,
    correction: lesson.correction,
    previousProbability,
    newProbability,
    delta,
    at: Date.now(),
  };
}
