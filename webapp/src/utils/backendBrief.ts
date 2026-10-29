import type { PostMortem, StrategyGenome, TradeRecord, FlashReport } from '../engine/types';
import { proposalsFor, testStatus } from './learning';
import type { BrainSnapshot } from '../engine/brain';

/**
 * Backend briefing derivation for the corner Miri assistant.
 *
 * Kept out of the component file so the module only exports components (that
 * keeps Vite's React Fast Refresh working on every edit).
 */

export interface Brief {
  lastTrade: TradeRecord | null;
  openPnl: number;
  report: FlashReport | undefined;
  genomeName: string;
  podStatus: string | null;
  postMortem: PostMortem | null;
  proposals: ReturnType<typeof proposalsFor>;
  validated: ReturnType<typeof testStatus>;
}

/** Derives the backend briefing from the live snapshot. */
export function deriveBrief(snapshot: BrainSnapshot | null): Brief | null {
  if (!snapshot) return null;
  const lastTrade = snapshot.recentTrades[0] ?? null;
  const openPnl = snapshot.positions.reduce((sum, p) => sum + (p.pnl ?? 0), 0);
  const report = snapshot.flashReports[0];
  const promoted = snapshot.pods.find((p) => p.promoted);
  const podStatus = promoted ? `${promoted.genome.codename} · ${promoted.status}` : null;
  const postMortem = snapshot.postMortems[0] ?? null;
  const proposals = postMortem ? proposalsFor(postMortem, snapshot.activeGenome) : [];
  // Only a real, matching Flash Backtest can flip a proposal to verified.
  const validated = proposals.length
    ? testStatus(proposals[0].testKeyword, snapshot.flashReports)
    : undefined;

  return {
    lastTrade,
    openPnl,
    report,
    genomeName: snapshot.activeGenome?.codename ?? 'Active genome',
    podStatus,
    postMortem,
    proposals,
    validated,
  };
}
