import { Emitter } from '../EventEmitter';
import type { Candle, OrderBook } from '../types';
import type { FeedEvents, FeedStatus, FeedStatusReport } from '../feedTypes';

/**
 * Binance public market-data adapter — **free, no API key required**.
 *
 * • WebSocket: `wss://stream.binance.com:9443/stream` (spot) and
 *   `wss://fstream.binance.com/stream` (USD-M futures) using the public
 *   `@kline` / `@ticker` / `@depth10` streams.
 * • History bootstrap: `GET /api/v3/klines` (spot) and `/fapi/v1/klines`
 *   (futures) for the last 240 one-minute candles.
 *
 * Only public market data is used — there is no order endpoint, no key and no
 * trading capability in this adapter.
 *
 * If the socket cannot be opened (offline, blocked, corporate proxy) the
 * adapter simply reports `error` and the composite feed keeps serving the
 * simulated stream, so the dashboard never goes blank.
 */

const SPOT_WS = 'wss://stream.binance.com:9443/stream';
const FUTURES_WS = 'wss://fstream.binance.com/stream';
const SPOT_REST = 'https://api.binance.com/api/v3/klines';
const FUTURES_REST = 'https://fapi.binance.com/fapi/v1/klines';

const HISTORY = 240;
const PING_MS = 30_000;
const MAX_BACKOFF_MS = 30_000;

export type BinanceVenue = 'spot' | 'futures';

/** `BTCUSDT_PERP` → futures BTCUSDT, `BTCUSDT` → spot BTCUSDT. */
export function binanceSymbol(symbol: string): { pair: string; venue: BinanceVenue } | null {
  if (symbol.endsWith('_PERP')) return { pair: symbol.replace('_PERP', '').toUpperCase(), venue: 'futures' };
  if (symbol.endsWith('_SPOT')) return { pair: symbol.replace('_SPOT', '').toUpperCase(), venue: 'spot' };
  if (/^[A-Z0-9]{1,20}USDT$/.test(symbol)) return { pair: symbol.toUpperCase(), venue: 'spot' };
  return null;
}

interface Stream {
  symbol: string;
  pair: string;
  venue: BinanceVenue;
  candles: Candle[];
  price: number;
  volumeAvg20: number;
  book: OrderBook;
  lastKlineOpen: number;
  /** Binance's own 24 h change percentage (from the @ticker stream). */
  changePct24h?: number;
}

export class BinanceWsFeed extends Emitter<FeedEvents> {
  readonly name = 'binance-public-websocket';

  private streams = new Map<string, Stream>();
  private sockets = new Map<BinanceVenue, WebSocket>();
  private status: FeedStatus = 'idle';
  private detail = 'Not connected';
  private lastMessageAt: number | null = null;
  private backoff = 1000;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  /** Symbols Binance cannot serve (options, NSE names) — the composite feed
   *  falls back to the simulator for those. */
  static supports(symbol: string): boolean {
    if (symbol.startsWith('^') || symbol.endsWith('.NS')) return false;
    if (symbol.includes('-')) return false; // dated option contracts
    return binanceSymbol(symbol) !== null;
  }

  statusReport(): FeedStatusReport {
    return {
      source: this.name,
      status: this.status,
      detail: this.detail,
      symbols: [...this.streams.keys()],
      lastMessageAt: this.lastMessageAt,
    };
  }

  /** Subscribe a symbol and bootstrap its history. */
  async subscribe(symbol: string): Promise<void> {
    const mapped = binanceSymbol(symbol);
    if (!mapped) {
      this.status = 'unsupported';
      this.detail = `${symbol} is not a Binance symbol`;
      return;
    }
    if (!this.streams.has(symbol)) {
      this.streams.set(symbol, {
        symbol,
        pair: mapped.pair,
        venue: mapped.venue,
        candles: [],
        price: 0,
        volumeAvg20: 1,
        book: { bids: [], asks: [] },
        lastKlineOpen: 0,
      });
    }
    const stream = this.streams.get(symbol)!;

    // History first so the chart is never empty while the socket warms up.
    try {
      const candles = await this.fetchHistory(mapped.pair, mapped.venue);
      if (candles.length) {
        stream.candles = candles;
        stream.price = candles.at(-1)!.c;
        stream.volumeAvg20 = candles.slice(-20).reduce((a, c) => a + c.v, 0) / 20;
        this.emit('candle', { symbol, candle: { ...candles.at(-1)! }, rolled: false });
      }
    } catch (err) {
      this.status = 'error';
      this.detail = `History fetch failed: ${(err as Error).message}`;
    }

    this.ensureSocket(mapped.venue);
  }

  private async fetchHistory(pair: string, venue: BinanceVenue): Promise<Candle[]> {
    const base = venue === 'futures' ? FUTURES_REST : SPOT_REST;
    const url = `${base}?symbol=${pair}&interval=1m&limit=${HISTORY}`;
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = (await res.json()) as Array<[number, string, string, string, string, string, ...unknown[]]>;
    return rows.map((r) => ({
      t: r[0],
      o: Number(r[1]),
      h: Number(r[2]),
      l: Number(r[3]),
      c: Number(r[4]),
      v: Number(r[5]),
    }));
  }

  private ensureSocket(venue: BinanceVenue): void {
    if (this.closed || this.sockets.has(venue)) return;
    const streams = [...this.streams.values()].filter((s) => s.venue === venue);
    if (!streams.length) return;

    const pairs = streams.map((s) => `${s.pair.toLowerCase()}@kline_1m`);
    const tickers = streams.map((s) => `${s.pair.toLowerCase()}@ticker`);
    const books = streams.map((s) => `${s.pair.toLowerCase()}@depth10@100ms`);
    const url = `${venue === 'futures' ? FUTURES_WS : SPOT_WS}?streams=${[...pairs, ...tickers, ...books].join('/')}`;

    this.status = 'connecting';
    this.detail = `Opening ${venue} stream (${streams.length} symbol${streams.length > 1 ? 's' : ''})…`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      this.status = 'error';
      this.detail = `Socket construction failed: ${(err as Error).message}`;
      this.scheduleReconnect();
      return;
    }
    this.sockets.set(venue, ws);

    ws.onopen = () => {
      this.status = 'live';
      this.detail = `Live ${venue} market data`;
      this.backoff = 1000;
      if (!this.pingTimer) {
        this.pingTimer = setInterval(() => {
          for (const socket of this.sockets.values()) {
            if (socket.readyState === WebSocket.OPEN) socket.send('{"method":"PING"}');
          }
        }, PING_MS);
      }
    };

    ws.onmessage = (ev) => {
      this.lastMessageAt = Date.now();
      try {
        const payload = JSON.parse(ev.data as string) as { stream?: string; data?: Record<string, unknown> };
        const stream = payload.stream;
        const data = payload.data;
        if (!stream || !data) return;
        const pair = stream.split('@')[0].toUpperCase();
        const target = [...this.streams.values()].find((s) => s.pair === pair);
        if (!target) return;

        if (stream.includes('@kline')) this.applyKline(target, data as never);
        else if (stream.includes('@ticker')) this.applyTicker(target, data as never);
        else if (stream.includes('@depth')) this.applyDepth(target, data as never);
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onerror = () => {
      this.status = 'error';
      this.detail = 'Socket error — check network access to stream.binance.com';
    };

    ws.onclose = () => {
      this.sockets.delete(venue);
      if (!this.closed) {
        this.status = 'error';
        this.detail = 'Socket closed — reconnecting…';
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const wait = Math.min(this.backoff, MAX_BACKOFF_MS);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      const venues = new Set([...this.streams.values()].map((s) => s.venue));
      for (const venue of venues) this.ensureSocket(venue);
    }, wait);
  }

  private applyKline(target: Stream, data: { k: { t: number; o: string; h: string; l: string; c: string; v: string; x: boolean } }): void {
    const k = data.k;
    const candle: Candle = { t: k.t, o: Number(k.o), h: Number(k.h), l: Number(k.l), c: Number(k.c), v: Number(k.v) };
    const last = target.candles.at(-1);
    const rolled = k.x && (!last || last.t !== k.t);
    if (!last || last.t !== k.t) {
      target.candles.push(candle);
      if (target.candles.length > HISTORY) target.candles.shift();
      target.volumeAvg20 = target.candles.slice(-20).reduce((a, c) => a + c.v, 0) / 20;
    } else {
      target.candles[target.candles.length - 1] = candle;
    }
    target.price = candle.c;
    target.lastKlineOpen = k.t;
    this.emit('candle', { symbol: target.symbol, candle: { ...candle }, rolled });
    this.emit('tick', {
      symbol: target.symbol,
      t: k.t,
      price: candle.c,
      qty: candle.v,
      side: candle.c >= candle.o ? 'ask' : 'bid',
    });
  }

  private applyTicker(target: Stream, data: { c: string; v: string; P?: string }): void {
    target.price = Number(data.c);
    // `P` is the exchange's own 24 h change percentage — the honest number
    // to show next to a live price.
    if (typeof data.P === 'string' && Number.isFinite(Number(data.P))) target.changePct24h = Number(data.P);
  }

  private applyDepth(target: Stream, data: { b: [string, string][]; a: [string, string][] }): void {
    target.book = {
      bids: data.b.slice(0, 8).map(([p, q]) => ({ price: Number(p), qty: Number(q), iceberg: false })),
      asks: data.a.slice(0, 8).map(([p, q]) => ({ price: Number(p), qty: Number(q), iceberg: false })),
    };
    this.emit('book', { symbol: target.symbol, book: target.book });
  }

  getCandles(symbol: string): Candle[] {
    return this.streams.get(symbol)?.candles ?? [];
  }

  getPrice(symbol: string): number {
    return this.streams.get(symbol)?.price ?? 0;
  }

  getBook(symbol: string): OrderBook {
    return this.streams.get(symbol)?.book ?? { bids: [], asks: [] };
  }

  getMark(symbol: string): number {
    return this.getPrice(symbol);
  }

  /** 24 h change in percent (Binance `@ticker` `P`, else the bootstrapped window). */
  changePct(symbol: string): number {
    const s = this.streams.get(symbol);
    if (!s) return 0;
    if (typeof s.changePct24h === 'number') return s.changePct24h;
    const first = s.candles[0];
    const last = s.candles.at(-1);
    if (!first || !last || !first.o) return 0;
    return ((last.c - first.o) / first.o) * 100;
  }

  getAllMarks(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [symbol, stream] of this.streams) out[symbol] = stream.price;
    return out;
  }

  volumeAverage(symbol: string): number {
    return this.streams.get(symbol)?.volumeAvg20 ?? 1;
  }

  hasData(symbol: string): boolean {
    return (this.streams.get(symbol)?.candles.length ?? 0) > 0;
  }

  destroy(): void {
    this.closed = true;
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pingTimer = null;
    this.reconnectTimer = null;
    for (const socket of this.sockets.values()) socket.close();
    this.sockets.clear();
    this.streams.clear();
  }
}
