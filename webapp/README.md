# Hermes Neural — Autonomous Self-Learning AI Trading Brain Dashboard

A clean, professional **trading-terminal-style web dashboard** (dark navy
fintech look, 2D canvas charts — no holograms or 3D clutter) for an autonomous
SMC/ICT trading brain, with a built-in Hinglish AI assistant ("Miri AI").
Complex indicators are processed silently in the engine layer and surfaced as
plain scores, zones and badges rather than dense decimal clusters.

## Interface map

- **Left sidebar** — Home, AI Market Scanner, Crypto / Indian Index Options /
  Stock Options & Futures / High Beta entry points, Strategy Lab, Backtesting,
  Trade Autopsy, AI Learning Memory, Risk Centre, Data Connections, Settings +
  Beginner Mode toggle (collapses to a horizontal strip on mobile).
- **Top ticker** — live asset pills (BTC, ETH, NIFTY, BANKNIFTY, RELIANCE…),
  mode menu (Backtest / Paper / Live / Time Machine), font scaler, compact
  Emergency Square-Off, notification bell, account chip.
- **Home** — Miri AI assistant card, Market Overview (regime + AI Health ring
  + top opportunities), Quick Stats, a TradingView-style 2D candlestick canvas
  (volume, demand/supply zones, structural tags, crosshair, timeframes),
  Watchlist tabs, and five insight cards (Strategy Lab, Hypothesis Engine,
  Learning Loop, Trade Autopsy, Risk Centre).
- **Bottom status bar** — demo-feed / broker / paper-mode connection states.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 + TypeScript + Vite |
| Charts | Custom 2D HTML5 canvas candlestick renderer (no WebGL dependency) |
| State | Zustand (brain → UI frame subscription) |
| Motion | Framer Motion (subtle card/toast/tab transitions only) |
| Styling | Tailwind CSS with theme-token CSS variables |
| Icons | lucide-react |

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (binds 0.0.0.0, any preview host allowed)
npm run build      # type-check + production bundle
npm run typecheck
node --experimental-strip-types scripts/smoke.ts   # headless engine smoke test
# (or bundle first for Node versions without strip-types:
#  npx esbuild scripts/smoke.ts --bundle --platform=node --format=esm --outfile=scripts/.smoke.mjs && node scripts/.smoke.mjs)
```

### Windows one-click launchers

- **`START-HERE.bat` (repo root)** — the only file a non-technical user needs.
  Double-click and it checks Node.js, installs **all** dependencies on first
  run (cached afterwards), starts the server, and opens
  `http://localhost:5173` in the browser automatically.
- **`webapp/setup-dashboard.bat`** — full install plus verification
  (`npm install` → type-check → production build) for a fresh PC or after
  pulling new code.
- **`webapp/start-dashboard.bat`** — install-if-needed then dev server +
  browser open.
- **`webapp/build-dashboard.bat`** — type-checks, builds the production
  bundle, and serves it on `http://localhost:4173`.

All `.bat` files use CRLF (pinned via `.gitattributes`) and pause on error so
the window stays readable. The only prerequisite is Node.js 18+ from
<https://nodejs.org>.

## Architecture

```
src/
├── engine/                 Framework-agnostic trading brain (no React imports)
│   ├── marketFeed.ts       FeedAdapter interface + simulated Binance/yfinance parity feed
│   ├── instruments.ts      NSE indices/stocks, index options, 200+ crypto spot/perps/options
│   ├── indicators.ts       Hidden suite: RSI, CCI, Donchian, Supertrend, Chandelier, CPR, Fib, EMA
│   ├── smcEngine.ts        BOS, CHoCH, MSS, liquidity sweeps, FVG, Order Blocks, premium/discount
│   ├── confluence.ts       Hidden indicator × SMC alignment → glow heatmap
│   ├── timeMachine.ts      Three projected paths (A/B/C) with live probabilities + catalysts
│   ├── monteCarlo.ts       10,000-path GBM simulation → branching neon neural tree
│   ├── greeks.ts           Black–Scholes pipeline + Gamma Blast radar
│   ├── riskEngine.ts       Hard SL, Chandelier trail, 2% daily drawdown circuit breaker
│   ├── hatchery.ts         Genetic AutoML strategy scientist (mutation → cross-validation → promotion)
│   ├── sandbox.ts          Parallel paper trading over 300+ instruments + fit matrix
│   ├── regime.ts           Sideways theta-harvest ↔ whale breakout escape engine
│   ├── darkLiquidity.ts    Iceberg / dark-pool tracker (purple nebula)
│   ├── zenGuard.ts         Interaction telemetry + revenge-trading lockout
│   ├── execution.ts        TWAP/VWAP iceberg slicer + slippage counter + insurance vault
│   ├── flashBacktest.ts    Natural-language strategy variations → 3-year backtest in ~3s
│   ├── gapPredictor.ts     GIFT Nifty / globals / PCR / block-flow pre-market forecast
│   ├── learningLog.ts      "Mistake → Correction → New Probability" post-mortems
│   └── brain.ts            Orchestrator + event bus (single source of truth)
├── state/store.ts          Zustand store, theme/font application
├── components/
│   ├── layout/             Sidebar (desktop) + MobileNav, TickerBar, StatusBar
│   ├── home/               MiriCard, MarketOverview, QuickStats, CandleChart (canvas), Watchlist, BottomRow
│   ├── mascot/moods.ts     Mood metadata shared by the Miri assistant card
│   ├── nav/                Notification bell, toast stack, risk-lockdown banner
│   ├── panels/             Risk HUD, Greeks, positions, execution desk, vault…
│   └── views/              Home, Scanner, Lab, Backtest, Autopsy, Risk, Settings
```

## Going live with real data

`SimulatedFeed` implements the same `FeedAdapter` surface (`getCandles`,
`getPrice`, `getBook`, marks + tick/candle/whale/book events) as the production
adapters. Swap the single `feed` instance in `engine/brain.ts`:

- **Binance** — `wss://stream.binance.com:9443/stream?streams=...` (`@kline_1m`,
  `@depth`, `@markPrice` funding, open-interest streams).
- **Indian markets** — a yfinance/bridge WebSocket for `^NSEI`, `^NSEBANK` and
  NSE cash names, plus an option-chain/OI vendor for Greeks telemetry.

No component or engine module outside `marketFeed.ts` needs to change.

## Feature map (spec → implementation)

1. Global controls — `layout/TickerBar.tsx` (mode menu, font scaler, compact square-off, bell)
2. SMC/ICT + hidden confluence — `engine/smcEngine.ts`, `engine/confluence.ts`, rendered as zones/tags on the 2D canvas (`home/CandleChart.tsx`)
3. Predictive paths — `engine/timeMachine.ts`; Monte Carlo 10k paths in `views/ScannerView.tsx`
4. Neural state, learning log, risk deck — `panels/`, `views/AutopsyView.tsx`, `engine/monteCarlo.ts`
5. Miri AI assistant card + bilingual speech + bell — `home/MiriCard.tsx`, `nav/NotificationBell.tsx`
6. Anti-anxiety UX — Quick Stats/Market Overview cards, morphing numbers, calm Deep-Focus-Grey idle theme
7. Dark liquidity, multi-timeframe confluence, Zen Guard, Flash sandbox — `engine/darkLiquidity.ts`, `views/ScannerView.tsx`, `engine/zenGuard.ts`, `views/BacktestView.tsx`
8. Strategy Hatchery GA — `engine/hatchery.ts` + `engine/backtest.ts`, UI in `views/LabView.tsx`
9. Omni-asset sandbox + fit stream — `engine/sandbox.ts`, fit grid in `views/LabView.tsx`
10. Option regime switcher + whale escape — `engine/regime.ts`, brain event wiring
11. Greeks, Gamma Blast, gap predictor — `engine/greeks.ts`, `engine/gapPredictor.ts`, `views/RiskView.tsx`
12. Funding/liquidation, TWAP/VWAP, Black Swan vault — `panels/DeckPanels.tsx`, `engine/execution.ts`

> All P&L, order flow and predictions are simulated locally. The system is a
> research/visualisation platform — autonomous routing to a live broker requires
> a separately approved execution adapter and human decision gates.

## Emotion engine & event popups

The assistant mood state machine (`engine/brain.ts` → `updateMoodAndTheme`,
metadata in `components/mascot/moods.ts`) drives the status pill on the Miri
card:

| Mood | Trigger |
| --- | --- |
| `sleeping` 😴 | No open positions and no high-signal events for ~28s (auto power-nap, Deep-Focus-Grey theme) |
| `thinking` 🤔 | Confluence sitting in the 45–68 evaluation band |
| `happy` 😊 | Open positions running in profit |
| `celebrating` 🎉 | Fresh winning trade closed |
| `sad` 😢 | Losing trade closed (reflection posted in the speech bubble) |
| `angry` 💢 | Daily drawdown pressure beyond −1.2% |
| `alert` ⚡ | Time-boxed whale/γ-blast burst with hysteresis (never latches) |
| `zen` 🧘 | Zen Guard revenge-trading lockout |
| `idle` 🛰️ | Default structural scanning |

Every brain event (fills, stops, whales, gamma blasts, hedges, promotions,
panic) raises a toast via `components/nav/ToastStack.tsx` — slides in from the
right with a subtle spring shake, Hinglish quip per tone, lifetime progress
bar, and auto-dismiss after 7s.
