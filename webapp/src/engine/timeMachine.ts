import type { Candle, FuturePath, PathId } from './types';
import type { SmcSnapshot } from './smcEngine';
import type { HiddenIndicatorSnapshot } from './indicators';
import { clamp, gaussian, mulberry32 } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Cognitive "Time Machine" — hyper-fast local simulation projecting the three
// highest-probability future pathways before every autonomous execution.
// ───────────────────────────────────────────────────────────────────────────

const HORIZON = 24;

export class TimeMachine {
  private tick = 0;

  project(candles: Candle[], smc: SmcSnapshot, ind: HiddenIndicatorSnapshot, seedSalt = 0): FuturePath[] {
    this.tick++;
    const price = candles.at(-1)!.c;
    const stepVol = Math.max(0.0008, this.realisedVol(candles));
    const bullishStructure = smc.bias === 'bullish';
    const rand = mulberry32(Math.floor(Date.now() / 3000) + seedSalt);

    // Base confidence from structure + hidden confluence
    const trendStrength = clamp(Math.abs(ind.trendAlignment) * 0.5 + (bullishStructure ? 0.25 : -0.25) + 0.4, 0, 1);
    let pBull = bullishStructure ? 42 + trendStrength * 28 : 34 - trendStrength * 12;
    let pBear = bullishStructure ? 22 - trendStrength * 6 : 40 + trendStrength * 26;
    let pSide = 100 - pBull - pBear;

    // Live drift so floating neon tags "update live"
    pBull = clamp(pBull + (rand() - 0.5) * 4, 18, 72);
    pBear = clamp(pBear + (rand() - 0.5) * 4, 12, 64);
    pSide = clamp(100 - pBull - pBear, 8, 46);
    const norm = pBull + pBear + pSide;
    pBull = (pBull / norm) * 100;
    pBear = (pBear / norm) * 100;
    pSide = (pSide / norm) * 100;

    const overheadFvg = smc.zones.find((z) => z.kind === 'FVG' && z.bias === 'bearish' && z.priceLow > price);
    const bullOb = smc.zones.find((z) => z.kind === 'order-block' && z.bias === 'bullish');
    const bearOb = smc.zones.find((z) => z.kind === 'order-block' && z.bias === 'bearish');

    const build = (id: PathId, bias: FuturePath['bias'], drift: number, prob: number, catalyst: string): FuturePath => {
      const r = mulberry32(seedSalt + id.charCodeAt(0) + this.tick);
      const points = [];
      let p = price;
      const t0 = candles.at(-1)!.t;
      for (let i = 1; i <= HORIZON; i++) {
        const pull = drift * stepVol * price * 0.55;
        p = p + pull + gaussian(r) * stepVol * price * (bias === 'neutral' ? 0.35 : 0.7);
        points.push({ t: t0 + i * 8000, price: p });
      }
      return { id, bias, points, probability: Math.round(prob * 10) / 10, catalyst };
    };

    return [
      build(
        'A',
        'bullish',
        1,
        pBull,
        overheadFvg
          ? 'SMC liquidity sweep successful — price mitigating overhead FVG, then extending to premium'
          : `MSS + hidden EMA stack aligned; targeting buyside liquidity above ${Math.round(smc.dealingHigh)}`,
      ),
      build(
        'B',
        'neutral',
        0,
        pSide,
        'Retail trapped inside tight Donchian range — theta harvest regime, mean-reversion at equilibrium',
      ),
      build(
        'C',
        'bearish',
        -1,
        pBear,
        bearOb
          ? `Bearish Order Block at ${Math.round(bearOb.priceHigh)} fails to break — hard stop-loss path armed`
          : `Bullish OB ${bullOb ? Math.round(bullOb.priceLow) : ''} invalidation — reversal into discount zone`,
      ),
    ];
  }

  private realisedVol(candles: Candle[]): number {
    const slice = candles.slice(-30);
    const rets = slice.slice(1).map((c, i) => Math.log(c.c / slice[i].c));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
    return Math.sqrt(variance) || 0.002;
  }
}
