import type { FlashReport, StrategyGenome } from './types';
import { defaultGenome, runBacktest, synthesizeDailyHistory } from './backtest';

// ───────────────────────────────────────────────────────────────────────────
// Flash Backtest Sandbox — natural-language strategy variations parsed and
// backtested across 3 years of generated daily data in ~3 seconds.
// ───────────────────────────────────────────────────────────────────────────

interface ParsedVariation {
  genome: StrategyGenome;
  summary: string;
  symbol: string;
}

const SYMBOL_ALIASES: Record<string, string> = {
  nifty: '^NSEI',
  banknifty: '^NSEBANK',
  btc: 'BTCUSDT_PERP',
  bitcoin: 'BTCUSDT_PERP',
  eth: 'ETHUSDT_PERP',
  ethereum: 'ETHUSDT_PERP',
  reliance: 'RELIANCE.NS',
  tatasteel: 'TATASTEEL.NS',
};

export function parseStrategyQuery(query: string): ParsedVariation {
  const genome = defaultGenome();
  const notes: string[] = [];
  const q = query.toLowerCase();

  const emaMatch = q.match(/(\d{1,3})\s*ema(?:\s+instead\s+of\s+(\d{1,3})\s*ema)?/);
  if (emaMatch) {
    genome.emaFast = Number(emaMatch[1]);
    notes.push(`EMA fast ${emaMatch[1]}${emaMatch[2] ? ` (was ${emaMatch[2]})` : ''}`);
  }
  const rsiMatch = q.match(/rsi\s*(?:threshold|level|of)?\s*(\d{1,3})/);
  if (rsiMatch) {
    const v = Number(rsiMatch[1]);
    if (v < 50) genome.rsiOversold = v;
    else genome.rsiOverbought = v;
    notes.push(`RSI threshold ${v}`);
  }
  const donchianMatch = q.match(/donchian\s*(?:period|of)?\s*(\d{1,2})/);
  if (donchianMatch) {
    genome.donchianPeriod = Number(donchianMatch[1]);
    notes.push(`Donchian period ${donchianMatch[1]}`);
  }
  const stMatch = q.match(/super\s*?trend\s*(?:multiplier|mult|of)?\s*(\d(?:\.\d)?)/);
  if (stMatch) {
    genome.supertrendMult = Number(stMatch[1]);
    notes.push(`Supertrend multiplier ${stMatch[1]}`);
  }
  const fvgMatch = q.match(/fvg\s*(?:depth|validation)?\s*(\d)/);
  if (fvgMatch) {
    genome.fvgDepth = Number(fvgMatch[1]);
    notes.push(`FVG validation depth ${fvgMatch[1]}`);
  }
  if (!notes.length) notes.push('Baseline SMC/ICT confluence stack (no parameter change detected)');

  let symbol = '^NSEI';
  for (const [alias, sym] of Object.entries(SYMBOL_ALIASES)) {
    if (q.includes(alias)) {
      symbol = sym;
      break;
    }
  }

  return { genome, summary: notes.join(' · '), symbol };
}

export function executeFlashTest(query: string): FlashReport {
  const { genome, summary, symbol } = parseStrategyQuery(query);
  const history = synthesizeDailyHistory(symbol + ':flash', 750);
  const stats = runBacktest(history, genome);
  const go = stats.winRate >= 0.52 && stats.profitFactor >= 1.25 && stats.maxDrawdown < 0.2;
  return {
    query,
    parsed: `${summary} — 3Y daily bars on ${symbol}`,
    winRate: stats.winRate,
    profitFactor: stats.profitFactor,
    trades: stats.trades,
    expectancy: stats.expectancy,
    recommendation: go ? 'GO' : 'NO-GO',
    at: Date.now(),
  };
}
