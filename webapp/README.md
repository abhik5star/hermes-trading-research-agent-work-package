# Hermes Neural — Autonomous Self-Learning AI Trading Brain Dashboard

A clean, professional **flat trading-terminal-style web dashboard** (solid dark
navy panels, muted accent colors, 2D canvas charts — no neon glow, glassmorphism
or 3D clutter) for an autonomous SMC/ICT trading brain. The Hinglish AI
assistant ("Miri AI") lives in an **animated floating mascot widget pinned to
the bottom-right corner** — click it to open the chat panel. Complex indicators
are processed silently in the engine layer and surfaced as plain scores, zones
and badges rather than dense decimal clusters.

## Interface map

- **Left sidebar** — Home, AI Market Scanner, Crypto / Indian Index Options /
  Stock Options & Futures / High Beta entry points, Strategy Lab, Backtesting,
  Trade Autopsy, AI Learning Memory, Risk Centre, Data Connections, Settings +
  Beginner Mode toggle (collapses to a horizontal strip on mobile).
- **Top ticker** — live asset pills (BTC, ETH, NIFTY, BANKNIFTY, RELIANCE…),
  mode menu (Backtest / Paper / Live / Time Machine), font scaler, compact
  Emergency Square-Off, the **notification bell** (every brain event, with an
  unread badge and a full "Neural Alert Stream" on click), account chip.
- **Home** — greeting strip, three Market Scanner entry cards (Crypto / Indian
  Indices / F&O Stocks), Market Overview (regime + AI Health ring + top
  opportunities), Quick Stats, a TradingView-style 2D candlestick canvas
  (volume, demand/supply zones, structural tags, crosshair, timeframes,
  Strategy-Lab handoff button), Watchlist tabs, and five insight cards
  (Strategy Lab, Hypothesis Engine, Learning Loop, Trade Autopsy, Risk Centre).
- **Bottom-right corner dock** — one compact control:
  - a **small Miri avatar** (40 px, gentle bob, mood emoji badge, unread
    counter) — `components/assistant/AssistantMascot.tsx`. It **never opens on
    its own**: the panel appears only on click and offers a Text/Voice switch
    (Web Speech API where available, clearly-labelled simulated voice demo
    otherwise). Inside, a **live backend briefing** reports what the engine
    actually did — the last executed trade, the latest strategy check
    (Flash Backtest GO/NO-GO verdict or the active genome) and the newest
    post-mortem with the concrete rule modification it triggered
    (`components/assistant/BackendBrief.tsx`, shared derivations in
    `utils/learning.ts` + `utils/backendBrief.ts`).
- **Bottom status bar** — removed. The top bar already carries the live state
  (mode menu shows "Paper Trading" / "Live Monitor · Sim", the account chip
  reads "Paper · Simulated", and the bell carries every brain event), so the
  prototype never claims to trade live money. Broker/feed wiring state is
  visible in Settings → Data Connections.

## Clickable user flows

1. **Home → Market Scanner** — the three home category cards (and the sidebar
   scanner entries) preselect Crypto, Indian Indices or F&O Stocks.
2. **Scanner → Chart** — pick a timeframe, click any instrument row/"Open" and
   the home candlestick chart opens that symbol (`feed.ensureStream` boots a
   full candle stream on demand for any universe symbol).
3. **Chart → Strategy Lab** — the chart toolbar's Strategy Lab button opens the
   selected pod with every setup condition and a live alignment checklist.
4. **Strategy Lab → Hypothesis** — pod detail → "Hypothesis banao" lands on the
   Hypothesis Compare tab (baseline vs proposed variant, parameter diffs).
5. **Hypothesis → Backtest** — running the query produces an actual simulated
   Flash Backtest report; before any test runs, only amber **SAMPLE**
   placeholders are shown.
6. **Backtest → Trade Autopsy** — each report links to the post-mortem with the
   suspected failure reason and supporting trade/evidence block.
7. **Autopsy → Learning Loop** — the Learning Loop tab compares baseline rules
   against proposed changes; rows stay amber "untested" until a matching Flash
   Backtest exists, then show its real GO/NO-GO result.
8. **Any screen → Miri AI** — the corner mascot is mounted globally; click for
   the panel and choose text or voice interaction.

> **Green-status rule:** a green "profitable/GO/validated" badge is rendered
> only for results an actual in-session test produced (Flash Backtest reports,
> hatchery cross-validation, closed paper trades). Placeholder/sample figures
> are amber and explicitly labelled SAMPLE. All data is simulated and live
> trading is disabled in this prototype.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 + TypeScript + Vite |
| Charts | Custom 2D HTML5 canvas candlestick renderer (no WebGL dependency) |
| State | Zustand (brain → UI frame subscription) |
| Motion | Framer Motion (subtle card/tab transitions only) |
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
- **`RESUME-PREVIEW.bat` (repo root)** — *repair* launcher for when the
  dashboard will not come up (stale port, wiped `node_modules`, failed
  type-check). It restores dependencies, type-checks, starts the server and
  opens the browser.
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

### Resume / repair the preview (macOS, Linux, CI, agents)

`scripts/resume_preview.sh` is the idempotent recovery path for the dev
preview on port 5173 — useful when a sandbox wipe removes `node_modules` and
kills Vite mid-session:

```bash
./scripts/resume_preview.sh             # foreground dev server (Ctrl+C to stop)
./scripts/resume_preview.sh --detached  # background; survives the shell
./scripts/resume_preview.sh --check     # health check only, never starts
```

It verifies Node 18+, reuses an already-healthy server instead of fighting
for the port, restores missing dependencies, runs `tsc --noEmit`, starts Vite
on `0.0.0.0:5173` and prints the live-preview URL. `SKIP_TYPECHECK=1` skips
the type-check for faster restarts. The script never touches git state and
never enables live trading.

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
├── state/store.ts          Zustand store: view/flow state, chart focus history, Miri panel state
├── utils/
│   ├── learning.ts         Shared post-mortem → proposal derivation (Autopsy + Miri)
│   └── backendBrief.ts     Live backend briefing for the Miri panel
├── components/
│   ├── layout/             Sidebar (desktop) + MobileNav, TickerBar
│   ├── home/               MarketOverview, QuickStats, CandleChart (canvas), Watchlist, BottomRow
│   ├── assistant/          Corner dock: small Miri avatar + click-only text/voice panel + backend brief
│   ├── scanner/            InstrumentBrowser (category tabs, timeframe, open-chart)
│   ├── backtest/           HypothesisCompare (baseline vs modified strategy)
│   ├── mascot/moods.ts     Mood metadata shared by the Miri assistant
│   ├── nav/                Notification bell (alert stream), risk-lockdown banner
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
5. Miri AI assistant + bilingual speech + bell — `assistant/AssistantMascot.tsx` (click-only corner panel, text/voice), `nav/NotificationBell.tsx`
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

## Emotion engine & event reporting

The assistant mood state machine (`engine/brain.ts` → `updateMoodAndTheme`,
metadata in `components/mascot/moods.ts`) drives the mood badge on the corner
mascot and the status pill inside the click-to-open panel:

| Mood | Trigger |
| --- | --- |
| `sleeping` 😴 | No open positions and no high-signal events for ~28s (auto power-nap, Deep-Focus-Grey theme) |
| `thinking` 🤔 | Confluence sitting in the 45–68 evaluation band |
| `happy` 😊 | Open positions running in profit |
| `celebrating` 🎉 | Fresh winning trade closed |
| `sad` 😢 | Losing trade closed (reflection queued in the assistant chat, red unread dot on the mascot) |
| `angry` 💢 | Daily drawdown pressure beyond −1.2% |
| `alert` ⚡ | Time-boxed whale/γ-blast burst with hysteresis (never latches) |
| `zen` 🧘 | Zen Guard revenge-trading lockout |
| `idle` 🛰️ | Default structural scanning |

Every brain event (fills, stops, whales, gamma blasts, hedges, promotions,
panic) is recorded in the engine's alert buffer (last 40) and surfaces
**without interrupting the screen**: the Notification Bell shows an unread
count and opens a full stream on click, and the corner Miri mascot carries a
red unread dot. There are deliberately **no auto-popping toast overlays** —
brain events must never cover the chart or the panel you are reading.
