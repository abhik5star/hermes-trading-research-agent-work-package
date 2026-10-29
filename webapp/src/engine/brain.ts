import type {
  AppMode, BrainAlert, ChatLine, ConfluenceCell, DarkPoolZone, FitCell, FlashReport, FuturePath,
  GapForecast, GreekRow, LiquiditySweep, MascotMood, Position,
  PostMortem, Regime, StructuralZone, TradeRecord,
} from './types';
import { feed } from './liveFeed';
import type { TradingFeed } from './feedTypes';
import { FOCUS_SYMBOLS, UNIVERSE, instrument } from './instruments';
import { SmcEngine, type SmcSnapshot } from './smcEngine';
import { snapshotIndicators, type HiddenIndicatorSnapshot } from './indicators';
import { computeConfluence, type ConfluenceResult } from './confluence';
import { TimeMachine } from './timeMachine';
import { runMonteCarlo, type MonteCarloTree } from './monteCarlo';
import { buildChain, detectGammaBlast } from './greeks';
import { RiskEngine } from './riskEngine';
import { StrategyHatchery } from './hatchery';
import { SandboxEngine } from './sandbox';
import { RegimeSwitcher } from './regime';
import { DarkLiquidityTracker } from './darkLiquidity';
import { ZenGuard } from './zenGuard';
import { ExecutionEngine } from './execution';
import { seedPostMortems, postMortemFromTrade } from './learningLog';
import { executeFlashTest } from './flashBacktest';
import { buildGapForecast } from './gapPredictor';
import { Emitter } from './EventEmitter';
import { clamp, uid } from './rng';

export interface ThemeState {
  token: 'cinematic' | 'deep-focus' | 'zen' | 'violet' | 'amber' | 'whale-green' | 'whale-red' | 'panic';
  until: number;
}

export interface BrainSnapshot {
  mode: AppMode;
  focusSymbol: string;
  price: number;
  prevPrice: number;
  bias: SmcSnapshot['bias'];
  lastEvent: string;
  inPremium: boolean;
  inDiscount: boolean;
  equilibrium: number;
  zones: StructuralZone[];
  sweeps: LiquiditySweep[];
  confluenceCells: ConfluenceCell[];
  confluenceScore: number;
  hiddenConfirmations: string[];
  paths: FuturePath[];
  monteCarlo: MonteCarloTree | null;
  greeks: GreekRow[];
  gammaBlast: { blast: boolean; score: number; strike: number | null };
  darkZones: DarkPoolZone[];
  positions: Position[];
  recentTrades: TradeRecord[];
  postMortems: PostMortem[];
  risk: RiskEngine['state'];
  pods: StrategyHatchery['pods'];
  activeGenome: StrategyHatchery['active'];
  fitMatrix: FitCell[];
  topFits: FitCell[];
  sandbox: { total: number; open: number; pnl: number };
  regime: Regime;
  optionSelling: boolean;
  alerts: BrainAlert[];
  chat: ChatLine[];
  mood: MascotMood;
  zen: ZenGuard['state'];
  flashReports: FlashReport[];
  gapForecast: GapForecast | null;
  execution: { orders: ExecutionEngine['orders']; saved: number; hedgeActive: boolean; hedgeLabel: string };
  confidence: number;
  neuralStatus: 'Active' | 'Idle';
  neuralAction: Position['side'];
  theme: ThemeState;
  glance: { goal: string; safety: string; healthPct: number; healthPnl: number };
  lockdown: boolean;
  dataAdapter: string;
  heartbeat: number;
}

interface BrainEvents {
  commit: BrainSnapshot;
  alert: BrainAlert;
  chat: ChatLine;
  theme: ThemeState;
}

const PROACTIVE_LINES = [
  'Bhai, structure clean hai — confluence glow build ho raha hai, entry lene se pehle Time Machine ka Path A confirm kar raha hoon.',
  'Silent indicators sab background mein chal rahe hain — chart clutter-free rakha hai, sirf glow heatmap pe trust karo.',
  'Discount zone mein price hai, premium zone mein chase entry ko neural policy veto kar degi. Patience.',
  'Sandbox mein 300+ instruments parallel paper-trade ho rahe hain — jab perfect fit lock hoga, main turant bataunga.',
  'Risk engine har tick pe Chandelier trail kar raha hai. 2% daily drawdown pe dashboard automatically lock ho jayega.',
];

export class Brain extends Emitter<BrainEvents> {
  mode: AppMode = 'paper';
  focusSymbol = FOCUS_SYMBOLS[0];
  private smc = new Map<string, SmcEngine>();
  private indicators = new Map<string, HiddenIndicatorSnapshot>();
  private confluence = new Map<string, ConfluenceResult>();
  private timeMachine = new TimeMachine();
  private paths: FuturePath[] = [];
  private monteCarlo: MonteCarloTree | null = null;
  private greeks: GreekRow[] = [];
  private gammaBlast = { blast: false, score: 0, strike: null as number | null, blastAt: 0 };
  private gammaArmed = true;
  private dark = new DarkLiquidityTracker();
  risk = new RiskEngine();
  hatchery = new StrategyHatchery();
  sandbox: SandboxEngine;
  private regimeSwitch = new RegimeSwitcher();
  zen = new ZenGuard();
  execution = new ExecutionEngine();
  positions: Position[] = [];
  recentTrades: TradeRecord[] = [];
  postMortems: PostMortem[] = seedPostMortems();
  alerts: BrainAlert[] = [];
  chat: ChatLine[] = [];
  mood: MascotMood = 'idle';
  theme: ThemeState = { token: 'cinematic', until: 0 };
  flashReports: FlashReport[] = [];
  gapForecast: GapForecast | null = null;
  confidence = 72;
  neuralAction: Position['side'] = 'HOLD';
  private prevPrice = 0;
  private lastTradeEval = 0;
  private lastGaTick = 0;
  private lastMcTick = 0;
  private lastPathTick = 0;
  private lastGreekTick = 0;
  private lastProactive = 0;
  private lastHedgeCheck = 0;
  private probabilityRef = 82;
  private heartbeat = 0;
  private lastCommit = 0;
  private optionBasis = new Map<string, { base: number; entry: number; beta: number }>();
  private lastFitBroadcast = 0;
  private lastFitKey = '';
  private lastWinAt = 0;
  private lastLossAt = 0;
  private lastAlertAt = 0;
  private lastWhaleAt = 0;
  private lastPositionActivity = Date.now();
  private lastMood: MascotMood = 'idle';

  constructor(private feedInstance: TradingFeed) {
    super();
    for (const s of FOCUS_SYMBOLS) this.smc.set(s, new SmcEngine());
    this.sandbox = new SandboxEngine(() => [this.hatchery.active, ...this.hatchery.pods.map((p) => p.genome).slice(0, 2)]);
    this.attachFeed();
    const bootSmc = this.smcFor(this.focusSymbol).update(this.feedInstance.getCandles(this.focusSymbol));
    this.gapForecast = buildGapForecast(bootSmc, this.feedInstance.getPrice(this.focusSymbol));
    this.refreshPaths(true);
    this.say('System boot complete. Neural SMC/ICT engine online — sab feeds live hain, calm ho ke dashboard dekho.');
  }

  private smcFor(symbol: string): SmcEngine {
    return this.smc.get(symbol)!;
  }

  private attachFeed(): void {
    this.feedInstance.on('candle', ({ symbol, rolled }) => {
      if (!this.smc.has(symbol)) return;
      const candles = this.feedInstance.getCandles(symbol);
      const smcEngine = this.smcFor(symbol);
      const smcSnap = smcEngine.update(candles);
      smcEngine.tagDealingRange(smcSnap.dealingHigh, smcSnap.dealingLow, Date.now());
      const ind = snapshotIndicators(candles);
      this.indicators.set(symbol, ind);
      this.confluence.set(symbol, computeConfluence(candles, smcSnap, ind));
      if (rolled) this.handleRolledCandle(symbol, ind);
      this.requestCommit();
    });

    this.feedInstance.on('whale', ({ symbol, side, magnitude }) => {
      if (symbol !== this.focusSymbol) return;
      const ind = this.indicators.get(symbol);
      const book = this.feedInstance.getBook(symbol);
      const trigger = this.dark.detectWhaleTrigger({
        volume: this.feedInstance.volumeAverage(symbol) * (3 + magnitude),
        avgVolume20: this.feedInstance.volumeAverage(symbol),
        donchianExpanding: ind ? !ind.donchian.flat : true,
        pcrShift: book.pcr ?? 0,
        oiChangePct: book.oiChangePct ?? 0,
        brokePoc: magnitude > 0.7,
      });
      const event = this.regimeSwitch.evaluate(ind ?? snapshotIndicators(this.feedInstance.getCandles(symbol)), trigger, Date.now());
      if (event?.to === 'whale-breakout') {
        this.lastWhaleAt = Date.now();
        this.flashTheme(side === 'ask' ? 'whale-green' : 'whale-red', 5000);
        this.escapeWhale(side);
        this.pushAlert('whale', 'Whale Breakout Escape Engine fired', trigger.reasons.join(' · '));
      }
    });

    this.feedInstance.on('book', ({ symbol, book }) => {
      if (symbol !== this.focusSymbol) return;
      const zone = this.dark.observe(book.bids, book.asks, this.feedInstance.getPrice(symbol), Date.now());
      if (zone) {
        this.pushAlert(
          'info',
          `Dark-pool ${zone.side === 'BUY' ? 'absorption' : 'distribution'} detected`,
          `Iceberg fragmentation resting at ${Math.round(zone.price)} — nebula intensity ${(zone.intensity * 100).toFixed(0)}%`,
        );
      }
    });
  }

  // ── Mode / focus controls ───────────────────────────────────────────────

  setMode(mode: AppMode): void {
    this.mode = mode;
    const lines: Record<AppMode, string> = {
      backtest: 'Backtesting Mode active — historical replay chal raha hai, naye autonomous orders suspended hain.',
      paper: 'Paper Trading Mode — zero real capital, full neural execution. Safe learning zone.',
      live: 'Live Neural Monitoring ON — every execution ab real intent ke sath trace ho raha hai, risk deck armed.',
      timemachine: 'Time Machine Mode ON — teen highest-probability future paths holographic grid pe render ho rahe hain.',
    };
    this.say(lines[mode]);
    if (mode === 'timemachine') this.refreshPaths(true);
    this.requestCommit(true);
  }

  setFocus(symbol: string): void {
    if (!UNIVERSE.some((i) => i.symbol === symbol)) return;
    // Symbols outside the boot focus set get a stream + SMC engine on demand.
    if (!this.smc.has(symbol)) {
      this.feedInstance.ensureStream(symbol);
      this.smc.set(symbol, new SmcEngine());
    }
    this.focusSymbol = symbol;
    this.greeks = [];
    this.refreshPaths(true);
    this.say(`Focus switched to ${instrument(symbol).display} — SMC structure aur hidden confluence rescanning.`);
    this.requestCommit(true);
  }

  // ── Candle roll: regime, GA, sandbox, hedge, MC cadence ─────────────────

  private handleRolledCandle(symbol: string, ind: HiddenIndicatorSnapshot): void {
    const candles = this.feedInstance.getCandles(symbol);
    const smcSnap = this.smcFor(symbol).update(candles);
    const whale = this.dark.detectWhaleTrigger({
      volume: candles.at(-1)!.v,
      avgVolume20: this.feedInstance.volumeAverage(symbol),
      donchianExpanding: !ind.donchian.flat,
      pcrShift: this.feedInstance.getBook(symbol).pcr ?? 0,
      oiChangePct: this.feedInstance.getBook(symbol).oiChangePct ?? 0,
      brokePoc: false,
    });
    const event = this.regimeSwitch.evaluate(ind, whale, Date.now());
    this.regimeSwitch.decay(Date.now());
    if (event?.to === 'sideways') {
      this.flashTheme('violet', 12000);
      this.openOptionSelling();
      this.pushAlert('info', 'Regime switch — Sideways Option Selling', 'Flat Donchian + neutral Supertrend: delta-neutral theta harvest engaged.');
    }

    const now = Date.now();
    if (now - this.lastGaTick > 14_000) {
      this.lastGaTick = now;
      this.runGaTick();
    }
    if (now - this.lastMcTick > 30_000) {
      this.lastMcTick = now;
      this.monteCarlo = runMonteCarlo(candles);
    }
    if (now - this.lastPathTick > 3_000 || this.mode === 'timemachine') {
      this.lastPathTick = now;
      this.refreshPaths(false);
    }
    if (now - this.lastGreekTick > 2_500) {
      this.lastGreekTick = now;
      this.refreshGreeks(symbol);
    }
    if (now - this.lastHedgeCheck > 20_000) {
      this.lastHedgeCheck = now;
      this.checkOvernightHedge();
    }
    if (now - this.lastProactive > 24_000) {
      this.lastProactive = now;
      this.say(PROACTIVE_LINES[Math.floor(Math.random() * PROACTIVE_LINES.length)]);
    }
  }

  private runGaTick(): void {
    const before = this.hatchery.active.id;
    const result = this.hatchery.evolve();
    this.sandbox.syncStrategies();
    if (result.promoted && result.promoted.genome.id !== before) {
      const pod = result.promoted;
      this.flashTheme('whale-green', 6000);
      this.pushAlert('success', 'Strategy promoted into Execution Engine', `${pod.genome.codename} — win rate ${(pod.winRate * 100).toFixed(1)}%, PF ${pod.profitFactor.toFixed(2)}`);
      this.say(`Bhai, kamaal ho gaya! Background Lab mein ${pod.genome.codename} ne ${pod.genome.generation} generations ke baad strong cross-validation pass kiya. Purani strategy ko khud modify karke Live Neural Mode mein update kar diya — Hatchery Lab check karo!`);
    }
  }

  // ── Time Machine / Greeks ───────────────────────────────────────────────

  private refreshPaths(force: boolean): void {
    const candles = this.feedInstance.getCandles(this.focusSymbol);
    const smcSnap = this.smcFor(this.focusSymbol).update(candles);
    const ind = this.indicators.get(this.focusSymbol) ?? snapshotIndicators(candles);
    if (force || candles.length) this.paths = this.timeMachine.project(candles, smcSnap, ind);
    const bull = this.paths.find((p) => p.id === 'A')?.probability ?? 50;
    const bear = this.paths.find((p) => p.id === 'C')?.probability ?? 30;
    const conf = (this.confluence.get(this.focusSymbol)?.score ?? 50) * 0.6 + bull * 0.4 - (smcSnap.inPremium ? 6 : 0);
    this.confidence = Math.round(clamp(conf + (bull - bear) * 0.15, 5, 98));
  }

  private refreshGreeks(symbol: string): void {
    const inst = instrument(symbol);
    const spot = this.feedInstance.getPrice(symbol);
    const step = inst.assetClass === 'crypto' ? 1000 : Math.max(50, Math.round(spot * 0.004));
    this.greeks = buildChain(spot, step, 4, 0.13 + Math.random() * 0.04, Math.random);
    const detected = detectGammaBlast(this.greeks);
    const wasBlasting = this.gammaBlast.blast;
    // Hysteresis: arm on a strong (>0.82) surge, only clear once momentum
    // cools below 0.5, so noisy chains don't flap the alert state.
    let blasting = wasBlasting;
    if (!wasBlasting && detected.blast && this.gammaArmed) {
      blasting = true;
      this.gammaArmed = false;
    } else if (wasBlasting && detected.score < 0.5) {
      blasting = false;
      this.gammaArmed = true;
    }
    this.gammaBlast = {
      blast: blasting,
      score: detected.score,
      strike: detected.strike,
      blastAt: blasting && !wasBlasting ? Date.now() : this.gammaBlast.blastAt,
    };
    const blast = this.gammaBlast;
    if (blast.blast && !wasBlasting) {
      this.flashTheme('amber', 6000);
      this.pushAlert('warning', 'Gamma Blast radar lock', `Accelerating gamma + OI surge near ATM strike ${blast.strike}. Multi-lot gamma buying armed.`);
      this.say('Bhai, Gamma Blast alert! Delta rapidly accelerate ho raha hai ATM strikes pe — option selling hedge di gayi, high-momentum Gamma Buying Mode mein ghus rahe hain!');
      this.executeGammaBlastTrade(blast.strike);
    }
  }

  /** Multi-lot option buying the instant gamma explodes near ATM. */
  private executeGammaBlastTrade(strike: number | null): void {
    if (this.risk.state.locked || this.zen.isLocked() || this.mode === 'backtest') return;
    if (this.positions.length >= 3) return;
    const ind = this.indicators.get(this.focusSymbol);
    const call = (ind?.trendAlignment ?? 1) >= 0;
    const inst = instrument(this.focusSymbol);
    const kind = call ? 'CE' : 'PE';
    const symbol = inst.exchange === 'NSE'
      ? `${inst.display.split(' ')[0].replace('Nifty', 'NIFTY').replace('Bank', 'BANKNIFTY')} ${strike ?? Math.round(this.feedInstance.getPrice(this.focusSymbol))} ${kind}`
      : `${inst.display.split(' ')[0]} ${strike ?? 68000} ${kind}`;
    const premium = Math.max(28, this.feedInstance.getPrice(this.focusSymbol) * 0.008);
    const pos: Position = {
      id: uid('pos'),
      symbol,
      side: 'BUY',
      qty: inst.lotSize * 3, // multi-lot gamma ride
      entry: premium,
      current: premium,
      stop: premium * 0.72,
      chandelier: premium * 0.8,
      pnl: 0,
      pnlPct: 0,
      openedAt: Date.now(),
      strategy: 'Gamma-Blast Momentum Buy',
    };
    this.positions.push(pos);
    this.lastPositionActivity = Date.now();
    this.optionBasis.set(pos.id, { base: this.feedInstance.getPrice(this.focusSymbol), entry: premium, beta: 9 });
    this.execution.createOrder(symbol, 'BUY', pos.qty, premium, 'VWAP');
    this.pushAlert('success', 'Multi-lot option buying executed', `${symbol} × ${pos.qty} — trailing stop armed to protect capital`);
  }

  // ── Autonomous execution ────────────────────────────────────────────────

  tick(): void {
    this.heartbeat++;
    const now = Date.now();
    this.sandbox.step(this.feedInstance.getAllMarks());
    this.managePositions();
    this.fillExecutionOrders();
    this.broadcastFitLocks(now);
    this.updateMoodAndTheme();
    if (now - this.lastTradeEval > 5_000 && this.mode !== 'backtest') {
      this.lastTradeEval = now;
      this.evaluateAutonomousTrade();
    }
    this.requestCommit();
  }

  private evaluateAutonomousTrade(): void {
    if (this.risk.state.locked || this.zen.isLocked()) return;
    if (this.positions.length >= 3) return;
    const symbol = this.focusSymbol;
    const conf = this.confluence.get(symbol);
    const smcSnap = this.smcFor(symbol).update(this.feedInstance.getCandles(symbol));
    if (!conf || conf.score < 60) {
      this.neuralAction = 'HOLD';
      return;
    }
    const price = this.feedInstance.getPrice(symbol);
    const ind = this.indicators.get(symbol)!;
    const bullish = smcSnap.bias === 'bullish' && !smcSnap.inPremium && ind.trendAlignment > 0;
    const bearish = smcSnap.bias === 'bearish' && !smcSnap.inDiscount && ind.trendAlignment < 0;

    if (bullish && !this.positions.some((p) => p.symbol === symbol)) {
      this.openPosition(symbol, 'BUY', price, conf.score);
    } else if (bearish && !this.positions.some((p) => p.symbol === symbol)) {
      this.openPosition(symbol, 'SELL', price, conf.score);
    }
  }

  private openPosition(symbol: string, side: 'BUY' | 'SELL', price: number, confScore: number): void {
    const inst = instrument(symbol);
    const riskBudget = this.risk.state.equity * 0.008;
    const stopDist = price * this.risk.state.hardStopPct;
    const qty = Math.max(inst.lotSize, Math.round((riskBudget / stopDist) / inst.lotSize) * inst.lotSize);
    const pos: Position = {
      id: uid('pos'),
      symbol,
      side,
      qty,
      entry: price,
      current: price,
      stop: side === 'BUY' ? price * (1 - this.risk.state.hardStopPct) : price * (1 + this.risk.state.hardStopPct),
      chandelier: side === 'BUY' ? price * 0.985 : price * 1.015,
      pnl: 0,
      pnlPct: 0,
      openedAt: Date.now(),
      strategy: this.hatchery.active.codename,
    };
    this.positions.push(pos);
    this.lastPositionActivity = Date.now();
    this.neuralAction = side;
    this.execution.createOrder(symbol, side, qty, price, Math.random() > 0.5 ? 'TWAP' : 'VWAP');
    this.pushAlert('success', `Neural ${side} executed — ${inst.display}`, `${qty} units via iceberg slices · confluence ${confScore}% · ${this.mode.toUpperCase()}`);
    this.say(`Order execute ho gaya: ${side} ${inst.display}, confluence glow strong mila. Hard stop aur Chandelier trail dono armed hain.`);
  }

  private openOptionSelling(): void {
    if (this.positions.some((p) => p.strategy.includes('Theta')) || this.zen.isLocked()) return;
    const symbol = this.focusSymbol.includes('BANK') ? 'BANKNIFTY 51200 CE' : 'NIFTY 24500 CE';
    const price = this.feedInstance.getPrice(this.focusSymbol) * 0.008;
    const pos: Position = {
      id: uid('pos'),
      symbol,
      side: 'SELL',
      qty: 50,
      entry: price,
      current: price,
      stop: price * 1.25,
      chandelier: price * 1.3,
      pnl: 0,
      pnlPct: 0,
      openedAt: Date.now(),
      strategy: 'Theta-Harvest Straddle',
    };
    this.positions.push(pos);
    this.lastPositionActivity = Date.now();
    this.optionBasis.set(pos.id, { base: this.feedInstance.getPrice(this.focusSymbol), entry: price, beta: 6 });
    this.say('Sideways regime confirm — delta-neutral Short Straddle activate, theta decay harvest shuru. Order Block boundaries pe strict monitoring hai.');
  }

  /** Synthetic but directionally-correct premium mark for option positions. */
  private markPosition(p: Position): number {
    if (FOCUS_SYMBOLS.includes(p.symbol)) return this.feedInstance.getPrice(p.symbol);
    const basis = this.optionBasis.get(p.id);
    if (!basis) return p.entry;
    const spot = this.feedInstance.getPrice(this.focusSymbol);
    const indexRet = (spot - basis.base) / basis.base;
    // Long calls/puts are chosen with the position bias; shorts decay via theta drift
    const theta = Math.min(0.35, (Date.now() - p.openedAt) / 900_000);
    const drift = p.strategy.includes('Theta') ? -theta * 0.4 : 0;
    const directional = p.side === 'SELL' ? -indexRet * basis.beta : indexRet * basis.beta;
    return Math.max(0.5, basis.entry * (1 + directional + drift));
  }

  private managePositions(): void {
    if (!this.positions.length) return;
    const candlesBySymbol = new Map(FOCUS_SYMBOLS.map((s) => [s, this.feedInstance.getCandles(s)]));
    this.positions = this.risk.trail(this.positions, candlesBySymbol.get(this.focusSymbol) ?? this.feedInstance.getCandles(this.focusSymbol));
    const remaining: Position[] = [];

    for (const p of this.positions) {
      const price = this.markPosition(p);
      p.current = price;
      const dir = p.side === 'BUY' ? 1 : -1;
      p.pnlPct = dir * ((price - p.entry) / p.entry);
      p.pnl = (price - p.entry) * p.qty * dir;
      const hitStop = this.risk.shouldStop(p);
      const target = p.pnlPct > 0.022;
      const stale = Date.now() - p.openedAt > 90_000;
      if (hitStop || target || stale) {
        this.closePosition(p, hitStop ? 'Hard stop / Chandelier trail breached' : target ? 'Liquidity target reached' : 'Time decay — structure edge faded');
      } else {
        remaining.push(p);
      }
    }
    this.positions = remaining;
  }

  private closePosition(p: Position, reason: string): void {
    const record: TradeRecord = {
      ...p,
      exit: p.current,
      closedAt: Date.now(),
      outcome: p.pnl > 0 ? 'win' : p.pnl < 0 ? 'loss' : 'scratch',
      reason,
    };
    this.lastPositionActivity = Date.now();
    this.recentTrades.unshift(record);
    this.recentTrades = this.recentTrades.slice(0, 24);
    this.risk.applyPnl(record.pnl);
    this.zen.reportTrade(record.outcome);
    if (record.outcome === 'win') this.lastWinAt = Date.now();
    if (record.outcome === 'loss') this.lastLossAt = Date.now();
    const pm = postMortemFromTrade(record, this.probabilityRef);
    this.probabilityRef = pm.newProbability;
    this.postMortems.unshift(pm);
    this.postMortems = this.postMortems.slice(0, 30);

    if (record.outcome === 'win') {
      this.pushAlert('success', 'Target hit — position closed', `${p.symbol} ${p.side} · P&L ₹${Math.round(p.pnl).toLocaleString('en-IN')}`);
      this.say(`Target hit! ${p.symbol} position profit mein close ki — learning log mein naya probability score update ho gaya.`);
    } else if (record.outcome === 'loss') {
      this.pushAlert('danger', 'Stop-loss executed', `${p.symbol} · ${reason}`);
      this.say('Stoploss hit, tension mat lo — strict risk control hi long-term edge hai. Post-mortem log mein mistake aur correction save ho rahi hai.');
    }
    if (this.risk.state.locked) {
      this.pushAlert('danger', 'Daily drawdown lockdown', '2% equity loss breached — all autonomous operations locked for the session.');
    }
  }

  /** Proactive mascot broadcast when the sandbox locks a perfect cross-asset fit. */
  private broadcastFitLocks(now: number): void {
    if (now - this.lastFitBroadcast < 28_000) return;
    const top = this.sandbox.topFits(1)[0];
    if (!top || top.fit < 90) return;
    const key = `${top.strategyId}:${top.symbol}`;
    if (key === this.lastFitKey) return;
    this.lastFitKey = key;
    this.lastFitBroadcast = now;
    const name = this.hatchery.pods.find((p) => p.genome.id === top.strategyId)?.genome.codename ?? this.hatchery.active.codename;
    this.say(`Bhai, kamaal ki news hai! Backstage Sandbox mein ${name} strategy ${top.symbol} ke pattern mein ${top.fit.toFixed(1)}% fit baith gayi hai — automated paper-trading wahan active hai, cross-asset matrix check karo!`);
  }

  private escapeWhale(side: 'bid' | 'ask'): void {
    const shorts = this.positions.filter((p) => p.strategy.includes('Theta') || p.side === 'SELL');
    for (const p of shorts) this.closePosition({ ...p, current: this.markPosition(p) }, 'Whale escape — instant fire-sale of option shorts');
    this.say('Bhai, Whale Alert! Sideways Option Selling instantly square off kar di — massive volume detect hua. AI Brain ab Trend Buying Mode mein switch kar raha, Path A explode kar sakta hai!');
  }

  private fillExecutionOrders(): void {
    for (const order of this.execution.orders) {
      if (!order.done && this.heartbeat % 2 === 0) this.execution.fillNext(order);
    }
  }

  private checkOvernightHedge(): void {
    const old = this.positions.find((p) => Date.now() - p.openedAt > 45_000 && !p.hedge);
    if (old && !this.execution.hedgeActive) {
      old.hedge = true;
      this.execution.deployHedge(`Far-OTM protective ${old.side === 'BUY' ? 'Put' : 'Call'} vs ${old.symbol}`);
      this.pushAlert('hedge', 'Black Swan Insurance Vault armed', this.execution.hedgeLabel);
      this.say('Indian market close ke paas hain — overnight safety ke liye ultra-cheap OTM hedge auto-buy kar liya. Sudden gap-down pe bhi portfolio 100% protected hai.');
    }
    if (!this.positions.length && this.execution.hedgeActive) this.execution.releaseHedge();
  }

  // ── Panic / Zen / Flash / Forecast ──────────────────────────────────────

  panicSquareOff(): void {
    if (!this.positions.length) {
      this.say('Koi open position nahi hai — Emergency Square-Off standby pe hai.');
      return;
    }
    const count = this.positions.length;
    for (const p of [...this.positions]) {
      this.closePosition({ ...p, current: this.markPosition(p) }, 'Emergency Square-Off — manual panic switch');
    }
    this.positions = [];
    this.flashTheme('panic', 5000);
    this.pushAlert('danger', 'Emergency Square-Off executed', `${count} autonomous position(s) flattened at market immediately.`);
    this.say('Sab positions turant square off kar di gayi — dashboard ab fully flat hai. Deep breath, phir strategy review karte hain.');
  }

  releaseZen(): void {
    this.zen.release();
    this.say('Zen Guard release ho gaya — calmer state mein ho, disciplined execution resume.');
    this.requestCommit(true);
  }

  /** Manual acknowledgement of the 2% drawdown circuit breaker. */
  acknowledgeRiskLock(): void {
    this.risk.unlock();
    this.risk.resetDay();
    this.say('Risk circuit breaker acknowledged — naya risk day start, sizing wapas 0.8% equity pe reset.');
    this.requestCommit(true);
  }

  async flashTest(query: string): Promise<FlashReport> {
    this.say('Flash Backtest chal raha hai — 3 saal ki history parallel simulate ho rahi hai, 3 second mein report aati hai.');
    await new Promise((r) => setTimeout(r, 2600));
    const report = executeFlashTest(query);
    this.flashReports.unshift(report);
    this.flashReports = this.flashReports.slice(0, 8);
    this.say(
      `Report ready: Win rate ${(report.winRate * 100).toFixed(1)}%, Profit Factor ${report.profitFactor.toFixed(2)}, ${report.trades} trades. Recommendation: ${report.recommendation}.`,
    );
    this.requestCommit(true);
    return report;
  }

  refreshForecast(): GapForecast {
    const smcSnap = this.smcFor(this.focusSymbol).update(this.feedInstance.getCandles(this.focusSymbol));
    this.gapForecast = buildGapForecast(smcSnap, this.feedInstance.getPrice(this.focusSymbol));
    this.say('Pre-market forecast refresh — GIFT Nifty, globals aur option chain PCR sab merge karke gap zones calculate kar liye.');
    this.requestCommit(true);
    return this.gapForecast;
  }

  // ── Mood / theme ────────────────────────────────────────────────────────

  private updateMoodAndTheme(): void {
    const now = Date.now();
    const confluenceScore = this.confluence.get(this.focusSymbol)?.score ?? 0;
    const quietFor = now - this.lastAlertAt;
    let next: MascotMood;

      if (this.zen.isLocked()) {
        next = 'zen';
      } else {
        const freshBlast = this.gammaBlast.blast && now - this.gammaBlast.blastAt < 9000;
        const freshWhale = now - this.lastWhaleAt < 9000;
        const freshWin = now - this.lastWinAt < 14_000;
        const freshLoss = now - this.lastLossAt < 16_000;
        const lossPressure = this.risk.state.drawdownPct < -0.012;
        const inProfit = this.positions.some((p) => p.pnl > 0);

        // Priority: zen guard → trade outcomes (celebrate / grieve) → short
        // alert bursts → risk anger → contentment → sleep → thought → idle
        if (freshWin) next = 'celebrating';
        else if (freshLoss) next = 'sad';
        else if (freshBlast || freshWhale) next = 'alert';
        else if (lossPressure) next = 'angry';
        else if (inProfit || (this.risk.state.dailyPnl > 0 && this.positions.length > 0)) next = 'happy';
        else if (
          !this.positions.length &&
          now - this.lastPositionActivity > 28_000 &&
          quietFor > 12_000
        ) next = 'sleeping';
        else if (confluenceScore >= 45 && confluenceScore < 68) next = 'thinking';
        else next = 'idle';
      }

    // Mood transitions get a short mascot reflection (no spam — only on change)
    if (next !== this.lastMood) {
      this.lastMood = next;
      this.narrateMood(next);
    }
    this.mood = next;

    if (this.theme.until && now > this.theme.until) {
      this.theme = { token: next === 'sleeping' ? 'deep-focus' : 'cinematic', until: 0 };
    } else if (!this.theme.until) {
      const token = this.regimeSwitch.regime === 'sideways' ? 'violet' : next === 'sleeping' ? 'deep-focus' : 'cinematic';
      if (this.theme.token !== token) this.theme = { token, until: 0 };
    }
  }

  private narrateMood(mood: MascotMood): void {
    const lines: Partial<Record<MascotMood, string>> = {
      sleeping: 'Bohot der se koi strong setup nahi mila — main halka sa power nap le raha hoon. Confluence build hote hi jag jaunga. 😴',
      sad: 'Hmm, ye trade stop pe nikal gaya. Bura mat mano — post-mortem mein mistake save kar li hai, agla entry zyada smart hoga. 😢',
      thinking: 'Ek minute… RSI, Donchian aur SMC zone align ho rahe hain ya nahi, brain confluence calculate kar raha hai. 🤔',
      celebrating: 'YES! Target hit! Ye strategy ka discipline jeeta — ab thodi der victory lap, phir next setup. 🎉',
      happy: 'Positions green chal rahe hain, Chandelier trail tight hai — profit ko protect kar rahe hain. 😊',
      angry: 'Drawdown pressure badh raha hai — main defensive posture mein aa gaya hoon, naye entries freeze. 💢',
      alert: 'Sensors full alert! Whale-grade movement ya gamma explosion — armor mode ON, dekh ke action lunga. ⚡',
      idle: 'Wapas scanning mode pe — market structure ko continuously monitor kar raha hoon.',
    };
    const text = lines[mood];
    if (text) this.say(text);
  }

  flashTheme(token: ThemeState['token'], ms: number): void {
    this.theme = { token, until: Date.now() + ms };
    this.emit('theme', this.theme);
  }

  private setThemeIfOlder(token: ThemeState['token']): void {
    if (this.theme.token !== token) this.theme = { token, until: 0 };
  }

  // ─— Alerts / chat ───────────────────────────────────────────────────────

  private pushAlert(tone: BrainAlert['tone'], title: string, body: string): void {
    // Routine info telemetry (dark-pool whispers) must not keep the falcon
    // awake — only high-signal events reset the idle/sleep timer.
    if (tone !== 'info') this.lastAlertAt = Date.now();
    const alert: BrainAlert = { id: uid('al'), tone, title, body, at: Date.now(), read: false };
    this.alerts.unshift(alert);
    this.alerts = this.alerts.slice(0, 40);
    this.emit('alert', alert);
    this.requestCommit(true);
  }

  say(text: string): void {
    const line: ChatLine = { id: uid('chat'), from: 'mascot', text, at: Date.now() };
    this.chat.push(line);
    this.chat = this.chat.slice(-30);
    this.emit('chat', line);
    this.requestCommit(true);
  }

  userMessage(text: string): void {
    this.chat.push({ id: uid('chat'), from: 'user', text, at: Date.now() });
    const lower = text.toLowerCase();
    setTimeout(() => {
      if (lower.includes('time machine') || lower.includes('path')) {
        const a = this.paths.find((p) => p.id === 'A');
        this.say(`Time Machine check karo! Path A ki probability ${a?.probability.toFixed(1)}% hai — liquidity sweep ke baad overhead FVG mitigate karne ka odds strongest hai. Stoploss strict hai, tension mat lo!`);
      } else if (lower.includes('risk') || lower.includes('stop')) {
        this.say(`Risk deck live: hard stop ${(this.risk.state.hardStopPct * 100).toFixed(1)}%, Chandelier trail har candle update, max daily drawdown 2% pe full lockdown.`);
      } else if (lower.includes('whale')) {
        this.say('Dark pool nebula chart pe purple glow mein dikh raha hai. Whale trigger hote hi option selling fire-sale auto-fire hogi — Escape Engine fully armed.');
      } else {
        this.say('Samajh gaya. Main SMC/ICT structure, hidden confluence aur Time Machine paths ko continuously monitor kar raha hoon — koi high-probability setup mile to turant ping karunga.');
      }
    }, 500);
  }

  markAlertsRead(): void {
    this.alerts.forEach((a) => (a.read = true));
    this.requestCommit(true);
  }

  // ── Snapshot ────────────────────────────────────────────────────────────

  private requestCommit(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastCommit < 450) return;
    this.lastCommit = now;
    this.emit('commit', this.getSnapshot());
  }

  getSnapshot(): BrainSnapshot {
    const symbol = this.focusSymbol;
    const smcSnap = this.smcFor(symbol).update(this.feedInstance.getCandles(symbol));
    const conf = this.confluence.get(symbol);
    const price = this.feedInstance.getPrice(symbol);
    const locked = this.risk.state.locked || this.zen.isLocked();
    return {
      mode: this.mode,
      focusSymbol: symbol,
      price,
      prevPrice: this.prevPrice || price,
      bias: smcSnap.bias,
      lastEvent: smcSnap.lastEvent,
      inPremium: smcSnap.inPremium,
      inDiscount: smcSnap.inDiscount,
      equilibrium: smcSnap.equilibrium,
      zones: smcSnap.zones,
      sweeps: smcSnap.sweeps,
      confluenceCells: conf?.cells ?? [],
      confluenceScore: conf?.score ?? 0,
      hiddenConfirmations: conf?.confirmations ?? [],
      paths: this.paths,
      monteCarlo: this.monteCarlo,
      greeks: this.greeks,
      gammaBlast: { ...this.gammaBlast, blast: this.gammaBlast.blast && Date.now() - this.gammaBlast.blastAt < 9000 },
      darkZones: this.dark.zones,
      positions: this.positions,
      recentTrades: this.recentTrades,
      postMortems: this.postMortems,
      risk: { ...this.risk.state },
      pods: this.hatchery.pods,
      activeGenome: this.hatchery.active,
      fitMatrix: this.sandbox.matrix(),
      topFits: this.sandbox.topFits(8),
      sandbox: { total: this.sandbox.totalInstruments, open: this.sandbox.openPositions, pnl: this.sandbox.aggregatePnl },
      regime: this.regimeSwitch.regime,
      optionSelling: this.regimeSwitch.optionSelling,
      alerts: this.alerts,
      chat: this.chat,
      mood: this.mood,
      zen: { ...this.zen.state },
      flashReports: this.flashReports,
      gapForecast: this.gapForecast,
      execution: {
        orders: this.execution.orders,
        saved: this.execution.totalSaved,
        hedgeActive: this.execution.hedgeActive,
        hedgeLabel: this.execution.hedgeLabel,
      },
      confidence: this.confidence,
      neuralStatus: this.positions.length || this.mode === 'live' ? 'Active' : 'Idle',
      neuralAction: this.neuralAction,
      theme: this.theme,
      glance: {
        goal: 'Compound equity +0.8% today · cap daily DD at 2%',
        safety: locked ? 'LOCKDOWN — non-essential ops frozen' : this.risk.state.drawdownPct < -0.01 ? 'Elevated — trailing stops tight' : 'Nominal — all circuits healthy',
        healthPct: this.risk.state.dailyPnlPct,
        healthPnl: this.risk.state.dailyPnl,
      },
      lockdown: locked,
      dataAdapter: this.feedInstance.name,
      heartbeat: this.heartbeat,
    };
  }
}

export const brain = new Brain(feed);
feed.start();
setInterval(() => brain.tick(), 1000);
