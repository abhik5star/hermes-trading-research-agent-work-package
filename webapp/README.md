# Hermes Neural — Autonomous Self-Learning AI Trading Brain Dashboard

A cinematic, glassmorphic 3D command surface for an autonomous SMC/ICT trading
brain. Designed around two references — **Kibitz AI** and **Apple Vision Pro** —
the interface stays ultra-minimal: every complex indicator is processed
silently in the engine layer and rendered only as glow, particles, or neon
structure, never as raw decimal clusters.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 + TypeScript + Vite |
| 3D | three.js, @react-three/fiber, @react-three/drei |
| State | Zustand (brain → UI frame subscription) |
| Motion | Framer Motion |
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
│   ├── chart/              R3F neural grid, zones, particles, nebula, wormhole, Monte Carlo tree
│   ├── mascot/             3D cybernetic falcon + emotion engine + Hinglish speech bubble
│   ├── nav/                Mode switch, font scaler, panic switch, bell, rails
│   ├── panels/             Glance cards, risk HUD, greeks, execution desk, vault…
│   └── views/              Command, Time Machine, Hatchery & Lab, Learning Log, Risk Deck
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

1. Global controls — `nav/ModeSwitch.tsx`, `nav/FontScaler.tsx`, `nav/PanicButton.tsx`, `TopBar.tsx`
2. SMC/ICT + hidden confluence — `engine/smcEngine.ts`, `engine/confluence.ts`, `chart/chartObjects.tsx`
3. Time Machine — `engine/timeMachine.ts`, `views/TimeMachineView.tsx`
4. Neural state, learning log, risk deck, Monte Carlo — `panels/`, `views/LearningView.tsx`, `engine/monteCarlo.ts`
5. 3D falcon mascot + bilingual chat + bell — `components/mascot/`, `nav/NotificationBell.tsx`
6. Anti-anxiety UX — three glance cards, morphing numbers, Deep-Focus-Grey idle theme
7. Dark liquidity, wormhole, Zen Guard, Flash sandbox — `engine/darkLiquidity.ts`, `WormholeLayers`, `engine/zenGuard.ts`, `views/HatcheryView.tsx`
8. Strategy Hatchery GA — `engine/hatchery.ts` + `engine/backtest.ts`
9. Omni-asset sandbox + fit stream — `engine/sandbox.ts`, `OmniFitStream`
10. Option regime switcher + whale escape — `engine/regime.ts`, brain event wiring
11. Greeks, Gamma Blast, gap predictor — `engine/greeks.ts`, `engine/gapPredictor.ts`, `DeckView.tsx`
12. Funding/liquidation, TWAP/VWAP, Black Swan vault — `panels/DeckPanels.tsx`, `engine/execution.ts`

> All P&L, order flow and predictions are simulated locally. The system is a
> research/visualisation platform — autonomous routing to a live broker requires
> a separately approved execution adapter and human decision gates.

## Emotion engine & event popups

The cybernetic falcon runs a nine-state emotion state machine
(`engine/brain.ts` → `updateMoodAndTheme`, metadata in
`components/mascot/moods.ts`):

| Mood | Trigger |
| --- | --- |
| `sleeping` 😴 | No open positions and no high-signal events for ~28s (auto power-nap, Deep-Focus-Grey theme) |
| `thinking` 🤔 | Confluence sitting in the 45–68 evaluation band |
| `happy` 😊 | Open positions running in profit |
| `celebrating` 🎉 | Fresh winning trade closed (victory spin + hop) |
| `sad` 😢 | Losing trade closed (drooping eyelids, falling tear, reflection in chat) |
| `angry` 💢 | Daily drawdown pressure beyond −1.2% |
| `alert` ⚡ | Time-boxed whale/γ-blast burst with hysteresis (never latches) |
| `zen` 🧘 | Zen Guard revenge-trading lockout |
| `idle` 🛰️ | Default structural scanning |

Every brain event (fills, stops, whales, gamma blasts, hedges, promotions,
panic) also raises a spring-shaken toast via `components/nav/ToastStack.tsx` —
slides in from the right with an overshoot shake, Hinglish quip per tone,
lifetime progress bar, and auto-dismiss after 7s.
