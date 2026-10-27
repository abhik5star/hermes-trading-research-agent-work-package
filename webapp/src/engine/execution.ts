import type { TwapSlice } from './types';
import { gaussian, mulberry32, uid } from './rng';

// ───────────────────────────────────────────────────────────────────────────
// Institutional execution module — TWAP/VWAP iceberg slicing with a live
// slippage-optimisation counter, plus the Black Swan Insurance Vault hedge
// manager.
// ────────────────────────────────────────────────────────────────────

export interface ExecutionOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  totalQty: number;
  algo: 'TWAP' | 'VWAP';
  benchmarkPrice: number;
  filledQty: number;
  avgPrice: number;
  slices: TwapSlice[];
  done: boolean;
}

export class ExecutionEngine {
  orders: ExecutionOrder[] = [];
  totalSaved = 0; // ₹
  hedgeActive = false;
  hedgeLabel = '';
  private counter = 0;

  createOrder(symbol: string, side: 'BUY' | 'SELL', totalQty: number, price: number, algo: 'TWAP' | 'VWAP' = 'TWAP'): ExecutionOrder {
    const order: ExecutionOrder = {
      id: uid('ord'),
      symbol,
      side,
      totalQty,
      algo,
      benchmarkPrice: price,
      filledQty: 0,
      avgPrice: 0,
      slices: [],
      done: false,
    };
    this.orders.unshift(order);
    if (this.orders.length > 6) this.orders.pop();
    return order;
  }

  /** Advance one micro-slice; market impact grows with order size. */
  fillNext(order: ExecutionOrder): TwapSlice | null {
    if (order.done) return null;
    const remaining = order.totalQty - order.filledQty;
    const sliceQty = Math.min(remaining, Math.max(1, Math.round(order.totalQty / 6)));
    const rand = mulberry32(this.counter++ * 7919 + Math.floor(order.benchmarkPrice));
    // Iceberg slicing keeps impact near zero vs a market-order impact model
    const impact = (Math.abs(gaussian(rand)) * 0.0006 * order.totalQty) / (sliceQty * 8);
    const price = order.benchmarkPrice * (1 + (order.side === 'BUY' ? impact : -impact));
    const slice: TwapSlice = {
      id: order.slices.length + 1,
      t: Date.now(),
      qty: sliceQty,
      price,
      venue: order.algo === 'TWAP' ? (this.counter % 3 === 0 ? 'ICEBERG' : 'TWAP') : 'VWAP',
    };
    order.slices.push(slice);
    const value = order.avgPrice * order.filledQty + price * sliceQty;
    order.filledQty += sliceQty;
    order.avgPrice = value / order.filledQty;
    if (order.filledQty >= order.totalQty) {
      order.done = true;
      // Counterfactual: market order would have paid ~0.18% impact on this size
      const marketImpact = order.benchmarkPrice * 0.0018 * order.totalQty;
      const actualImpact = Math.abs(order.avgPrice - order.benchmarkPrice) * order.totalQty;
      this.totalSaved += Math.max(0, marketImpact - actualImpact);
    }
    return slice;
  }

  deployHedge(label: string): void {
    this.hedgeActive = true;
    this.hedgeLabel = label;
  }

  releaseHedge(): void {
    this.hedgeActive = false;
    this.hedgeLabel = '';
  }
}
