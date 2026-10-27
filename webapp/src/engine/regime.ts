import type { Regime } from './types';
import type { HiddenIndicatorSnapshot } from './indicators';

// ───────────────────────────────────────────────────────────────────────────
// Adaptive Option Regime Switcher + Whale-Breakout Escape Engine (spec §10).
// Sideways → delta-neutral theta harvesting; whale trigger → instant fire-sale
// of option shorts and flip to leveraged trend-following.
// ───────────────────────────────────────────────────────────────────────────

export interface RegimeEvent {
  at: number;
  from: Regime;
  to: Regime;
  reasons: string[];
}

export class RegimeSwitcher {
  regime: Regime = 'trend';
  optionSelling = false;
  history: RegimeEvent[] = [];
  private sidewaysVotes = 0;

  evaluate(
    ind: HiddenIndicatorSnapshot,
    whale: { triggered: boolean; reasons: string[] },
    t: number,
  ): RegimeEvent | null {
    const neutralSt = Math.abs(ind.trendAlignment) < 0.25;
    const evenVolume = ind.donchian.flat;
    const sideways = evenVolume && neutralSt;

    let next: Regime = this.regime;
    if (whale.triggered) next = 'whale-breakout';
    else if (sideways) {
      this.sidewaysVotes++;
      if (this.sidewaysVotes >= 2) next = 'sideways';
    } else {
      this.sidewaysVotes = 0;
      next = 'trend';
    }

    if (next === this.regime) return null;
    const event: RegimeEvent = { at: t, from: this.regime, to: next, reasons: whale.reasons };
    this.history.unshift(event);
    this.history = this.history.slice(0, 10);
    this.regime = next;
    this.optionSelling = next === 'sideways';
    return event;
  }

  /** Post-breakout decay back to ordinary trend mode. */
  decay(t: number): void {
    if (this.regime === 'whale-breakout' && this.history[0] && t - this.history[0].at > 12_000) {
      this.regime = 'trend';
    }
  }
}
