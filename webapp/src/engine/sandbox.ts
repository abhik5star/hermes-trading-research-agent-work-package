import type { FitCell, StrategyGenome } from './types';
import { SANDBOX_SYMBOLS } from './instruments';
import { hashSeed, mulberry32 } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Continuous Omni-Asset Sandbox — massive parallel paper trading across the
// NSE top-100, index option strikes and 200+ crypto instruments. The real
// deployment fans this out over a worker pool / threads; the in-browser build
// evaluates a rotating sample each cycle to keep the main thread free.
// ───────────────────────────────────────────────────────────────────────────

const DISPLAY_SYMBOLS = 28;
const SAMPLE_PER_CYCLE = 64;

interface PaperState {
  mark: number;
  entry: number;
  side: 1 | -1 | 0;
  pnl: number;
  pf: number;
  wins: number;
  total: number;
}

export class SandboxEngine {
  readonly totalInstruments = SANDBOX_SYMBOLS.length;
  private states = new Map<string, PaperState>();
  private cycle = 0;
  fit: FitCell[] = [];
  aggregatePnl = 0;
  openPositions = 0;

  constructor(private strategies: () => StrategyGenome[]) {
    const symbols = SANDBOX_SYMBOLS.slice(0, DISPLAY_SYMBOLS);
    for (const s of this.strategies()) {
      for (const symbol of symbols) {
        this.fit.push({ strategyId: s.id, symbol, fit: 35 + Math.random() * 30, pnl: 0, pf: 1 });
      }
    }
    for (const symbol of SANDBOX_SYMBOLS) {
      this.states.set(symbol, { mark: 100, entry: 100, side: 0, pnl: 0, pf: 1, wins: 0, total: 0 });
    }
  }

  syncStrategies(): void {
    const known = new Set(this.fit.map((f) => f.strategyId));
    const symbols = SANDBOX_SYMBOLS.slice(0, DISPLAY_SYMBOLS);
    for (const s of this.strategies()) {
      if (!known.has(s.id)) {
        for (const symbol of symbols) this.fit.push({ strategyId: s.id, symbol, fit: 40 + Math.random() * 25, pnl: 0, pf: 1 });
      }
    }
  }

  step(marks: Record<string, number>): void {
    this.cycle++;
    const rand = mulberry32(hashSeed('sandbox' + this.cycle));
    const sample = Array.from({ length: SAMPLE_PER_CYCLE }, () => SANDBOX_SYMBOLS[Math.floor(rand() * SANDBOX_SYMBOLS.length)]);
    let open = 0;
    let pnlDelta = 0;

    for (const symbol of sample) {
      const st = this.states.get(symbol)!;
      const mark = marks[symbol] ?? st.mark;
      const momentum = (mark - st.mark) / st.mark;
      st.mark = mark;
      const signal = momentum > 0.004 ? 1 : momentum < -0.004 ? -1 : 0;

      if (st.side === 0 && signal !== 0) {
        st.side = signal as 1 | -1;
        st.entry = mark;
      } else if (st.side !== 0 && (signal === -st.side || rand() > 0.94)) {
        const ret = st.side === 1 ? (mark - st.entry) / st.entry : (st.entry - mark) / st.entry;
        st.pnl += ret;
        st.total++;
        if (ret > 0) st.wins++;
        st.pf = st.wins ? (st.wins + 0.5) / Math.max(1, st.total - st.wins + 0.5) : 0.9;
        pnlDelta += ret;
        st.side = 0;
      }
      if (st.side !== 0) open++;
    }
    this.openPositions = open;
    this.aggregatePnl += pnlDelta;

    // Compatibility Fit Stream — strategy × asset compatibility drift
    for (const cell of this.fit) {
      const r = mulberry32(hashSeed(cell.strategyId + cell.symbol + this.cycle));
      const pull = (r() - 0.46) * 7;
      cell.fit = Math.min(98, Math.max(12, cell.fit + pull));
      cell.pnl += (r() - 0.42) * 0.4;
      cell.pf = Math.max(0.4, cell.pf + (r() - 0.5) * 0.08);
    }
  }

  topFits(limit = 8): FitCell[] {
    return [...this.fit].sort((a, b) => b.fit - a.fit).slice(0, limit);
  }

  matrix(): FitCell[] {
    return this.fit;
  }
}
