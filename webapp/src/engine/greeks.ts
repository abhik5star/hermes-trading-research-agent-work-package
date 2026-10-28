import type { GreekRow, OptionKind } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Real-time Black–Scholes Greeks pipeline for Nifty/BankNifty + crypto chains.
// ───────────────────────────────────────────────────────────────────────────

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

function normCdf(x: number): number {
  // Abramowitz–Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export interface BsInput {
  spot: number;
  strike: number;
  tte: number; // years
  rate: number;
  iv: number;
  kind: OptionKind;
}

export interface BsGreeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export function blackScholes({ spot, strike, tte, rate, iv, kind }: BsInput): BsGreeks {
  const sqrtT = Math.sqrt(Math.max(tte, 1e-6));
  const d1 = (Math.log(spot / strike) + (rate + (iv * iv) / 2) * tte) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const disc = Math.exp(-rate * tte);
  const gamma = normPdf(d1) / (spot * iv * sqrtT);
  const vega = (spot * normPdf(d1) * sqrtT) / 100;
  const thetaCommon = -(spot * normPdf(d1) * iv) / (2 * sqrtT);

  if (kind === 'CE') {
    return {
      price: spot * normCdf(d1) - strike * disc * normCdf(d2),
      delta: normCdf(d1),
      gamma,
      theta: (thetaCommon - rate * strike * disc * normCdf(d2)) / 365,
      vega,
    };
  }
  return {
    price: strike * disc * normCdf(-d2) - spot * normCdf(-d1),
    delta: normCdf(d1) - 1,
    gamma,
    theta: (thetaCommon + rate * strike * disc * normCdf(-d2)) / 365,
    vega,
  };
}

/** Build a live option chain around spot with gamma-blast radar scoring. */
export function buildChain(spot: number, step: number, tteDays: number, ivBase: number, jitter: () => number): GreekRow[] {
  const rows: GreekRow[] = [];
  const atm = Math.round(spot / step) * step;
  for (let k = -4; k <= 4; k++) {
    for (const kind of ['CE', 'PE'] as OptionKind[]) {
      const strike = atm + k * step;
      const moneyness = Math.abs(k) / 4;
      const iv = ivBase * (1 + moneyness * 0.35) + (jitter() - 0.5) * 0.01;
      const g = blackScholes({ spot, strike, tte: tteDays / 365, rate: 0.068, iv, kind });
      const oi = Math.round((1 - moneyness * 0.7) * (40000 + jitter() * 90000));
      const oiChangePct = (jitter() - 0.45) * 16;
      const atmness = Math.max(0, 1 - Math.abs(k));
      const gammaBlast = clamp01(g.gamma * spot * 12 * atmness + Math.max(0, oiChangePct) / 22 * atmness);
      rows.push({
        strike,
        kind,
        iv,
        delta: g.delta,
        gamma: g.gamma,
        theta: g.theta,
        vega: g.vega,
        oi,
        oiChangePct,
        gammaBlast,
      });
    }
  }
  return rows.sort((a, b) => a.strike - b.strike);
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Gamma Blast / short-squeeze radar: explosive gamma + OI surge near ATM. */
export function detectGammaBlast(rows: GreekRow[]): { blast: boolean; score: number; strike: number | null } {
  const atmRows = rows.filter((r) => Math.abs(r.delta) > 0.35 && Math.abs(r.delta) < 0.75);
  let best = 0;
  let strike: number | null = null;
  for (const r of atmRows) {
    const score = (r.gammaBlast ?? 0) + Math.max(0, r.oiChangePct) / 18;
    if (score > best) {
      best = score;
      strike = r.strike;
    }
  }
  return { blast: best > 0.82, score: Math.min(1, best), strike };
}
