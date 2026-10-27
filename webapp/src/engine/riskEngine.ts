import type { Position } from './types';
import { chandelier } from './indicators';
import type { Candle } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Hard risk deck: fixed hard stop-loss, Chandelier dynamic trailing SL and the
// 2% max-daily-drawdown lockdown circuit breaker.
// ───────────────────────────────────────────────────────────────────────────

export const MAX_DAILY_DRAWDOWN = 0.02;

export interface RiskState {
  equity: number;
  startOfDayEquity: number;
  dailyPnl: number;
  dailyPnlPct: number;
  drawdownPct: number;
  locked: boolean;
  hardStopPct: number;
  totalSaved: number; // realised loss avoided by trailing stops (₹)
}

export class RiskEngine {
  state: RiskState = {
    equity: 1_000_000,
    startOfDayEquity: 1_000_000,
    dailyPnl: 0,
    dailyPnlPct: 0,
    drawdownPct: 0,
    locked: false,
    hardStopPct: 0.012,
    totalSaved: 0,
  };

  applyPnl(pnl: number): void {
    this.state.equity += pnl;
    this.state.dailyPnl = this.state.equity - this.state.startOfDayEquity;
    this.state.dailyPnlPct = this.state.dailyPnl / this.state.startOfDayEquity;
    this.state.drawdownPct = Math.min(0, this.state.dailyPnlPct);
    if (this.state.drawdownPct <= -MAX_DAILY_DRAWDOWN) this.state.locked = true;
  }

  /** Trails every open position with dynamic Chandelier Exit logic. */
  trail(positions: Position[], candles: Candle[]): Position[] {
    const ch = chandelier(candles);
    return positions.map((p) => {
      if (p.side !== 'BUY') return p;
      const nextTrail = Math.max(p.chandelier, ch.longStop);
      if (nextTrail > p.chandelier) this.state.totalSaved += Math.round((nextTrail - p.chandelier) * p.qty);
      return { ...p, chandelier: nextTrail, stop: Math.max(p.stop, nextTrail) };
    });
  }

  /** Hard stop breach test. */
  shouldStop(p: Position): boolean {
    if (p.side === 'BUY') return p.current <= p.stop;
    return p.current >= p.stop;
  }

  resetDay(): void {
    this.state.startOfDayEquity = this.state.equity;
    this.state.dailyPnl = 0;
    this.state.dailyPnlPct = 0;
    this.state.drawdownPct = 0;
    this.state.locked = false;
  }

  unlock(): void {
    // Zen Guard cooldown / manual override path
    this.state.locked = false;
  }
}
