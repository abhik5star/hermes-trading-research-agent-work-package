import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  History, Search, Zap, CheckCircle2, XCircle, Loader2, FlaskConical, Lightbulb,
  ShieldOff, ScanSearch, Info,
} from 'lucide-react';
import { useStore, brain } from '../state/store';
import { Chip } from '../components/ui/Primitives';
import { HypothesisCompare } from '../components/backtest/HypothesisCompare';
import { cn } from '../utils/cn';

const EXAMPLES = ['Test 21 EMA instead of 20 EMA', 'RSI threshold 40 on BTC', 'Donchian period 30 for BANKNIFTY', 'Supertrend multiplier 2.5'];

// Illustrative only — clearly labelled SAMPLE, never rendered as green/profitable.
const SAMPLE_CARDS = [
  { query: 'Sample: 21 EMA trend filter on NIFTY', winRate: '54.2%', pf: '1.31', note: 'Illustrative placeholder — actual test abhi run nahi hua' },
  { query: 'Sample: RSI 40 mean-reversion on BTC', winRate: '48.6%', pf: '0.97', note: 'Illustrative placeholder — actual test abhi run nahi hua' },
];

export function BacktestView() {
  const reports = useStore((s) => s.snapshot?.flashReports ?? []);
  const mode = useStore((s) => s.snapshot?.mode);
  const tab = useStore((s) => s.backtestTab);
  const setTab = useStore((s) => s.setBacktestTab);
  const setView = useStore((s) => s.setView);
  const setAutopsyTab = useStore((s) => s.setAutopsyTab);
  const setSelectedPostMortemId = useStore((s) => s.setSelectedPostMortemId);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text || busy) return;
    setBusy(true);
    setQuery(text);
    await brain.flashTest(text);
    setBusy(false);
    setQuery('');
  };

  const goAutopsy = () => {
    const latest = useStore.getState().snapshot?.postMortems[0];
    if (latest) setSelectedPostMortemId(latest.id);
    setAutopsyTab('postmortem');
    setView('autopsy');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <History size={18} className="text-[var(--accent)]" /> Backtesting & Paper Trading
        </h2>
        <Chip tone="amber"><ShieldOff size={11} /> Prototype — live trading disabled, sab results simulated</Chip>
      </div>

      {/* Tabs — flow 4 lands on Hypothesis, flow 5 reads Flash results */}
      <div className="card p-1 flex w-fit">
        <button
          onClick={() => setTab('hypothesis')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.72rem] font-semibold transition-all', tab === 'hypothesis' ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white')}
        >
          <Lightbulb size={13} /> Hypothesis Compare
        </button>
        <button
          onClick={() => setTab('flash')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.72rem] font-semibold transition-all', tab === 'flash' ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white')}
        >
          <FlaskConical size={13} /> Flash Backtest
        </button>
      </div>

      {tab === 'hypothesis' && <HypothesisCompare />}

      {tab === 'flash' && (
        <>
          <div className="card p-5">
            <h3 className="text-[0.88rem] font-bold mb-3 flex items-center gap-2">
              <FlaskConical size={15} className="text-[var(--accent)]" /> Flash Backtest Sandbox
            </h3>
            <p className="text-[0.68rem] dim mb-3">
              Current mode: <b className="capitalize text-white/85">{mode?.replace('-', ' ')}</b> — 3 saal ki simulated daily history pe ~3 second mein micro-report.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 dim" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && run()}
                  placeholder="Strategy variation likho — e.g. ‘Test 21 EMA instead of 20 EMA’"
                  className="input w-full pl-10 pr-4 py-3 text-[0.8rem]"
                />
              </div>
              <button onClick={() => run()} disabled={busy} className="btn btn-primary px-5 text-[0.78rem] font-semibold flex items-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {busy ? 'Simulating…' : 'Flash Test'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => run(ex)} className="chip hover:border-[var(--accent)] transition-colors">{ex}</button>
              ))}
            </div>
          </div>

          {/* No tests run yet — show clearly labelled SAMPLE placeholders, never green */}
          {reports.length === 0 && (
            <div className="space-y-3">
              <div className="card p-4 flex items-start gap-3" style={{ borderColor: 'rgba(224,165,47,0.4)' }}>
                <Info size={15} className="text-[var(--amber)] shrink-0 mt-0.5" />
                <p className="text-[0.7rem] dim">
                  Abhi tak koi actual Flash Test run nahi hua. Neeche sirf <b className="text-[var(--amber)]">SAMPLE illustrative figures</b> hain —
                  green "profitable" status tab tak dikhega jab tak tum real simulated test chala ke result validate nahi kar lete.
                </p>
              </div>
              {SAMPLE_CARDS.map((s) => (
                <div key={s.query} className="card p-4" style={{ opacity: 0.85 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.82rem] font-bold">{s.query}</p>
                      <p className="text-[0.66rem] dim mt-1">{s.note}</p>
                    </div>
                    <Chip tone="amber">SAMPLE · untested</Chip>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    {[
                      { l: 'Win rate', v: s.winRate },
                      { l: 'Profit factor', v: s.pf },
                      { l: 'Trades', v: '—' },
                      { l: 'Expectancy', v: '—' },
                    ].map((m) => (
                      <div key={m.l} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                        <p className="hud-label !text-[0.56rem]">{m.l}</p>
                        <p className="text-[0.92rem] font-bold font-mono mt-1 dim">{m.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actual in-session simulated test results */}
          <div className="space-y-3">
            {reports.map((r) => (
              <motion.div key={r.at} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[0.82rem] font-bold">“{r.query}”</p>
                    <p className="text-[0.66rem] dim mt-1">{r.parsed}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone="cyan">SIMULATED RESULT · 3Y synthetic history</Chip>
                    {/* Green only here — an actual test produced this recommendation */}
                    <Chip tone={r.recommendation === 'GO' ? 'green' : 'red'}>
                      {r.recommendation === 'GO' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {r.recommendation}
                    </Chip>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  {[
                    { l: 'Win rate', v: `${(r.winRate * 100).toFixed(1)}%` },
                    { l: 'Profit factor', v: r.profitFactor.toFixed(2) },
                    { l: 'Trades', v: r.trades.toLocaleString() },
                    { l: 'Expectancy', v: `${(r.expectancy * 100).toFixed(2)}%` },
                  ].map((s) => (
                    <div key={s.l} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                      <p className="hud-label !text-[0.56rem]">{s.l}</p>
                      <p className="text-[0.92rem] font-bold font-mono mt-1">{s.v}</p>
                    </div>
                  ))}
                </div>
                {/* Flow 6 — verify the failure side in Trade Autopsy */}
                <button
                  onClick={goAutopsy}
                  className="btn mt-3 px-4 py-2 rounded-lg text-[0.7rem] font-semibold flex items-center gap-1.5"
                >
                  <ScanSearch size={13} /> Trade Autopsy mein failure reason & evidence verify karo
                </button>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
