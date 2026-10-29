import { runBacktest, fitnessOf, synthesizeDailyHistory, type BacktestStats } from './backtest';
import type { PostMortem, StrategyGenome } from './types';
import {
  proposalsFor, proposeGenome, proposeCandidates, queryForProposal, queryForVariant,
  learningQueryForProposals,
  type Proposal, type GenomeCandidate,
} from '../utils/learning';
import { clamp } from './rng';
import type { GenomeChange } from './strategyRegistry';

// ───────────────────────────────────────────────────────────────────────────
// Auto-Learning — autopsy → rule change → validated strategy.
//
// When a trade goes wrong the post-mortem already records the mistake and the
// correction. This module closes the loop automatically:
//
//   1. read the post-mortem → concrete rule proposals
//   2. turn those proposals into an actual genome mutation
//   3. cross-validate the mutation against the baseline on three uncorrelated
//      instruments (same protocol the hatchery uses)
//   4. keep the mutation only if it genuinely beats the baseline
//
// Nothing here is decorative: the returned metrics are produced by a real
// backtest run, so a strategy may only be called "validated" when this
// function says it won.
// ───────────────────────────────────────────────────────────────────────────

export const CV_SYMBOLS = ['^NSEI', 'BTCUSDT_PERP', 'RELIANCE.NS'];

/** Margin a mutation must clear before it replaces the baseline. */
export const IMPROVEMENT_MARGIN = 0.005;
/** Floor on the worst instrument — guards against curve-fit mutations. */
export const WORST_SYMBOL_FLOOR = 0.35;
/** Max drawdown ceiling for a promotable strategy. */
export const MAX_DRAWDOWN_CEILING = 0.25;

export interface SymbolScore {
  symbol: string;
  fitness: number;
  stats: BacktestStats;
}

export interface LearningEvaluation {
  proposals: Proposal[];
  variant: StrategyGenome;
  /** The concrete parameter change that was validated, e.g. "Donchian 20 → 24" */
  variantLabel: string;
  baselineScores: SymbolScore[];
  variantScores: SymbolScore[];
  baselineFitness: number;
  variantFitness: number;
  baselineWorst: number;
  variantWorst: number;
  improved: boolean;
  reason: string;
  query: string;
}

const historyCache = new Map<string, ReturnType<typeof synthesizeDailyHistory>>();

function historyFor(symbol: string) {
  if (!historyCache.has(symbol)) historyCache.set(symbol, synthesizeDailyHistory(symbol));
  return historyCache.get(symbol)!;
}

function scoreOn(symbol: string, genome: StrategyGenome): SymbolScore {
  const stats = runBacktest(historyFor(symbol), genome);
  return { symbol, fitness: fitnessOf(stats), stats };
}

/** Best-two-of-three mean — the same promotion protocol as the hatchery. */
function cvFitness(scores: SymbolScore[]): number {
  const sorted = [...scores].map((s) => s.fitness).sort((a, b) => b - a);
  return (sorted[0] + sorted[1]) / 2;
}

/**
 * Evaluate a post-mortem's proposed modification against the current baseline.
 *
 * The post-mortem says what went wrong; the engine then *searches* the rule
 * families it points at, backtests every deterministic candidate for real and
 * keeps only the one that genuinely beats the baseline on cross-validation.
 */
export function evaluateLearning(
  pm: PostMortem,
  baseline: StrategyGenome,
  symbols: string[] = CV_SYMBOLS,
): LearningEvaluation {
  const proposals = proposalsFor(pm, baseline);
  const candidates = proposeCandidates(baseline, proposals);

  const baselineScores = symbols.map((s) => scoreOn(s, baseline));
  const baselineFitness = cvFitness(baselineScores);
  const baselineWorst = Math.min(...baselineScores.map((s) => s.fitness));

  let best: {
    candidate: GenomeCandidate;
    scores: SymbolScore[];
    fitness: number;
    worst: number;
    dd: number;
  } | null = null;

  for (const candidate of candidates) {
    const scores = symbols.map((s) => scoreOn(s, candidate.genome));
    const fitness = cvFitness(scores);
    const worst = Math.min(...scores.map((s) => s.fitness));
    const dd = Math.max(...scores.map((s) => s.stats.maxDrawdown));
    if (worst <= WORST_SYMBOL_FLOOR || dd >= MAX_DRAWDOWN_CEILING) continue;
    // Never accept a candidate that tanks the worst instrument.
    if (worst < baselineWorst - 0.03) continue;
    if (!best || fitness > best.fitness) best = { candidate, scores, fitness, worst, dd };
  }

  const fallback = proposeGenome(baseline, proposals);
  const fallbackScores = symbols.map((s) => scoreOn(s, fallback));
  const fallbackFitness = cvFitness(fallbackScores);
  const fallbackWorst = Math.min(...fallbackScores.map((s) => s.fitness));
  const fallbackDd = Math.max(...fallbackScores.map((s) => s.stats.maxDrawdown));

  const variant = best ? best.candidate.genome : fallback;
  const variantScores = best ? best.scores : fallbackScores;
  const variantFitness = best ? best.fitness : fallbackFitness;
  const variantWorst = best ? best.worst : fallbackWorst;
  const variantDd = best ? best.dd : fallbackDd;

  let improved = false;
  let reason: string;

  if (best && variantFitness > baselineFitness + IMPROVEMENT_MARGIN) {
    improved = true;
    reason = `${best.candidate.label} → CV fitness ${(variantFitness * 100).toFixed(1)}% vs baseline ${(baselineFitness * 100).toFixed(1)}% · worst symbol ${(variantWorst * 100).toFixed(1)}% · max DD ${(variantDd * 100).toFixed(1)}%`;
  } else if (best) {
    reason = `Rejected — best candidate (${best.candidate.label}) reached ${(variantFitness * 100).toFixed(1)}%, not enough over baseline ${(baselineFitness * 100).toFixed(1)}%`;
  } else if (variantDd >= MAX_DRAWDOWN_CEILING) {
    reason = `Rejected — max drawdown ${(variantDd * 100).toFixed(1)}% crossed the ${(MAX_DRAWDOWN_CEILING * 100).toFixed(0)}% ceiling`;
  } else {
    reason = `Rejected — no candidate cleared the ${(WORST_SYMBOL_FLOOR * 100).toFixed(0)}% worst-symbol floor`;
  }

  const query = best
    ? queryForVariant(baseline, best.candidate.genome, best.candidate.proposal, pm)
    : learningQueryForProposals(proposals, pm);

  return {
    proposals,
    variant,
    variantLabel: best?.candidate.label ?? 'Combined rule change',
    baselineScores,
    variantScores,
    baselineFitness,
    variantFitness,
    baselineWorst,
    variantWorst,
    improved,
    reason,
    query,
  };
}

/** Structured diff between a baseline genome and its mutation. */
export function diffGenomes(baseline: StrategyGenome, variant: StrategyGenome): GenomeChange[] {
  const params: Array<keyof StrategyGenome> = [
    'donchianPeriod', 'rsiOversold', 'rsiOverbought', 'fvgDepth',
    'supertrendMult', 'emaFast', 'emaSlow',
  ];
  const out: GenomeChange[] = [];
  for (const param of params) {
    const from = Number(baseline[param]);
    const to = Number(variant[param]);
    if (from !== to) out.push({ param, from, to });
  }
  return out;
}

/** Build a registry metric set from a learning evaluation. */
export function metricsFromEvaluation(evaluation: LearningEvaluation) {
  const ref = evaluation.variantScores[0]?.stats;
  return {
    cvFitness: clamp(evaluation.variantFitness, 0, 1),
    cvWorst: clamp(evaluation.variantWorst, 0, 1),
    winRate: ref?.winRate ?? 0,
    profitFactor: ref?.profitFactor ?? 0,
    expectancy: ref?.expectancy ?? 0,
    trades: ref?.trades ?? 0,
    maxDrawdown: ref?.maxDrawdown ?? 0,
  };
}
