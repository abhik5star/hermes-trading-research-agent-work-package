import type { Instrument } from './types';

// ───────────────────────────────────────────────────────────────────────────
// Multi-asset universe.
// Focused instruments carry full candle/order-book streams (yfinance-style for
// NSE, Binance-style for crypto). The sandbox universe below is traded in the
// background paper engine using lightweight mark updates (thousands of
// instruments, one cheap scalar per symbol per cycle).
// ───────────────────────────────────────────────────────────────────────────

const NSE_STOCKS: [string, string, number, number][] = [
  ['RELIANCE.NS', 'Reliance Industries', 2945, 0.014],
  ['TATASTEEL.NS', 'Tata Steel', 152, 0.022],
  ['HDFCBANK.NS', 'HDFC Bank', 1684, 0.012],
  ['ICICIBANK.NS', 'ICICI Bank', 1248, 0.015],
  ['TCS.NS', 'TCS', 4120, 0.011],
  ['INFY.NS', 'Infosys', 1875, 0.013],
  ['SBIN.NS', 'State Bank', 832, 0.018],
  ['AXISBANK.NS', 'Axis Bank', 1140, 0.017],
  ['KOTAKBANK.NS', 'Kotak Bank', 1790, 0.014],
  ['BHARTIARTL.NS', 'Bharti Airtel', 1620, 0.015],
  ['LT.NS', 'Larsen & Toubro', 3560, 0.014],
  ['MARUTI.NS', 'Maruti Suzuki', 12750, 0.013],
];

const CRYPTO: [string, string, number, number][] = [
  ['BTCUSDT', 'Bitcoin', 67500, 0.038],
  ['ETHUSDT', 'Ethereum', 3450, 0.045],
  ['SOLUSDT', 'Solana', 172, 0.062],
  ['BNBUSDT', 'BNB', 612, 0.035],
  ['XRPUSDT', 'Ripple', 0.62, 0.055],
  ['DOGEUSDT', 'Dogecoin', 0.16, 0.075],
  ['ADAUSDT', 'Cardano', 0.45, 0.058],
  ['AVAXUSDT', 'Avalanche', 38, 0.06],
  ['LINKUSDT', 'Chainlink', 17.5, 0.056],
  ['ARBUSDT', 'Arbitrum', 0.88, 0.068],
];

function buildUniverse(): Instrument[] {
  const list: Instrument[] = [];

  // Indian indices — yfinance WebSocket equivalents
  list.push(
    { symbol: '^NSEI', display: 'Nifty 50', assetClass: 'index', vehicle: 'spot', exchange: 'NSE', basePrice: 24580, vol: 0.011, tickSize: 0.05, lotSize: 50 },
    { symbol: '^NSEBANK', display: 'Bank Nifty', assetClass: 'index', vehicle: 'spot', exchange: 'NSE', basePrice: 51240, vol: 0.014, tickSize: 0.05, lotSize: 15 },
  );

  for (const [symbol, display, basePrice, vol] of NSE_STOCKS) {
    list.push({ symbol, display, assetClass: 'equity', vehicle: 'spot', exchange: 'NSE', basePrice, vol, tickSize: 0.05, lotSize: 1 });
  }

  // Weekly / monthly index option strikes around spot
  const optionChain: [string, string, number, number, 'CE' | 'PE'][] = [
    ['^NSEI', 'NIFTY', 24580, 250, 'CE'],
    ['^NSEI', 'NIFTY', 24580, 250, 'PE'],
    ['^NSEBANK', 'BANKNIFTY', 51240, 100, 'CE'],
    ['^NSEBANK', 'BANKNIFTY', 51240, 100, 'PE'],
  ];
  for (const [underlying, name, spot, step, kind] of optionChain) {
    for (let k = -2; k <= 2; k++) {
      const strike = Math.round((spot + k * step) / step) * step;
      list.push({
        symbol: `${name} ${strike} ${kind}`,
        display: `${name} ${strike} ${kind}`,
        assetClass: 'index',
        vehicle: 'options',
        exchange: 'NSE',
        basePrice: kind === 'CE' ? Math.max(40, spot - strike + 180) : Math.max(40, strike - spot + 180),
        vol: 0.03,
        tickSize: 0.5,
        lotSize: name === 'NIFTY' ? 50 : 15,
        optionKind: kind,
        strike,
        underlying,
        expiry: 'weekly',
      });
    }
  }

  // Crypto — Binance WebSocket equivalents across Spot & Futures (+ BTC/ETH options)
  for (const [symbol, display, basePrice, vol] of CRYPTO) {
    list.push({ symbol, display, assetClass: 'crypto', vehicle: 'spot', exchange: 'BINANCE', basePrice, vol, tickSize: basePrice < 1 ? 0.0001 : 0.01, lotSize: 1 });
    list.push({ symbol: `${symbol}_PERP`, display: `${display} Perpetual`, assetClass: 'crypto', vehicle: 'futures', exchange: 'BINANCE', basePrice, vol: vol * 1.12, tickSize: basePrice < 1 ? 0.0001 : 0.01, lotSize: 1 });
  }
  for (const [underlying, name, spot, kind] of [
    ['BTCUSDT', 'BTC', 67500, 'CE'],
    ['BTCUSDT', 'BTC', 67500, 'PE'],
    ['ETHUSDT', 'ETH', 3450, 'CE'],
    ['ETHUSDT', 'ETH', 3450, 'PE'],
  ] as const) {
    for (let k = -1; k <= 1; k++) {
      const step = 1000;
      const strike = Math.round((spot + k * step) / step) * step;
      list.push({
        symbol: `${name} ${strike} ${kind}`,
        display: `${name} ${strike} ${kind}`,
        assetClass: 'crypto',
        vehicle: 'options',
        exchange: 'BINANCE',
        basePrice: 900 + Math.abs(k) * 350,
        vol: 0.05,
        tickSize: 0.1,
        lotSize: 1,
        optionKind: kind,
        strike,
        underlying,
        expiry: 'quarterly',
      });
    }
  }

  return list;
}

export const UNIVERSE: Instrument[] = buildUniverse();

export const FOCUS_SYMBOLS = ['^NSEI', '^NSEBANK', 'BTCUSDT_PERP', 'ETHUSDT_PERP'];

export function instrument(symbol: string): Instrument {
  const found = UNIVERSE.find((i) => i.symbol === symbol);
  if (!found) throw new Error(`Unknown instrument ${symbol}`);
  return found;
}

/** Background sandbox symbols — NSE top-100 flavour + 200+ crypto coins. */
export const SANDBOX_SYMBOLS: string[] = (() => {
  const nseExtra = Array.from({ length: 88 }, (_, i) => `NSE-SB${String(i + 1).padStart(3, '0')}`);
  const cryptoExtra = Array.from({ length: 200 }, (_, i) => `CRYPTO-SB${String(i + 1).padStart(3, '0')}USDT`);
  return [...UNIVERSE.filter((i) => i.vehicle !== 'options').map((i) => i.symbol), ...nseExtra, ...cryptoExtra];
})();

export const VEHICLE_LABEL: Record<string, string> = {
  spot: 'Spot',
  futures: 'Futures',
  options: 'Options',
};
