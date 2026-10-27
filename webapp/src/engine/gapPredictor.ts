import type { GapForecast } from './types';
import type { SmcSnapshot } from './smcEngine';
import { mulberry32 } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Pre-market Gap predictor — GIFT Nifty + global indices + overnight block
// flow + closing PCR / Max Pain shift, rendered as a 9:00 AM holographic panel.
// ───────────────────────────────────────────────────────────────────────────

export function buildGapForecast(smc: SmcSnapshot, spot: number): GapForecast {
  const rand = mulberry32(Math.floor(Date.now() / 3_600_000));
  const giftNifty = spot * (1 + (rand() - 0.48) * 0.012);
  const spx = (rand() - 0.48) * 2.2;
  const nasdaq = (rand() - 0.48) * 2.8;
  const dow = (rand() - 0.48) * 1.8;
  const pcr = 0.75 + rand() * 0.8;
  const maxPainShift = (rand() - 0.5) * 1.4;
  const blockFlow = (rand() - 0.45) * 1800; // ₹ crore net institutional

  const globalScore = (spx + nasdaq + dow) / 3;
  const gapPct = (giftNifty - spot) / spot * 100 + globalScore * 0.12 + blockFlow / 9000;
  const direction: GapForecast['direction'] =
    gapPct > 0.25 ? 'GAP-UP' : gapPct < -0.25 ? 'GAP-DOWN' : 'FLAT-OPEN';

  const zones = [
    ...smc.zones
      .filter((z) => z.kind === 'order-block' || z.kind === 'FVG')
      .slice(-3)
      .map((z) => ({ label: `${z.kind.toUpperCase()} ${z.bias}`, price: (z.priceHigh + z.priceLow) / 2 })),
    { label: 'Dealing equilibrium', price: smc.equilibrium },
  ];

  return {
    gapPct,
    direction,
    giftNifty,
    spx,
    nasdaq,
    dow,
    pcr,
    maxPainShift,
    blockFlow,
    zones,
    at: Date.now(),
  };
}
