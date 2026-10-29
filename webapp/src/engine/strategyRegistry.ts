import type { FlashReport, StrategyGenome } from './types';
import { uid } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Strategy Registry — the single place where the best strategies live.
//
// Strategies arrive here from two provenances:
//   • 'autopsy-learning' — a post-mortem produced a rule change, the change
//     was backtested against the baseline and actually won.
//   • 'hatchery'          — the genetic AutoML lab promoted a genome.
//
// A green "validated" verdict is only ever attached to an entry whose metrics
// came from a real cross-validation run. Nothing else may claim to be proven.
// ───────────────────────────────────────────────────────────────────────────

export type RegistrySource = 'autopsy-learning' | 'hatchery' | 'manual';
export type RegistryVerdict = 'validated' | 'untested' | 'rejected';

export interface RegistryMetrics {
  /** Cross-validated fitness (best-two-of-three mean), 0..1 */
  cvFitness: number;
  /** Worst-symbol fitness — the curve-fit guard */
  cvWorst: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  trades: number;
  maxDrawdown: number;
}

/** One concrete parameter change that separated this strategy from the baseline. */
export interface GenomeChange {
  param: string;
  from: number;
  to: number;
}

export interface RegistryEntry {
  id: string;
  genome: StrategyGenome;
  codename: string;
  source: RegistrySource;
  /** Why this strategy exists — the mistake it fixed or the lab that bred it */
  origin: string;
  /** The concrete parameter changes this strategy made to the baseline */
  changes: GenomeChange[];
  metrics: RegistryMetrics;
  verdict: RegistryVerdict;
  /** The Flash Backtest query that validated (or rejected) it */
  testQuery?: string;
  /** The actual report — only present when a real test ran */
  report?: FlashReport;
  postMortemId?: string;
  createdAt: number;
}

export class StrategyRegistry {
  entries: RegistryEntry[] = [];
  activeId: string | null = null;

  /** Add or replace an entry (same genome id → replaced, keeping history). */
  register(entry: Omit<RegistryEntry, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): RegistryEntry {
    const id = entry.id ?? uid('reg');
    const existingIdx = this.entries.findIndex((e) => e.id === id || e.genome.id === entry.genome.id);
    const full: RegistryEntry = {
      ...entry,
      id,
      createdAt: entry.createdAt ?? Date.now(),
    };
    if (existingIdx >= 0) {
      const prev = this.entries[existingIdx];
      full.createdAt = prev.createdAt;
      this.entries[existingIdx] = full;
    } else {
      this.entries.unshift(full);
    }
    if (this.entries.length > 24) this.entries.length = 24;
    return full;
  }

  /** Ranked list — validated strategies first, then by score. */
  list(): RegistryEntry[] {
    const rank = (e: RegistryEntry) => (e.verdict === 'validated' ? 1 : 0);
    return [...this.entries].sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(b) - rank(a);
      return b.metrics.cvFitness - a.metrics.cvFitness;
    });
  }

  /** The best strategy that actually passed validation. */
  best(): RegistryEntry | undefined {
    return this.list().find((e) => e.verdict === 'validated');
  }

  get(id: string): RegistryEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  activeEntry(): RegistryEntry | undefined {
    return this.activeId ? this.get(this.activeId) : undefined;
  }

  setActive(id: string | null): RegistryEntry | undefined {
    this.activeId = id;
    return id ? this.get(id) : undefined;
  }
}
