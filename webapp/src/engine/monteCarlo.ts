import type { Candle } from './types';
import { gaussian, mulberry32 } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// 3D Monte Carlo — 10,000 randomised market paths collapsed into a branching
// neon neural tree (quantile bands per step keep the GPU payload tiny).
// ───────────────────────────────────────────────────────────────────────────

export interface MonteCarloTree {
  steps: number;
  t0: number;
  stepMs: number;
  start: number;
  /** p5/p25/p50/p75/p95 price bands per step */
  bands: { p5: number; p25: number; p50: number; p75: number; p95: number }[];
  /** a handful of full paths rendered as individual neon filaments */
  filaments: { t: number; price: number }[][];
  probUp: number;
  expected: number;
  var95: number; // 5% worst-case return
}

const PATHS = 10_000;
const STEPS = 30;

export function runMonteCarlo(candles: Candle[], seedSalt = 0): MonteCarloTree {
  const price = candles.at(-1)!.c;
  const slice = candles.slice(-40);
  const rets = slice.slice(1).map((c, i) => Math.log(c.c / slice[i].c));
  const mu = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sigma = Math.sqrt(rets.reduce((a, b) => a + (b - mu) ** 2, 0) / rets.length) || 0.002;
  const rand = mulberry32(hash32(Math.floor(Date.now() / 60000)) + seedSalt);

  const grid: number[][] = Array.from({ length: STEPS }, () => []);
  const filaments: { t: number; price: number }[][] = [];
  let upCount = 0;
  const terminal: number[] = [];
  const t0 = candles.at(-1)!.t;

  for (let n = 0; n < PATHS; n++) {
    let p = price;
    const track = n % 850 === 0;
    const path: { t: number; price: number }[] = [];
    for (let s = 0; s < STEPS; s++) {
      p = p * Math.exp(mu + sigma * gaussian(rand));
      grid[s].push(p);
      if (track) path.push({ t: t0 + (s + 1) * 8000, price: p });
    }
    if (track) filaments.push(path);
    terminal.push(p);
    if (p > price) upCount++;
  }

  const bands = grid.map((arr) => {
    arr.sort((a, b) => a - b);
    return {
      p5: arr[Math.floor(arr.length * 0.05)],
      p25: arr[Math.floor(arr.length * 0.25)],
      p50: arr[Math.floor(arr.length * 0.5)],
      p75: arr[Math.floor(arr.length * 0.75)],
      p95: arr[Math.floor(arr.length * 0.95)],
    };
  });
  terminal.sort((a, b) => a - b);
  return {
    steps: STEPS,
    t0,
    stepMs: 8000,
    start: price,
    bands,
    filaments,
    probUp: upCount / PATHS,
    expected: terminal[Math.floor(terminal.length * 0.5)],
    var95: (terminal[Math.floor(terminal.length * 0.05)] - price) / price,
  };
}

function hash32(x: number): number {
  let h = x | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
