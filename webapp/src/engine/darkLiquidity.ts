import type { DarkPoolZone } from './types';
import { clamp, mulberry32, uid } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Whale & Dark Liquidity Tracker.
// Models iceberg fragmentation and dark-pool resting interest. Rendered on the
// 3D chart as a purple nebula glow (never as raw order rows).
// ───────────────────────────────────────────────────────────────────────────

export class DarkLiquidityTracker {
  zones: DarkPoolZone[] = [];
  private counter = 0;

  /** Inspect book depth for iceberg fragmentation clusters. */
  observe(bookBids: { price: number; qty: number; iceberg?: boolean }[],
          bookAsks: { price: number; qty: number; iceberg?: boolean }[],
          price: number, t: number): DarkPoolZone | null {
    const bidIce = bookBids.filter((l) => l.iceberg);
    const askIce = bookAsks.filter((l) => l.iceberg);
    const candidates = bidIce.length >= askIce.length ? bidIce : askIce;
    if (!candidates.length) return null;
    this.counter++;
    if (this.counter % 3 !== 0) return null; // throttle nebula spawns
    const target = candidates[0];
    const rand = mulberry32(Math.floor(t / 4000) + Math.floor(target.price));
    const zone: DarkPoolZone = {
      id: uid('dark'),
      price: target.price,
      intensity: clamp(0.35 + rand() * 0.6 + (bidIce.length >= askIce.length ? 0.1 : 0), 0, 1),
      side: bidIce.length >= askIce.length ? 'BUY' : 'SELL',
      t,
    };
    this.zones.push(zone);
    if (this.zones.length > 10) this.zones.shift();
    return zone;
  }

  /** Whale-driven breakout detection per spec §10 trigger set. */
  detectWhaleTrigger(input: {
    volume: number;
    avgVolume20: number;
    donchianExpanding: boolean;
    pcrShift: number;
    oiChangePct: number;
    brokePoc: boolean;
  }): { triggered: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (input.volume > input.avgVolume20 * 3) reasons.push('Institutional volume >300% of 20-candle average');
    if (input.brokePoc) reasons.push('Iceberg fragmentation broke Volume Profile POC');
    if (input.donchianExpanding && (Math.abs(input.pcrShift) > 0.18 || Math.abs(input.oiChangePct) > 6)) {
      reasons.push('Donchian expansion + PCR/OI regime shift');
    }
    return { triggered: reasons.length >= 2, reasons };
  }
}
