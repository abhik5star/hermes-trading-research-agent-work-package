import { Emitter } from '../EventEmitter';
import { UNIVERSE } from '../instruments';
import type { Candle, OrderBook } from '../types';
import type { FeedEvents, FeedStatus, FeedStatusReport } from '../feedTypes';
import { isNseOpen } from '../marketSession';

/** Real NSE tickers Yahoo can actually quote. */
const REAL_NSE_SYMBOLS = new Set(
  UNIVERSE.filter((i) => i.exchange === 'NSE' && i.vehicle !== 'options').map((i) => i.symbol),
);

/**
 * Yahoo Finance adapter — **free, no API key required**.
 *
 * Yahoo does not publish a free public WebSocket for quotes, so the primary
 * transport here is the free chart endpoint, polled on a short interval:
 *
 *   GET https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}
 *       ?interval=1m&range=1d
 *
 * It returns the live intraday series (and `meta.regularMarketPrice` for the
 * last trade), which is exactly what the chart needs. NSE symbols map 1:1 —
 * `^NSEI` → NIFTY, `^NSEBANK` → BANKNIFTY, `RELIANCE.NS` → Reliance.
 *
 * If you have your own free WebSocket relay (many brokers and data
 * aggregators expose one), set `VITE_YAHOO_WS_URL` and this adapter will use
 * that socket instead of polling. The expected frame shape is:
 *
 *   { "symbol": "^NSEI", "price": 24580.5, "volume": 1200,
 *     "candle": { "t": 1712345678000, "o": 1, "h": 1, "l": 1, "c": 1, "v": 1 } }
 *
 * When the network is unavailable the adapter reports `error` and the
 * composite feed keeps the simulated stream running.
 */

const CHART_API = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const HISTORY = 240;
const POLL_MS = 8000;
const POLL_MS_CLOSED = 60_000;
const MAX_BACKOFF_MS = 60_000;

interface YahooStream {
  symbol: string;
  candles: Candle[];
  price: number;
  volumeAvg20: number;
  book: OrderBook;
  /** Previous session close — the reference for the daily change. */
  prevClose?: number;
}

export class YahooFeed extends Emitter<FeedEvents> {
  readonly name = 'yahoo-finance-bridge';

  private streams = new Map<string, YahooStream>();
  private status: FeedStatus = 'idle';
  private detail = 'Not connected';
  private lastMessageAt: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private backoff = POLL_MS;
  private closed = false;
  private socket: WebSocket | null = null;
  private readonly relayUrl: string | undefined;

  constructor(relayUrl?: string) {
    super();
    this.relayUrl = relayUrl;
  }

  /** Yahoo serves equities and indices — crypto pairs are Binance's job, and
   *  the synthetic sandbox tickers are not real Yahoo symbols either. */
  static supports(symbol: string): boolean {
    if (symbol.endsWith('_PERP')) return false;
    if (symbol.endsWith('USDT') || symbol.endsWith('USDC')) return false;
    if (/^[A-Z0-9]{1,20}USDT$/.test(symbol)) return false;
    if (symbol.startsWith('NSE-SB') || symbol.startsWith('CRYPTO-SB')) return false;
    return REAL_NSE_SYMBOLS.has(symbol);
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

  async subscribe(symbol: string): Promise<void> {
    if (!this.streams.has(symbol)) {
      this.streams.set(symbol, {
        symbol,
        candles: [],
        price: 0,
        volumeAvg20: 1,
        book: { bids: [], asks: [] },
      });
    }
    if (this.relayUrl) this.openRelay();
    else this.startPolling();
    await this.poll(symbol);
  }

  private startPolling(): void {
    if (this.timer || this.closed) return;
    const tick = () => {
      if (this.closed) return;
      for (const symbol of this.streams.keys()) void this.poll(symbol);
      // The exchange is shut → the series will not change, so poll gently.
      const delay = isNseOpen() ? POLL_MS : POLL_MS_CLOSED;
      this.timer = setTimeout(tick, delay);
    };
    this.timer = setTimeout(tick, POLL_MS);
  }

  private openRelay(): void {
    if (this.socket || this.closed || !this.relayUrl) return;
    this.status = 'connecting';
    this.detail = 'Opening Yahoo relay socket…';
    try {
      const ws = new WebSocket(this.relayUrl);
      this.socket = ws;
      ws.onopen = () => {
        this.status = 'live';
        this.detail = 'Live relay connected';
        for (const symbol of this.streams.keys()) {
          ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        }
      };
      ws.onmessage = (ev) => {
        this.lastMessageAt = Date.now();
        try {
          const msg = JSON.parse(ev.data as string) as {
            symbol: string;
            price?: number;
            volume?: number;
            candle?: Candle;
          };
          const stream = this.streams.get(msg.symbol);
          if (!stream) return;
          if (msg.candle) {
            const last = stream.candles.at(-1);
            const rolled = !!last && msg.candle.t !== last.t;
            if (!last || last.t !== msg.candle.t) {
              stream.candles.push(msg.candle);
              if (stream.candles.length > HISTORY) stream.candles.shift();
              stream.volumeAvg20 = stream.candles.slice(-20).reduce((a, c) => a + c.v, 0) / 20;
            } else {
              stream.candles[stream.candles.length - 1] = msg.candle;
            }
            stream.price = msg.candle.c;
            this.emit('candle', { symbol: msg.symbol, candle: { ...msg.candle }, rolled });
          }
          if (typeof msg.price === 'number') {
            stream.price = msg.price;
            this.emit('tick', {
              symbol: msg.symbol,
              t: Date.now(),
              price: msg.price,
              qty: msg.volume ?? 0,
              side: 'ask',
            });
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onerror = () => {
        this.status = 'error';
        this.detail = 'Relay socket error — falling back to polling';
      };
      ws.onclose = () => {
        this.socket = null;
        if (!this.closed) {
          this.status = 'error';
          this.detail = 'Relay closed — falling back to polling';
          this.startPolling();
        }
      };
    } catch (err) {
      this.status = 'error';
      this.detail = `Relay failed: ${(err as Error).message}`;
      this.startPolling();
    }
  }

  private async poll(symbol: string): Promise<void> {
    if (this.closed) return;
    const stream = this.streams.get(symbol);
    if (!stream) return;
    try {
      const url = `${CHART_API}${encodeURIComponent(symbol)}?interval=1m&range=1d`;
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        chart: {
          result?: Array<{
            meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number };
            timestamp?: number[];
            indicators?: { quote?: Array<{ open?: number[]; high?: number[]; low?: number[]; close?: number[]; volume?: number[] }> };
          }>;
          error?: { description?: string } | null;
        };
      };
      if (json.chart.error) throw new Error(json.chart.error.description ?? 'Yahoo error');
      const result = json.chart.result?.[0];
      if (!result) throw new Error('No chart data');

      const ts = result.timestamp ?? [];
      const quote = result.indicators?.quote?.[0] ?? {};
      const candles: Candle[] = [];
      for (let i = 0; i < ts.length; i++) {
        const o = quote.open?.[i];
        const h = quote.high?.[i];
        const l = quote.low?.[i];
        const c = quote.close?.[i];
        if (o == null || h == null || l == null || c == null) continue;
        candles.push({ t: ts[i] * 1000, o, h, l, c, v: quote.volume?.[i] ?? 0 });
      }

      if (candles.length) {
        const before = stream.candles.at(-1);
        stream.candles = candles.slice(-HISTORY);
        stream.volumeAvg20 = stream.candles.slice(-20).reduce((a, c) => a + c.v, 0) / 20;
        const last = stream.candles.at(-1)!;
        stream.price = result.meta?.regularMarketPrice ?? last.c;
        const prevClose = result.meta?.chartPreviousClose ?? result.meta?.previousClose;
        if (typeof prevClose === 'number' && prevClose > 0) stream.prevClose = prevClose;
        this.lastMessageAt = Date.now();
        this.status = 'live';
        this.detail = `Live ${symbol} · ${stream.candles.length} bars`;
        this.emit('candle', { symbol, candle: { ...last }, rolled: !!before && before.t !== last.t });
        this.emit('tick', { symbol, t: Date.now(), price: stream.price, qty: last.v, side: 'ask' });
      }
      this.backoff = POLL_MS;
    } catch (err) {
      this.status = 'error';
      this.detail = `Yahoo poll failed: ${(err as Error).message}`;
      // back off so a blocked network does not hammer the endpoint
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    }
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

  /** Change against the previous close in percent (Yahoo `chartPreviousClose`). */
  changePct(symbol: string): number {
    const s = this.streams.get(symbol);
    if (!s) return 0;
    const last = s.candles.at(-1)?.c ?? s.price;
    if (s.prevClose) return ((last - s.prevClose) / s.prevClose) * 100;
    const first = s.candles[0];
    if (!first || !first.o) return 0;
    return ((last - first.o) / first.o) * 100;
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
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.socket?.close();
    this.socket = null;
    this.streams.clear();
  }
}
