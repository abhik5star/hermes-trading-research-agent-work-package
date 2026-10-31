import { Emitter } from './EventEmitter';
import { SimulatedFeed } from './marketFeed';
import { BinanceWsFeed } from './feeds/binanceWs';
import { YahooFeed } from './feeds/yahooFeed';
import type { Candle, OrderBook } from './types';
import type { FeedEvents, FeedStatusReport } from './feedTypes';

/**
 * Composite feed — the single source of candles for the whole app.
 *
 * Every symbol is served by the local simulator **unless** a live adapter has
 * data for it:
 *
 *   • Binance public WebSocket → crypto spot / USD-M futures
 *   • Yahoo Finance bridge     → NSE indices and stocks
 *
 * Per-symbol fallback means a blocked network, a missing symbol or a dead
 * socket never breaks the dashboard: that symbol simply keeps running on the
 * simulated stream while the rest go live.
 *
 * Live adapters only ever read **public market data**. There is no order
 * endpoint and no brokerage credential anywhere in this path.
 */

export type LiveSource = 'binance' | 'yahoo';

const LIVE_SOURCES = new Set<LiveSource>(['binance', 'yahoo']);

export class CompositeFeed extends Emitter<FeedEvents> {
  readonly name = 'composite (simulated + binance ws + yahoo bridge)';

  private simulated = new SimulatedFeed();
  private binance = new BinanceWsFeed();
  private yahoo = new YahooFeed(
    typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_YAHOO_WS_URL as string | undefined) : undefined,
  );
  /** Symbols currently served by a live adapter. */
  private live = new Set<string>();
  private enabled = new Set<LiveSource>();
  private started = false;

  constructor() {
    super();
    // Forward the simulator, but drop events for symbols a live adapter owns.
    this.simulated.on('candle', (e) => { if (!this.isLive(e.symbol)) this.emit('candle', e); });
    this.simulated.on('tick', (e) => { if (!this.isLive(e.symbol)) this.emit('tick', e); });
    this.simulated.on('book', (e) => { if (!this.isLive(e.symbol)) this.emit('book', e); });
    this.simulated.on('whale', (e) => { if (!this.isLive(e.symbol)) this.emit('whale', e); });

    // Live adapter events are always forwarded (they own their symbol).
    this.binance.on('candle', (e) => { this.live.add(e.symbol); this.emit('candle', e); });
    this.binance.on('tick', (e) => this.emit('tick', e));
    this.binance.on('book', (e) => this.emit('book', e));
    this.yahoo.on('candle', (e) => { this.live.add(e.symbol); this.emit('candle', e); });
    this.yahoo.on('tick', (e) => this.emit('tick', e));
    this.yahoo.on('book', (e) => this.emit('book', e));

    // Live public market data is ON by default. Both sources are keyless and
    // read-only; anything unreachable simply stays on the simulator.
    this.setSource('binance', true);
    this.setSource('yahoo', true);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.simulated.start();
  }

  /** Turn a live source on or off. */
  setSource(source: LiveSource, enabled: boolean): void {
    if (!LIVE_SOURCES.has(source)) return;
    if (enabled) {
      this.enabled.add(source);
      // Adopt every symbol the source can serve.
      for (const symbol of this.knownSymbols()) {
        if (this.supports(source, symbol)) void this.adopt(source, symbol);
      }
    } else {
      this.enabled.delete(source);
      for (const symbol of [...this.live]) {
        if (!this.servedByEnabledAdapter(symbol)) this.live.delete(symbol);
      }
    }
  }

  isSourceEnabled(source: LiveSource): boolean {
    return this.enabled.has(source);
  }

  private knownSymbols(): string[] {
    const set = new Set<string>();
    for (const symbol of this.simulated.getAllMarks ? Object.keys(this.simulated.getAllMarks()) : []) set.add(symbol);
    return [...set];
  }

  private supports(source: LiveSource, symbol: string): boolean {
    return source === 'binance' ? BinanceWsFeed.supports(symbol) : YahooFeed.supports(symbol);
  }

  private servedByEnabledAdapter(symbol: string): boolean {
    for (const source of this.enabled) {
      if (this.supports(source, symbol)) return true;
    }
    return false;
  }

  private async adopt(source: LiveSource, symbol: string): Promise<void> {
    const adapter = source === 'binance' ? this.binance : this.yahoo;
    await adapter.subscribe(symbol);
    if (adapter.hasData(symbol)) this.live.add(symbol);
  }

  /** Live status for every adapter — surfaced in Settings → Data Connections. */
  statusReports(): FeedStatusReport[] {
    return [
      { source: 'simulated', status: 'live', detail: 'Deterministic local generator (always available)', symbols: [], lastMessageAt: null },
      this.binance.statusReport(),
      this.yahoo.statusReport(),
    ];
  }

  isLive(symbol: string): boolean {
    return this.live.has(symbol);
  }

  /** Which adapter is actually serving a symbol right now. */
  sourceFor(symbol: string): 'simulated' | 'binance' | 'yahoo' {
    if (!this.live.has(symbol)) return 'simulated';
    if (this.binance.hasData(symbol)) return 'binance';
    if (this.yahoo.hasData(symbol)) return 'yahoo';
    return 'simulated';
  }

  liveSymbolCount(): number {
    return this.live.size;
  }

  /** Boot the simulated stream for a symbol and adopt it live when possible. */
  ensureStream(symbol: string): void {
    this.simulated.ensureStream(symbol);
    for (const source of this.enabled) {
      if (this.supports(source, symbol)) void this.adopt(source, symbol);
    }
  }

  getCandles(symbol: string): Candle[] {
    if (this.live.has(symbol)) {
      const live = this.binance.getCandles(symbol).length ? this.binance.getCandles(symbol) : this.yahoo.getCandles(symbol);
      if (live.length) return live;
    }
    return this.simulated.getCandles(symbol);
  }

  getPrice(symbol: string): number {
    if (this.live.has(symbol)) {
      const p = this.binance.getPrice(symbol) || this.yahoo.getPrice(symbol);
      if (p) return p;
    }
    return this.simulated.getPrice(symbol);
  }

  getBook(symbol: string): OrderBook {
    if (this.live.has(symbol)) {
      const b = this.binance.getBook(symbol);
      if (b.bids.length || b.asks.length) return b;
      const y = this.yahoo.getBook(symbol);
      if (y.bids.length || y.asks.length) return y;
    }
    return this.simulated.getBook(symbol);
  }

  getMark(symbol: string): number {
    if (this.live.has(symbol)) {
      const m = this.binance.getMark(symbol) || this.yahoo.getMark(symbol);
      if (m) return m;
    }
    return this.simulated.getMark(symbol);
  }

  getAllMarks(): Record<string, number> {
    return { ...this.simulated.getAllMarks(), ...this.binance.getAllMarks(), ...this.yahoo.getAllMarks() };
  }

  volumeAverage(symbol: string): number {
    if (this.live.has(symbol)) {
      const v = this.binance.volumeAverage(symbol);
      if (v > 1) return v;
      const y = this.yahoo.volumeAverage(symbol);
      if (y > 1) return y;
    }
    return this.simulated.volumeAverage(symbol);
  }

  destroy(): void {
    this.binance.destroy();
    this.yahoo.destroy();
    this.simulated.destroy();
  }
}

/** The app-wide feed singleton. */
export const feed = new CompositeFeed();
