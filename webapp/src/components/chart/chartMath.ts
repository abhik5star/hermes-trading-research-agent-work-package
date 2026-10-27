import type { Candle, FuturePath, StructuralZone, DarkPoolZone, ConfluenceCell, LiquiditySweep } from '../../engine/types';
import type { MonteCarloTree } from '../../engine/monteCarlo';

export const CHART_W = 17;
export const CHART_H = 6.4;
export const WINDOW = 96;

export interface ChartScale {
  minP: number;
  maxP: number;
  n: number;
  x: (i: number) => number;
  y: (price: number) => number;
  tToX: (t: number, t0: number, step: number) => number;
}

export function buildScale(candles: Candle[], paths: FuturePath[], mc: MonteCarloTree | null): ChartScale {
  const window = candles.slice(-WINDOW);
  let minP = Infinity;
  let maxP = -Infinity;
  for (const c of window) {
    minP = Math.min(minP, c.l);
    maxP = Math.max(maxP, c.h);
  }
  for (const p of paths) for (const pt of p.points) {
    minP = Math.min(minP, pt.price);
    maxP = Math.max(maxP, pt.price);
  }
  if (mc) for (const b of mc.bands) {
    minP = Math.min(minP, b.p5);
    maxP = Math.max(maxP, b.p95);
  }
  const pad = (maxP - minP) * 0.12 || 1;
  minP -= pad;
  maxP += pad;
  const n = window.length;
  const t0 = window[0]?.t ?? 0;
  const step = 8000;
  return {
    minP,
    maxP,
    n,
    x: (i: number) => -CHART_W / 2 + (i / Math.max(1, n - 1)) * CHART_W,
    y: (price: number) => -CHART_H / 2 + ((price - minP) / (maxP - minP)) * CHART_H,
    tToX: (t: number) => -CHART_W / 2 + Math.max(0, Math.min(1, (t - t0) / (step * (n - 1)))) * CHART_W,
  };
}

export const ZONE_COLORS: Record<StructuralZone['kind'], string> = {
  BOS: '#38e8ff',
  CHoCH: '#ffd84d',
  MSS: '#2dffb0',
  FVG: '#9d6bff',
  'order-block': '#4d7dff',
  'buyside-liq': '#ff5470',
  'sellside-liq': '#2dffb0',
  premium: 'rgba(255,84,112,0.10)',
  discount: 'rgba(45,255,176,0.10)',
};

export function zoneColor(kind: StructuralZone['kind']): string {
  return ZONE_COLORS[kind];
}

export function visibleCandles(candles: Candle[]): Candle[] {
  return candles.slice(-WINDOW);
}

export function mapZones(zones: StructuralZone[], scale: ChartScale, t0: number, step: number) {
  return zones
    .filter((z) => z.priceHigh > scale.minP && z.priceLow < scale.maxP)
    .map((z) => {
      const x = scale.tToX(z.t, t0, step);
      const width = z.kind === 'premium' || z.kind === 'discount' ? CHART_W : 1.7;
      return {
        ...z,
        position: [x, (scale.y(z.priceHigh) + scale.y(z.priceLow)) / 2, 0] as [number, number, number],
        size: [width, Math.max(0.08, scale.y(z.priceHigh) - scale.y(z.priceLow)), 0.12] as [number, number, number],
        color: zoneColor(z.kind),
      };
    });
}

export function mapDarkZones(zones: DarkPoolZone[], scale: ChartScale, candles: Candle[]) {
  const t0 = candles[0]?.t ?? 0;
  return zones.map((z, i) => ({
    ...z,
    position: [CHART_W / 2 - 0.6 - i * 1.4, scale.y(z.price), 0.15] as [number, number, number],
  }));
}

export function mapHeat(cells: ConfluenceCell[], scale: ChartScale, candles: Candle[]) {
  const t0 = candles[0]?.t ?? 0;
  return cells.map((c) => ({
    ...c,
    position: [scale.tToX(c.t, t0, 8000), scale.y(c.price), 0.2] as [number, number, number],
  }));
}

export function mapSweeps(sweeps: LiquiditySweep[], scale: ChartScale, candles: Candle[]) {
  const t0 = candles[0]?.t ?? 0;
  return sweeps.map((s) => ({
    ...s,
    position: [scale.tToX(s.t, t0, 8000), scale.y(s.price), 0.25] as [number, number, number],
  }));
}
