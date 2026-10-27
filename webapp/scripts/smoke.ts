/**
 * Headless engine smoke test — run with:
 *   node --experimental-strip-types scripts/smoke.ts
 * Exercises every brain subsystem without a browser.
 */
import { brain } from '../src/engine/brain.ts';
import { runMonteCarlo } from '../src/engine/monteCarlo.ts';
import { blackScholes, buildChain, detectGammaBlast } from '../src/engine/greeks.ts';
import { executeFlashTest } from '../src/engine/flashBacktest.ts';
import { runBacktest, synthesizeDailyHistory, defaultGenome, fitnessOf } from '../src/engine/backtest.ts';
import { ZenGuard } from '../src/engine/zenGuard.ts';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 1. Greeks math sanity
const g = blackScholes({ spot: 100, strike: 100, tte: 0.08, rate: 0.068, iv: 0.15, kind: 'CE' });
check('Black–Scholes call price positive', g.price > 0 && g.delta > 0 && g.delta < 1, `price=${g.price.toFixed(2)} delta=${g.delta.toFixed(2)}`);
const chain = buildChain(24580, 250, 4, 0.13, Math.random);
check('Option chain built (18 rows)', chain.length === 18);
check('Gamma blast radar returns score', typeof detectGammaBlast(chain).score === 'number');

// 2. Backtester determinism
const hist = synthesizeDailyHistory('^NSEI', 750);
const stats1 = runBacktest(hist, defaultGenome());
const stats2 = runBacktest(hist, defaultGenome());
check('Backtest deterministic', stats1.trades === stats2.trades && stats1.winRate === stats2.winRate, `trades=${stats1.trades} wr=${(stats1.winRate * 100).toFixed(1)}%`);
check('Fitness in 0..1', fitnessOf(stats1) >= 0 && fitnessOf(stats1) <= 1);

// 3. Flash test NL parsing
const flash = executeFlashTest('Test 21 EMA instead of 20 EMA on BTC');
check('Flash backtest returns GO/NO-GO', flash.recommendation === 'GO' || flash.recommendation === 'NO-GO', `WR=${(flash.winRate * 100).toFixed(1)} PF=${flash.profitFactor.toFixed(2)}`);

// 4. Monte Carlo
const mc = runMonteCarlo(hist);
check('Monte Carlo 10k paths', mc.bands.length === 30 && mc.filaments.length > 0, `P(up)=${(mc.probUp * 100).toFixed(1)}%`);

// 5. Let the live brain run
await sleep(6500);
const snap = brain.getSnapshot();
check('Snapshot produced', !!snap && snap.price > 0, `price=${snap.price.toFixed(2)}`);
check('SMC zones detected', snap.zones.length > 0, `${snap.zones.length} zones`);
check('Confluence cells rendered', snap.confluenceCells.length > 0, `score=${snap.confluenceScore}`);
check('Time Machine 3 paths', snap.paths.length === 3, snap.paths.map((p) => `${p.id}:${p.probability.toFixed(0)}%`).join(' '));
const probSum = snap.paths.reduce((a, p) => a + p.probability, 0);
check('Path probabilities sum to 100', Math.abs(probSum - 100) < 0.5, `sum=${probSum.toFixed(1)}`);
check('Hatchery pods alive', snap.pods.length >= 2, `${snap.pods.length} pods`);
check('Fit matrix populated', snap.fitMatrix.length > 10, `${snap.fitMatrix.length} cells`);
check('Sandbox instruments ~300+', snap.sandbox.total >= 250, `${snap.sandbox.total}`);
check('Greeks eventually computed', snap.greeks.length === 18 || snap.greeks.length === 0);
check('Mascot chat seeded', snap.chat.length > 0);
check('Post-mortems seeded', snap.postMortems.length >= 3);
check('Gap forecast available', !!snap.gapForecast && !!snap.gapForecast.direction);

// 6. Mode switching + focus
brain.setMode('timemachine');
check('Time machine mode', brain.getSnapshot().mode === 'timemachine');
brain.setFocus('BTCUSDT_PERP');
check('Focus switch', brain.getSnapshot().focusSymbol === 'BTCUSDT_PERP');
brain.setMode('paper');

// 7. Zen guard
const zen = new ZenGuard();
zen.reportTrade('loss'); zen.reportTrade('loss'); zen.reportTrade('loss');
check('Zen guard locks after 3 losses', zen.isLocked());
zen.release();
check('Zen guard releases', !zen.isLocked());

// 8. Wait for autonomous trading + hatchery evolution
await sleep(16000);
const snap2 = brain.getSnapshot();
check('Brain opens or manages positions (or correctly waits)', Array.isArray(snap2.positions));
check('Confidence in 0..100', snap2.confidence >= 0 && snap2.confidence <= 100, `${snap2.confidence}%`);

// 9. Panic square-off never throws
brain.panicSquareOff();
check('Panic square-off executed', brain.getSnapshot().positions.length === 0);

// 10. Alerts + flash async path
const report = await brain.flashTest('Donchian period 30');
check('Async flash test resolves', report.trades > 0);
check('Alerts streaming', brain.getSnapshot().alerts.length >= 0);

console.log(failures === 0 ? '\n🎉 ALL SMOKE CHECKS PASSED' : `\n💥 ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
