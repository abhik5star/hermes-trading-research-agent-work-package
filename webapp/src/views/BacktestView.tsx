import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Search, Zap, CheckCircle2, XCircle, Loader2, FlaskConical } from 'lucide-react';
import { useStore, brain } from '../state/store';
import { Chip } from '../components/ui/Primitives';

const EXAMPLES = ['Test 21 EMA instead of 20 EMA', 'RSI threshold 40 on BTC', 'Donchian period 30 for BANKNIFTY', 'Supertrend multiplier 2.5'];

export function BacktestView() {
  const reports = useStore((s) => s.snapshot?.flashReports ?? []);
  const mode = useStore((s) => s.snapshot?.mode);
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <History size={18} className="text-[var(--accent)]" /> Backtesting & Paper Trading
        </h2>
        <p className="text-[0.72rem] dim mt-1">
          Current mode: <b className="capitalize text-white/85">{mode?.replace('-', ' ')}</b> — Flash Backtest 3 saal ki history pe ~3 second mein micro-report deta hai
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-[0.88rem] font-bold mb-3 flex items-center gap-2">
          <FlaskConical size={15} className="text-[var(--accent)]" /> Flash Backtest Sandbox
        </h3>
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

      <div className="space-y-3">
        {reports.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-[0.78rem] dim">Abhi tak koi flash test nahi — upar example pe click karo, Miri 3 second mein Win Rate, Profit Factor aur Go/No-Go recommendation degi.</p>
          </div>
        )}
        {reports.map((r) => (
          <motion.div key={r.at} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.82rem] font-bold">“{r.query}”</p>
                <p className="text-[0.66rem] dim mt-1">{r.parsed}</p>
              </div>
              <Chip tone={r.recommendation === 'GO' ? 'green' : 'red'}>
                {r.recommendation === 'GO' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {r.recommendation}
              </Chip>
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
