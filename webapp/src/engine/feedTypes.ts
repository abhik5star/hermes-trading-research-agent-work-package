import type { BookLevel, Candle, OrderBook, Tick } from './types';
import type { Listener } from './EventEmitter';

/**
 * Shared feed contracts.
 *
 * Every adapter — the local simulator, the Binance public WebSocket and the
 * Yahoo Finance bridge — implements exactly this surface, so the trading
 * brain never has to know where a candle came from.
 */
export interface FeedEvents {
  tick: Tick;
  candle: { symbol: string; candle: Candle; rolled: boolean };
  whale: { symbol: string; side: 'bid' | 'ask'; magnitude: number; t: number };
  book: { symbol: string; book: OrderBook };
}

export interface FeedAdapter {
  readonly name: string;
  getCandles(symbol: string): Candle[];
  getPrice(symbol: string): number;
  getBook(symbol: string): OrderBook;
  getMark(symbol: string): number;
  /**
   * Percentage change of the instrument over its reference window —
   * 24 h for live adapters (Binance `P`, Yahoo previous close) and the
   * loaded session window for the simulator. Always expressed in percent.
   */
  changePct(symbol: string): number;
  getAllMarks(): Record<string, number>;
  destroy(): void;
}

/**
 * The surface the trading brain actually needs: the adapter contract plus
 * lazy stream boot, the rolling volume average and the event bus.
 */
export interface TradingFeed extends FeedAdapter {
  ensureStream(symbol: string): void;
  volumeAverage(symbol: string): number;
  on<K extends keyof FeedEvents>(event: K, fn: Listener<FeedEvents[K]>): () => void;
  off<K extends keyof FeedEvents>(event: K, fn: Listener<FeedEvents[K]>): void;
  emit<K extends keyof FeedEvents>(event: K, payload: FeedEvents[K]): void;
}

export type { BookLevel, Candle, OrderBook, Tick };

/** Connection state shared by every live adapter. */
export type FeedStatus = 'idle' | 'connecting' | 'live' | 'error' | 'unsupported';

export interface FeedStatusReport {
  source: string;
  status: FeedStatus;
  detail: string;
  symbols: string[];
  lastMessageAt: number | null;
}
