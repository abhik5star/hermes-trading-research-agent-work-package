import type { BookLevel, Candle, Instrument, OrderBook, Tick } from './types';
import type { FeedAdapter, FeedEvents } from './feedTypes';
import { FOCUS_SYMBOLS, SANDBOX_SYMBOLS, instrument } from './instruments';
import { Emitter } from './EventEmitter';
import { clamp, gaussian, hashSeed, mulberry32, uid } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Feed abstraction. A real deployment swaps SimulatedFeed for:
//   • BinanceMarketFeed  → wss://stream.binance.com:9443/ws/<sym>@kline_1m
//   • YFinanceMarketFeed → yfinance quote/websocket bridge (NSE symbols)
// Both implement the same FeedAdapter surface, so the brain never changes.
// ───────────────────────────────────────────────────────────────────────────

export type { FeedAdapter, FeedEvents } from './feedTypes';

const HISTORY = 240;
const TICKS_PER_CANDLE = 8;

interface SymbolStream {
  inst: Instrument;
  candles: Candle[];
  price: number;
  rand: () => number;
  drift: number;
  driftLeft: number;
  whaleLeft: number;
  whaleDir: 1 | -1;
  tickCount: number;
  volumeAvg20: number;
  book: OrderBook;
  nextWhaleIn: number;
}

export class SimulatedFeed extends Emitter<FeedEvents> implements FeedAdapter {
  readonly name = 'simulated-adapter (binance/yfinance parity)';
  private streams = new Map<string, SymbolStream>();
  private marks: Record<string, number> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private sandboxTimer: ReturnType<typeof setInterval> | null = null;
  private now = Date.now();

  constructor() {
    super();
    for (const symbol of FOCUS_SYMBOLS) this.bootStream(symbol);
    for (const symbol of SANDBOX_SYMBOLS) {
      this.marks[symbol] = this.syntheticBase(symbol);
    }
  }

  private syntheticBase(symbol: string): number {
    const r = mulberry32(hashSeed(symbol));
    if (symbol.startsWith('CRYPTO')) return 0.05 + r() * 400;
    if (symbol.startsWith('NSE')) return 80 + r() * 4200;
    return instrument(symbol).basePrice;
  }

  private bootStream(symbol: string): void {
    const inst = instrument(symbol);
    const rand = mulberry32(hashSeed(symbol));
    const candles = this.genesis(inst, rand);
    const price = candles.at(-1)!.c;
    const stream: SymbolStream = {
      inst,
      candles,
      price,
      rand,
      drift: 0,
      driftLeft: 0,
      whaleLeft: 0,
      whaleDir: 1,
      tickCount: 0,
      volumeAvg20: candles.slice(-20).reduce((a, c) => a + c.v, 0) / 20,
      book: this.buildBook(inst, price, rand),
      nextWhaleIn: 42 + Math.floor(rand() * 36),
    };
    this.streams.set(symbol, stream);
  }

  /** Seeded regime-switching GBM history with sweep wicks — gives the SMC
   *  engine real structural patterns (BOS/CHoCH/FVG) to discover. */
  private genesis(inst: Instrument, rand: () => number): Candle[] {
    const candles: Candle[] = [];
    let price = inst.basePrice * (0.94 + rand() * 0.04);
    const stepVol = inst.vol / Math.sqrt(480);
    let drift = 0;
    let regimeLeft = 20 + Math.floor(rand() * 25);
    const baseVol = inst.basePrice * 220;
    let t = this.now - HISTORY * TICKS_PER_CANDLE * 1000;

    for (let i = 0; i < HISTORY; i++) {
      if (--regimeLeft <= 0) {
        regimeLeft = 18 + Math.floor(rand() * 28);
        const roll = rand();
        drift = roll < 0.35 ? stepVol * (0.5 + rand()) : roll > 0.7 ? -stepVol * (0.5 + rand()) : 0;
      }
      const o = price;
      const shock = gaussian(rand) * stepVol * price;
      let c = o + shock + drift * price;
      // engineered liquidity sweep every ~40 candles
      const sweep = i > 30 && i % 37 === 0;
      const wick = sweep ? price * stepVol * (2.2 + rand() * 1.6) * (rand() > 0.5 ? 1 : -1) : 0;
      const h = Math.max(o, c) + Math.abs(gaussian(rand)) * stepVol * price * 0.6 + Math.max(0, wick);
      const l = Math.min(o, c) - Math.abs(gaussian(rand)) * stepVol * price * 0.6 + Math.min(0, wick);
      c = clamp(c, price * 0.92, price * 1.08);
      const volumeSpike = sweep || rand() > 0.93 ? 2.4 + rand() * 2.2 : 1;
      const v = Math.round(baseVol * (0.65 + rand() * 0.7) * volumeSpike);
      candles.push({ t, o, h, l, c, v });
      price = c;
      t += TICKS_PER_CANDLE * 1000;
    }
    return candles;
  }

  private buildBook(inst: Instrument, price: number, rand: () => number): OrderBook {
    const make = (side: 'bids' | 'asks'): BookLevel[] =>
      Array.from({ length: 8 }, (_, i) => {
        const gap = inst.tickSize * (i + 1) * (price < 5 ? 1 : price * 0.0004);
        const lvlPrice = side === 'bids' ? price - gap : price + gap;
        const iceberg = rand() > 0.86;
        return {
          price: lvlPrice,
          qty: Math.round((40 + rand() * 900) * (iceberg ? 0.25 : 1)),
          iceberg,
        };
      });
    const isPerp = inst.vehicle === 'futures';
    const isOpt = inst.vehicle === 'options';
    return {
      bids: make('bids'),
      asks: make('asks'),
      fundingRate: isPerp ? (rand() - 0.48) * 0.0009 : undefined,
      pcr: isOpt ? 0.7 + rand() * 0.9 : undefined,
      oiChangePct: isOpt ? (rand() - 0.45) * 14 : undefined,
    };
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 1000);
    this.sandboxTimer = setInterval(() => this.sandboxTick(), 2000);
  }

  /** Lazily boot a full candle + order-book stream for any universe symbol
   *  (e.g. when the scanner opens a chart that was not in the focus set). */
  ensureStream(symbol: string): void {
    if (!this.streams.has(symbol)) this.bootStream(symbol);
  }

  private tick(): void {
    this.now += 1000;
    for (const [symbol, s] of this.streams) {
      const { inst, rand } = s;
      if (--s.driftLeft <= 0) {
        s.driftLeft = 12 + Math.floor(rand() * 20);
        const roll = rand();
        const stepVol = inst.vol / Math.sqrt(480);
        s.drift = roll < 0.4 ? stepVol * (0.4 + rand()) : roll > 0.72 ? -stepVol * (0.4 + rand()) : 0;
      }
      if (--s.nextWhaleIn <= 0) {
        s.nextWhaleIn = 44 + Math.floor(rand() * 40);
        s.whaleLeft = 4 + Math.floor(rand() * 3);
        s.whaleDir = rand() > 0.5 ? 1 : -1;
        this.emit('whale', {
          symbol,
          side: s.whaleDir === 1 ? 'ask' : 'bid',
          magnitude: 0.55 + rand() * 0.4,
          t: this.now,
        });
      }

      const stepVol = inst.vol / Math.sqrt(480);
      let push = gaussian(rand) * stepVol * s.price + s.drift * s.price;
      let volMult = 1;
      if (s.whaleLeft > 0) {
        s.whaleLeft--;
        push += s.whaleDir * stepVol * s.price * (2.4 + rand() * 1.8);
        volMult = 3.2 + rand() * 2.4;
      }
      const prev = s.price;
      s.price = Math.max(inst.tickSize, s.price + push);
      const qty = Math.round(inst.basePrice * 220 * (0.6 + rand() * 0.8) * volMult);
      const tick: Tick = {
        symbol,
        t: this.now,
        price: s.price,
        qty,
        side: s.price >= prev ? 'ask' : 'bid',
      };
      this.emit('tick', tick);

      const candle = s.candles.at(-1)!;
      candle.c = s.price;
      candle.h = Math.max(candle.h, s.price);
      candle.l = Math.min(candle.l, s.price);
      candle.v += qty;
      s.tickCount++;
      let rolled = false;
      if (s.tickCount >= TICKS_PER_CANDLE) {
        s.tickCount = 0;
        const next: Candle = { t: this.now, o: s.price, h: s.price, l: s.price, c: s.price, v: 0 };
        s.candles.push(next);
        if (s.candles.length > HISTORY) s.candles.shift();
        rolled = true;
        s.volumeAvg20 = s.candles.slice(-20).reduce((a, c) => a + c.v, 0) / 20;
      }
      this.emit('candle', { symbol, candle: { ...s.candles.at(-1)! }, rolled });

      s.book = this.buildBook(inst, s.price, rand);
      this.emit('book', { symbol, book: s.book });
    }
  }

  private sandboxTick(): void {
    // Cheap scalar marks for the thousands of background paper-traded symbols.
    for (const symbol of SANDBOX_SYMBOLS) {
      const r = mulberry32(hashSeed(symbol + Math.floor(this.now / 2000)));
      const prev = this.marks[symbol] ?? 100;
      const move = (r() - 0.5) * 0.012;
      this.marks[symbol] = Math.max(0.01, prev * (1 + move));
    }
  }

  getCandles(symbol: string): Candle[] {
    return this.streams.get(symbol)?.candles ?? [];
  }

  getPrice(symbol: string): number {
    return this.streams.get(symbol)?.price ?? this.marks[symbol] ?? 0;
  }

  getBook(symbol: string): OrderBook {
    return this.streams.get(symbol)?.book ?? { bids: [], asks: [] };
  }

  getMark(symbol: string): number {
    return this.streams.get(symbol)?.price ?? this.marks[symbol] ?? 0;
  }

  getAllMarks(): Record<string, number> {
    return { ...this.marks };
  }

  volumeAverage(symbol: string): number {
    return this.streams.get(symbol)?.volumeAvg20 ?? 1;
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.sandboxTimer) clearInterval(this.sandboxTimer);
    this.timer = null;
    this.sandboxTimer = null;
  }
}

// The app-wide singleton lives in `liveFeed.ts` (CompositeFeed), which routes
// symbols to the Binance / Yahoo adapters and falls back to this simulator.
void uid;
