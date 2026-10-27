import type { Candle, LiquiditySweep, StructuralZone, ZoneKind } from './types';
import { clamp, uid } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Smart Money Concepts / ICT structural engine.
// Detects: BOS, CHoCH, MSS, institutional liquidity sweeps, Fair Value Gaps,
// Order Blocks and Premium/Discount dealing-range geometry.
// ───────────────────────────────────────────────────────────────────────────

interface Pivot {
  t: number;
  price: number;
  kind: 'high' | 'low';
}

export interface SmcSnapshot {
  zones: StructuralZone[];
  sweeps: LiquiditySweep[];
  pivots: Pivot[];
  bias: 'bullish' | 'bearish' | 'ranging';
  equilibrium: number;
  inPremium: boolean;
  inDiscount: boolean;
  dealingHigh: number;
  dealingLow: number;
  lastEvent: string;
}

const MAX_ZONES = 14;

export class SmcEngine {
  private zones: StructuralZone[] = [];
  private sweeps: LiquiditySweep[] = [];
  private pivots: Pivot[] = [];
  private structureTrend: 1 | -1 = 1;
  private lastEvent = 'Scanning market structure…';
  private prevClose = 0;

  update(candles: Candle[]): SmcSnapshot {
    if (candles.length < 30) return this.snapshot(candles);
    const close = candles.at(-1)!.c;
    this.detectPivots(candles);
    this.detectBreaks(candles);
    this.detectFvg(candles);
    this.detectOrderBlocks(candles);
    this.detectSweeps(candles);
    this.updateMitigation(close);

    const recent = candles.slice(-60);
    const dealingHigh = Math.max(...recent.map((c) => c.h));
    const dealingLow = Math.min(...recent.map((c) => c.l));
    const equilibrium = (dealingHigh + dealingLow) / 2;
    const range = dealingHigh - dealingLow || 1;
    const inPremium = close > equilibrium + range * 0.15;
    const inDiscount = close < equilibrium - range * 0.15;

    this.prevClose = close;
    return this.snapshot(candles, { dealingHigh, dealingLow, equilibrium, inPremium, inDiscount });
  }

  private snapshot(
    candles: Candle[],
    extra?: Partial<SmcSnapshot>,
  ): SmcSnapshot {
    const recent = candles.slice(-60);
    const dealingHigh = extra?.dealingHigh ?? Math.max(...recent.map((c) => c.h));
    const dealingLow = extra?.dealingLow ?? Math.min(...recent.map((c) => c.l));
    return {
      zones: this.zones.slice(-MAX_ZONES),
      sweeps: this.sweeps.slice(-6),
      pivots: this.pivots.slice(-12),
      bias: this.structureTrend === 1 ? 'bullish' : 'bearish',
      equilibrium: extra?.equilibrium ?? (dealingHigh + dealingLow) / 2,
      inPremium: extra?.inPremium ?? false,
      inDiscount: extra?.inDiscount ?? false,
      dealingHigh,
      dealingLow,
      lastEvent: this.lastEvent,
    };
  }

  private detectPivots(candles: Candle[]): void {
    const found: Pivot[] = [];
    for (let i = 2; i < candles.length - 2; i++) {
      const c = candles[i];
      if (candles.slice(i - 2, i).every((x) => x.h < c.h) && candles.slice(i + 1, i + 3).every((x) => x.h < c.h)) {
        found.push({ t: c.t, price: c.h, kind: 'high' });
      }
      if (candles.slice(i - 2, i).every((x) => x.l > c.l) && candles.slice(i + 1, i + 3).every((x) => x.l > c.l)) {
        found.push({ t: c.t, price: c.l, kind: 'low' });
      }
    }
    this.pivots = found.slice(-12);
  }

  private pushZone(kind: ZoneKind, bias: StructuralZone['bias'], high: number, low: number, t: number, strength: number): void {
    if (this.zones.some((z) => z.kind === kind && Math.abs(z.priceHigh - high) / high < 0.0015)) return;
    this.zones.push({ id: uid('zone'), kind, bias, priceHigh: high, priceLow: low, t, strength: clamp(strength, 0.1, 1), mitigated: false });
    if (this.zones.length > 40) this.zones.shift();
  }

  private detectBreaks(candles: Candle[]): void {
    if (this.pivots.length < 4) return;
    const c = candles.at(-1)!;
    const prev = candles.at(-2)!;
    const avgVol = candles.slice(-20).reduce((a, x) => a + x.v, 0) / 20;
    const highPivot = [...this.pivots].reverse().find((p) => p.kind === 'high');
    const lowPivot = [...this.pivots].reverse().find((p) => p.kind === 'low');

    if (highPivot && prev.c <= highPivot.price && c.c > highPivot.price) {
      const displacement = c.v > avgVol * 1.4;
      if (this.structureTrend === -1) {
        this.pushZone('CHoCH', 'bullish', c.h, highPivot.price, c.t, 0.75);
        this.lastEvent = 'CHoCH bullish — downtrend character shifting';
        if (displacement) {
          this.pushZone('MSS', 'bullish', c.h, c.l, c.t, 0.9);
          this.lastEvent = 'MSS confirmed — displacement break of structure';
        }
        this.structureTrend = 1;
      } else {
        this.pushZone('BOS', 'bullish', c.h, highPivot.price, c.t, displacement ? 0.85 : 0.6);
        this.lastEvent = displacement ? 'BOS with institutional volume' : 'Break of Structure (buyside)';
      }
    }
    if (lowPivot && prev.c >= lowPivot.price && c.c < lowPivot.price) {
      const displacement = c.v > avgVol * 1.4;
      if (this.structureTrend === 1) {
        this.pushZone('CHoCH', 'bearish', lowPivot.price, c.l, c.t, 0.75);
        this.lastEvent = 'CHoCH bearish — uptrend character shifting';
        if (displacement) {
          this.pushZone('MSS', 'bearish', c.h, c.l, c.t, 0.9);
          this.lastEvent = 'MSS confirmed — bearish displacement';
        }
        this.structureTrend = -1;
      } else {
        this.pushZone('BOS', 'bearish', lowPivot.price, c.l, c.t, displacement ? 0.85 : 0.6);
        this.lastEvent = displacement ? 'BOS with institutional volume' : 'Break of Structure (sellside)';
      }
    }
  }

  private detectFvg(candles: Candle[]): void {
    const i = candles.length - 1;
    const a = candles[i - 2];
    const c = candles[i];
    if (!a || !c) return;
    if (c.l > a.h) {
      this.pushZone('FVG', 'bullish', c.l, a.h, c.t, 0.66);
      this.lastEvent = 'Bullish Fair Value Gap formed';
    } else if (c.h < a.l) {
      this.pushZone('FVG', 'bearish', a.l, c.h, c.t, 0.66);
      this.lastEvent = 'Bearish Fair Value Gap formed';
    }
  }

  private detectOrderBlocks(candles: Candle[]): void {
    const c = candles.at(-1)!;
    const ob = candles.at(-2);
    if (!ob) return;
    const avgRange = candles.slice(-20).reduce((a, x) => a + (x.h - x.l), 0) / 20;
    if (c.c > ob.h && ob.c < ob.o && c.h - c.l > avgRange * 1.2) {
      this.pushZone('order-block', 'bullish', ob.h, ob.l, ob.t, 0.8);
      this.lastEvent = 'Bullish institutional Order Block identified';
    } else if (c.c < ob.l && ob.c > ob.o && c.h - c.l > avgRange * 1.2) {
      this.pushZone('order-block', 'bearish', ob.h, ob.l, ob.t, 0.8);
      this.lastEvent = 'Bearish institutional Order Block identified';
    }
  }

  private detectSweeps(candles: Candle[]): void {
    const c = candles.at(-1)!;
    for (const p of this.pivots.slice(-6)) {
      if (p.kind === 'high' && c.h > p.price && c.c < p.price) {
        if (!this.sweeps.some((s) => s.side === 'buyside' && Math.abs(s.price - p.price) / p.price < 0.002)) {
          this.sweeps.push({
            id: uid('sweep'),
            side: 'buyside',
            price: p.price,
            t: c.t,
            intensity: clamp((c.h - p.price) / p.price * 400, 0.25, 1),
          });
          this.pushZone('buyside-liq', 'bearish', c.h, p.price, c.t, 0.82);
          this.lastEvent = 'Buyside liquidity sweep — retail stops raided';
        }
      }
      if (p.kind === 'low' && c.l < p.price && c.c > p.price) {
        if (!this.sweeps.some((s) => s.side === 'sellside' && Math.abs(s.price - p.price) / p.price < 0.002)) {
          this.sweeps.push({
            id: uid('sweep'),
            side: 'sellside',
            price: p.price,
            t: c.t,
            intensity: clamp((p.price - c.l) / p.price * 400, 0.25, 1),
          });
          this.pushZone('sellside-liq', 'bullish', p.price, c.l, c.t, 0.82);
          this.lastEvent = 'Sell-side liquidity sweep — reversal fuel collected';
        }
      }
    }
    if (this.sweeps.length > 8) this.sweeps.shift();
  }

  private updateMitigation(price: number): void {
    for (const z of this.zones) {
      if (!z.mitigated && price >= z.priceLow && price <= z.priceHigh) z.mitigated = true;
    }
    // Premium / discount geometry zones (refreshed each pass)
    this.zones = this.zones.filter((z) => z.kind !== 'premium' && z.kind !== 'discount');
  }

  /** Called by the brain with dealing-range geometry to tag premium/discount. */
  tagDealingRange(high: number, low: number, t: number): void {
    const eq = (high + low) / 2;
    this.pushZone('premium', 'bearish', high, eq, t, 0.4);
    this.pushZone('discount', 'bullish', eq, low, t, 0.4);
  }
}
