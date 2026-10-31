import type { PostMortem, TradeRecord, FlashReport } from '../engine/types';
import type { RegistryEntry } from '../engine/strategyRegistry';
import { proposalsFor, testStatus, proposalTestPhrase } from './learning';
import type { BrainSnapshot } from '../engine/brain';

/**
 * Backend briefing derivation for the corner Miri assistant.
 *
 * Kept out of the component file so the module only exports components (that
 * keeps Vite's React Fast Refresh working on every edit).
 */

export interface Brief {
  /** Best validated strategy from the registry (the auto-learning result). */
  bestStrategy: RegistryEntry | null;
  /** The registry entry paper trading is currently using. */
  activeStrategy: RegistryEntry | null;
  lastTrade: TradeRecord | null;
  openPnl: number;
  report: FlashReport | undefined;
  genomeName: string;
  podStatus: string | null;
  postMortem: PostMortem | null;
  proposals: ReturnType<typeof proposalsFor>;
  validated: ReturnType<typeof testStatus>;
  /** The registry entry that a real test validated for this post-mortem. */
  validatedFix: RegistryEntry | null;
  /** Backend activity counters straight from the engine. */
  backend: NonNullable<BrainSnapshot['backend']>;
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
  // Only a real, matching Flash Backtest can flip a proposal to verified —
  // and only the report that tested *that* rule counts.
  const validated = proposals.length
    ? testStatus(proposalTestPhrase(proposals[0]), snapshot.flashReports)
    : undefined;
  // The learning loop stores the report that actually proved the fix.
  const validatedFix =
    snapshot.registry.find((e) => e.postMortemId === postMortem?.id && e.verdict === 'validated') ?? null;

  const ranked = [...snapshot.registry].sort((a, b) => {
    const rank = (e: RegistryEntry) => (e.verdict === 'validated' ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(b) - rank(a);
    return b.metrics.cvFitness - a.metrics.cvFitness;
  });
  const bestStrategy = ranked.find((e) => e.verdict === 'validated') ?? null;
  const activeStrategy = snapshot.registry.find((e) => e.id === snapshot.registryActiveId) ?? null;

  return {
    bestStrategy,
    activeStrategy,
    lastTrade,
    openPnl,
    report,
    genomeName: snapshot.activeGenome?.codename ?? 'Active genome',
    podStatus,
    postMortem,
    proposals,
    validated,
    validatedFix,
    backend: snapshot.backend,
  };
}
