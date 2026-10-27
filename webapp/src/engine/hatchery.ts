import type { StrategyGenome, StrategyPod } from './types';
import { defaultGenome, fitnessOf, runBacktest, synthesizeDailyHistory } from './backtest';
import { clamp, mulberry32, uid } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Autonomous AutoML Strategy Scientist — background genetic-algorithm loop
// that mutates SMC/ICT × momentum condition matrices without human input.
// ───────────────────────────────────────────────────────────────────────────

const CODENAMES = [
  'Alpha-Falcon', 'Neural-Kestrel', 'Shadow-Osprey', 'Quant-Harrier',
  'Cyber-Merlin', 'Void-Peregrine', 'Plasma-Nighthawk', 'Ion-Talon',
];

const HISTORY_CACHE = new Map<string, ReturnType<typeof synthesizeDailyHistory>>();

function historyFor(symbol: string) {
  if (!HISTORY_CACHE.has(symbol)) HISTORY_CACHE.set(symbol, synthesizeDailyHistory(symbol));
  return HISTORY_CACHE.get(symbol)!;
}

export class StrategyHatchery {
  pods: StrategyPod[] = [];
  active: StrategyGenome = defaultGenome();
  activeFitness = 0;
  generation = 4;
  private cycle = 0;

  constructor() {
    // Seed the lab with the active genome + two alpha-stage offspring
    const activeStats = this.evaluate(this.active, '^NSEI');
    this.activeFitness = fitnessOf(activeStats);
    this.pods.push(this.toPod(this.active, 'Active in Execution Engine', activeStats, true));
    this.pods.push(this.toPod(this.mutate(this.active, 1), 'Evolving Parameters…'));
    this.pods.push(this.toPod(this.mutate(this.active, 2), 'Cross-Validating…'));
  }

  private toPod(genome: StrategyGenome, status: StrategyPod['status'], stats?: ReturnType<typeof runBacktest>, promoted = false): StrategyPod {
    const s = stats ?? this.evaluate(genome, '^NSEI');
    return {
      genome,
      status,
      winRate: s.winRate,
      profitFactor: s.profitFactor,
      fitness: fitnessOf(s),
      trades: s.trades,
      maxDrawdown: s.maxDrawdown,
      promoted,
      terminated: false,
      bornAt: Date.now(),
    };
  }

  private evaluate(genome: StrategyGenome, symbol: string) {
    return runBacktest(historyFor(symbol), genome);
  }

  private mutate(parent: StrategyGenome, salt: number): StrategyGenome {
    const rand = mulberry32(hash(parent.id) + this.cycle * 31 + salt * 17);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
    const g: StrategyGenome = {
      ...parent,
      id: uid('gen'),
      generation: this.generation,
      codename: `${pick(CODENAMES)}-SMC`,
      donchianPeriod: clamp(parent.donchianPeriod + Math.round((rand() - 0.5) * 10), 10, 40),
      rsiOversold: clamp(parent.rsiOversold + Math.round((rand() - 0.5) * 10), 22, 45),
      rsiOverbought: clamp(parent.rsiOverbought + Math.round((rand() - 0.5) * 10), 55, 82),
      fvgDepth: clamp(parent.fvgDepth + (rand() > 0.6 ? 1 : 0), 1, 4),
      supertrendMult: clamp(parent.supertrendMult + (rand() - 0.5) * 1.2, 1.8, 4.5),
      emaFast: clamp(parent.emaFast + Math.round((rand() - 0.5) * 6), 9, 34),
      emaSlow: clamp(parent.emaSlow + Math.round((rand() - 0.5) * 12), 40, 200),
    };
    if (g.emaSlow <= g.emaFast + 8) g.emaSlow = g.emaFast + 10;
    return g;
  }

  /** One GA generation tick. Returns a promotion event when one occurs. */
  evolve(): { promoted?: StrategyPod; terminated?: StrategyPod } {
    this.cycle++;
    const evolving = this.pods.find((p) => !p.promoted && !p.terminated && p.status.startsWith('Evolving'));
    const validating = this.pods.find((p) => !p.promoted && !p.terminated && p.status.startsWith('Cross'));

    if (validating) this.judge(validating);
    if (evolving) {
      evolving.status = 'Cross-Validating…';
      const child = this.mutate(evolving.genome, 3);
      this.pods.push(this.toPod(child, 'Evolving Parameters…'));
    }
    // Keep the lab tidy
    if (this.pods.length > 6) {
      const idx = this.pods.findIndex((p) => p.terminated);
      if (idx >= 0) this.pods.splice(idx, 1);
    }
    const promoted = this.pods.find((p) => p.status.startsWith('Highly Profitable'));
    return promoted ? { promoted } : {};
  }

  private judge(pod: StrategyPod): void {
    // Strict cross-validation across three uncorrelated instruments.
    // Promotion uses the best-two-of-three mean (market adaptation) while a
    // hard floor on the worst symbol guards against curve-fit mutations.
    const symbols = ['^NSEI', 'BTCUSDT_PERP', 'RELIANCE.NS'];
    const scores = symbols.map((s) => fitnessOf(this.evaluate(pod.genome, s)));
    const sorted = [...scores].sort((a, b) => b - a);
    const cv = (sorted[0] + sorted[1]) / 2;
    const worst = Math.min(...scores);
    pod.fitness = cv;
    const ref = this.evaluate(pod.genome, '^NSEI');
    pod.winRate = ref.winRate;
    pod.profitFactor = ref.profitFactor;
    pod.trades = ref.trades;
    pod.maxDrawdown = ref.maxDrawdown;

    if (cv > this.activeFitness + 0.02 && worst > 0.35 && pod.maxDrawdown < 0.25) {
      pod.status = 'Highly Profitable — Promoting to Active';
      pod.promoted = true;
      this.generation++;
      this.active = { ...pod.genome, generation: this.generation };
      this.activeFitness = cv;
      // Holographic merge: replace the active engine capsule
      const oldActive = this.pods.find((p) => p.promoted && p.status === 'Active in Execution Engine');
      if (oldActive) {
        oldActive.status = 'Failed Risk Test — Terminated & Discarded';
        oldActive.terminated = true;
        oldActive.promoted = false;
      }
      const newActive = this.toPod(this.active, 'Active in Execution Engine', undefined, true);
      this.pods.unshift(newActive);
    } else {
      pod.status = 'Failed Risk Test — Terminated & Discarded';
      pod.terminated = true;
    }
  }
}

function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761);
  return h >>> 0;
}
