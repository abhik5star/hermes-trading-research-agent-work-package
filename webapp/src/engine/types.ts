// ───────────────────────────────────────────────────────────────────────────
// Shared domain types for the Hermes Neural Trading Brain engine.
// Everything here is framework-agnostic (no React) so the brain can run in a
// Web Worker, Node process, or behind a live WebSocket adapter later.
// ───────────────────────────────────────────────────────────────────────────

export type AssetClass = 'equity' | 'index' | 'crypto';
export type Vehicle = 'spot' | 'futures' | 'options';
export type OptionKind = 'CE' | 'PE';

export type AppMode = 'backtest' | 'paper' | 'live' | 'timemachine';
export type Regime = 'trend' | 'sideways' | 'whale-breakout';
export type MascotMood = 'idle' | 'sleeping' | 'happy' | 'angry' | 'zen' | 'alert';
export type Side = 'BUY' | 'SELL' | 'HOLD';

export interface Instrument {
  symbol: string;
  display: string;
  assetClass: AssetClass;
  vehicle: Vehicle;
  exchange: 'NSE' | 'BINANCE';
  basePrice: number;
  /** annualised volatility used by the synthetic feed */
  vol: number;
  tickSize: number;
  lotSize: number;
  optionKind?: OptionKind;
  strike?: number;
  underlying?: string;
  expiry?: string;
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Tick {
  symbol: string;
  t: number;
  price: number;
  qty: number;
  side: 'bid' | 'ask';
}

export interface BookLevel {
  price: number;
  qty: number;
  iceberg?: boolean;
}

export interface OrderBook {
  bids: BookLevel[];
  asks: BookLevel[];
  fundingRate?: number;
  pcr?: number;
  oiChangePct?: number;
}

// ── SMC / ICT structural primitives ────────────────────────────────────────

export type ZoneKind =
  | 'BOS'
  | 'CHoCH'
  | 'MSS'
  | 'FVG'
  | 'order-block'
  | 'buyside-liq'
  | 'sellside-liq'
  | 'premium'
  | 'discount';

export interface StructuralZone {
  id: string;
  kind: ZoneKind;
  bias: 'bullish' | 'bearish' | 'neutral';
  priceHigh: number;
  priceLow: number;
  t: number;
  strength: number; // 0..1
  mitigated: boolean;
}

export interface LiquiditySweep {
  id: string;
  side: 'buyside' | 'sellside';
  price: number;
  t: number;
  intensity: number; // particle wave magnitude 0..1
}

export interface ConfluenceCell {
  t: number;
  price: number;
  glow: number; // 0..1 — hidden indicator alignment heat
  label: string;
}

// ── Time Machine ───────────────────────────────────────────────────────────

export type PathId = 'A' | 'B' | 'C';

export interface FuturePath {
  id: PathId;
  bias: 'bullish' | 'neutral' | 'bearish';
  points: { t: number; price: number }[];
  probability: number; // 0..100
  catalyst: string;
}

// ── Trading / risk ─────────────────────────────────────────────────────────

export interface Position {
  id: string;
  symbol: string;
  side: Side;
  qty: number;
  entry: number;
  current: number;
  stop: number;
  chandelier: number;
  pnl: number;
  pnlPct: number;
  openedAt: number;
  strategy: string;
  hedge?: boolean;
}

export interface TradeRecord extends Position {
  exit: number;
  closedAt: number;
  outcome: 'win' | 'loss' | 'scratch';
  reason: string;
}

export interface PostMortem {
  id: string;
  asset: string;
  action: string;
  outcome: string;
  mistake: string;
  correction: string;
  previousProbability: number;
  newProbability: number;
  delta: number;
  at: number;
}

// ── Strategy Hatchery ──────────────────────────────────────────────────────

export interface StrategyGenome {
  id: string;
  generation: number;
  codename: string;
  donchianPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  fvgDepth: number;
  supertrendMult: number;
  emaFast: number;
  emaSlow: number;
}

export type PodStatus =
  | 'Evolving Parameters…'
  | 'Cross-Validating…'
  | 'Highly Profitable — Promoting to Active'
  | 'Failed Risk Test — Terminated & Discarded'
  | 'Active in Execution Engine';

export interface StrategyPod {
  genome: StrategyGenome;
  status: PodStatus;
  winRate: number;
  profitFactor: number;
  fitness: number; // 0..1 wheel fill
  trades: number;
  maxDrawdown: number;
  promoted: boolean;
  terminated: boolean;
  bornAt: number;
}

export interface FitCell {
  strategyId: string;
  symbol: string;
  fit: number; // 0..100
  pnl: number;
  pf: number;
}

// ── Options / Greeks ───────────────────────────────────────────────────────

export interface GreekRow {
  strike: number;
  kind: OptionKind;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  oi: number;
  oiChangePct: number;
  gammaBlast?: number; // 0..1
}

// ── Notifications / telemetry ──────────────────────────────────────────────

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'whale' | 'hedge';

export interface BrainAlert {
  id: string;
  tone: AlertTone;
  title: string;
  body: string;
  at: number;
  read: boolean;
}

export interface ChatLine {
  id: string;
  from: 'mascot' | 'user';
  text: string;
  at: number;
}

export interface DarkPoolZone {
  id: string;
  price: number;
  intensity: number;
  side: Side;
  t: number;
}

export interface TwapSlice {
  id: number;
  t: number;
  qty: number;
  price: number;
  venue: 'TWAP' | 'VWAP' | 'ICEBERG';
}

export interface FlashReport {
  query: string;
  parsed: string;
  winRate: number;
  profitFactor: number;
  trades: number;
  expectancy: number;
  recommendation: 'GO' | 'NO-GO';
  at: number;
}

export interface GapForecast {
  gapPct: number;
  direction: 'GAP-UP' | 'GAP-DOWN' | 'FLAT-OPEN';
  giftNifty: number;
  spx: number;
  nasdaq: number;
  dow: number;
  pcr: number;
  maxPainShift: number;
  blockFlow: number;
  zones: { label: string; price: number }[];
  at: number;
}
