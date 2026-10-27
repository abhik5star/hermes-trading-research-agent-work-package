// ───────────────────────────────────────────────────────────────────────────
// Psychological Zen Guard — monitors interaction telemetry (erratic mouse,
// post-loss tab thrashing, consecutive losses) and enforces a revenge-trading
// lockout with a calming Midnight Blue / Lavender theme shift.
// ───────────────────────────────────────────────────────────────────────────

export interface ZenState {
  active: boolean;
  reason: string;
  erraticScore: number; // 0..1
  tabSwitches: number;
  consecutiveLosses: number;
  until: number;
}

const WINDOW_MS = 45_000;

export class ZenGuard {
  state: ZenState = {
    active: false,
    reason: '',
    erraticScore: 0,
    tabSwitches: 0,
    consecutiveLosses: 0,
    until: 0,
  };

  private moves: { x: number; y: number; t: number }[] = [];
  private switches: number[] = [];

  recordMouse(x: number, y: number): void {
    const now = Date.now();
    this.moves.push({ x, y, t: now });
    this.moves = this.moves.filter((m) => now - m.t < WINDOW_MS);
    if (this.moves.length < 8) return;
    // Erratic = high directional reversal frequency + acceleration spikes
    let reversals = 0;
    let accel = 0;
    for (let i = 2; i < this.moves.length; i++) {
      const a = this.moves[i - 2];
      const b = this.moves[i - 1];
      const c = this.moves[i];
      const v1x = b.x - a.x;
      const v2x = c.x - b.x;
      if (v1x * v2x < 0) reversals++;
      accel += Math.abs((c.x - b.x) - (b.x - a.x));
    }
    const reversalRate = reversals / this.moves.length;
    const speed = this.moves.reduce((acc, m, i) => {
      if (i === 0) return acc;
      const prev = this.moves[i - 1];
      const dt = Math.max(1, m.t - prev.t);
      return acc + Math.hypot(m.x - prev.x, m.y - prev.y) / dt;
    }, 0) / this.moves.length;
    this.state.erraticScore = Math.min(1, reversalRate * 1.6 + Math.min(0.4, speed / 900) + accel / 4000);
    this.evaluate();
  }

  recordTabSwitch(): void {
    const now = Date.now();
    this.switches = this.switches.filter((t) => now - t < WINDOW_MS);
    this.switches.push(now);
    this.state.tabSwitches = this.switches.length;
    this.evaluate();
  }

  reportTrade(outcome: 'win' | 'loss' | 'scratch'): void {
    if (outcome === 'loss') this.state.consecutiveLosses++;
    if (outcome === 'win') this.state.consecutiveLosses = 0;
    this.evaluate();
  }

  private evaluate(): void {
    const lossTrigger = this.state.consecutiveLosses >= 3;
    const panicTrigger = this.state.erraticScore > 0.62 && this.state.tabSwitches >= 3;
    if (!this.state.active && (lossTrigger || panicTrigger)) {
      this.state.active = true;
      this.state.until = Date.now() + 90_000;
      this.state.reason = lossTrigger
        ? `${this.state.consecutiveLosses} consecutive losses detected — revenge-trading lockout engaged`
        : 'Erratic interaction + tab thrashing detected — emotional over-trading lockout engaged';
    }
  }

  /** Operations the UI must grey out while Zen Guard is active. */
  isLocked(): boolean {
    if (this.state.active && Date.now() > this.state.until) this.release();
    return this.state.active;
  }

  release(): void {
    this.state.active = false;
    this.state.reason = '';
    this.state.consecutiveLosses = 0;
    this.state.erraticScore = 0;
  }
}
