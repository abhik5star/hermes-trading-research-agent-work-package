import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dna, FlaskConical, Zap, CheckCircle2, XCircle, Loader2, Search, Boxes } from 'lucide-react';
import { useStore, brain } from '../state/store';
import { Panel, ProgressRing, Chip, Bar } from '../components/ui/Primitives';
import { cn } from '../utils/cn';

const STATUS_TONE: Record<string, string> = {
  evolving: '#38e8ff',
  cross: '#ffd84d',
  promote: '#2dffb0',
  failed: '#ff5470',
  active: '#b4a6ff',
};

function statusColor(status: string): string {
  if (status.startsWith('Evolving')) return STATUS_TONE.evolving;
  if (status.startsWith('Cross')) return STATUS_TONE.cross;
  if (status.startsWith('Highly')) return STATUS_TONE.promote;
  if (status.startsWith('Failed')) return STATUS_TONE.failed;
  return STATUS_TONE.active;
}

function StrategyPods() {
  const pods = useStore((s) => s.snapshot?.pods ?? []);
  return (
    <Panel
      title="AI Strategy Hatchery"
      subtitle="Genetic AutoML scientist — SMC × ICT × momentum condition matrices"
      right={<Chip tone="violet"><Dna size={11} /> generation loop live</Chip>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pods.map((pod) => {
          const color = statusColor(pod.status);
          const promoting = pod.status.startsWith('Highly');
          return (
            <motion.div
              key={pod.genome.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: pod.terminated ? 0.55 : 1, scale: 1 }}
              className={cn(
                'relative rounded-3xl p-5 border overflow-hidden',
                promoting && 'pod-merge',
              )}
              style={{
                borderColor: `${color}55`,
                background: `linear-gradient(160deg, ${color}14, rgba(255,255,255,0.03))`,
                boxShadow: promoting ? `0 0 34px ${color}66` : `0 0 18px ${color}22`,
              }}
            >
              {/* capsule rails */}
              <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[0.62rem] tracking-[0.25em] dim">GEN-{pod.genome.generation}</p>
                  <h4 className="font-semibold mt-0.5 flex items-center gap-2">
                    {pod.genome.codename}
                    {pod.status === 'Active in Execution Engine' && <CheckCircle2 size={14} className="text-neon-violet" />}
                    {pod.terminated && <XCircle size={14} className="text-neon-red" />}
                  </h4>
                </div>
                <ProgressRing value={pod.fitness} size={58} stroke={5} color={color}>
                  <span className="text-[0.66rem] font-mono" style={{ color }}>
                    {(pod.fitness * 100).toFixed(0)}
                  </span>
                </ProgressRing>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <MiniStat label="Win rate" value={`${(pod.winRate * 100).toFixed(1)}%`} />
                <MiniStat label="Profit factor" value={pod.profitFactor.toFixed(2)} />
                <MiniStat label="Max DD" value={`${(pod.maxDrawdown * 100).toFixed(1)}%`} />
              </div>
              <p className="text-[0.62rem] dim mt-2 text-center">last {pod.trades.toLocaleString()} simulated trades · 3-year cross-validation</p>

              <div
                className="mt-3 rounded-xl px-3 py-2 text-[0.68rem] font-medium flex items-center gap-2"
                style={{ color, background: `${color}14`, border: `1px solid ${color}33` }}
              >
                {pod.status.startsWith('Evolving') && <Loader2 size={12} className="animate-spin" />}
                {pod.status.startsWith('Highly') && <Zap size={12} />}
                {pod.status}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.6rem] dim font-mono">
                <span>Donchian {pod.genome.donchianPeriod}</span>
                <span>RSI {pod.genome.rsiOversold}/{pod.genome.rsiOverbought}</span>
                <span>FVG depth {pod.genome.fvgDepth}</span>
                <span>ST ×{pod.genome.supertrendMult.toFixed(1)}</span>
                <span>EMA {pod.genome.emaFast}</span>
                <span>EMA {pod.genome.emaSlow}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Panel>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 py-2">
      <p className="text-sm font-mono font-semibold">{value}</p>
      <p className="text-[0.56rem] dim mt-0.5 tracking-wider uppercase">{label}</p>
    </div>
  );
}

function OmniFitStream() {
  const matrix = useStore((s) => s.snapshot?.fitMatrix ?? []);
  const topFits = useStore((s) => s.snapshot?.topFits ?? []);
  const pods = useStore((s) => s.snapshot?.pods ?? []);
  const strategyIds = [...new Set(matrix.map((c) => c.strategyId))].slice(0, 3);
  const symbols = [...new Set(matrix.map((c) => c.symbol))].slice(0, 14);
  const nameFor = (id: string) => pods.find((p) => p.genome.id === id)?.genome.codename ?? id.slice(0, 10);

  const cellColor = (fit: number) => {
    if (fit > 85) return { bg: 'rgba(45,255,176,0.75)', glow: '0 0 10px rgba(45,255,176,0.8)' };
    if (fit > 68) return { bg: 'rgba(56,232,255,0.5)', glow: '0 0 6px rgba(56,232,255,0.5)' };
    if (fit > 45) return { bg: 'rgba(255,216,77,0.32)', glow: 'none' };
    return { bg: 'rgba(148,163,184,0.16)', glow: 'none' };
  };

  return (
    <Panel
      title="Omni-Asset Fit Stream"
      subtitle="Live strategy × asset compatibility across NSE-100 + 200 crypto instruments"
      right={<Chip tone="green"><Boxes size={11} /> parallel paper sandbox</Chip>}
    >
      <div style={{ perspective: 1100 }}>
        <div style={{ transform: 'rotateX(8deg)', transformStyle: 'preserve-3d' }} className="space-y-2 transition-transform duration-500 hover:rotate-x-0">
          {strategyIds.map((sid) => (
            <div key={sid} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[0.62rem] dim truncate font-mono">{nameFor(sid)}</span>
              <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0,1fr))' }}>
                {symbols.map((sym) => {
                  const cell = matrix.find((c) => c.strategyId === sid && c.symbol === sym);
                  const fit = cell?.fit ?? 20;
                  const c = cellColor(fit);
                  return (
                    <div
                      key={sym}
                      title={`${nameFor(sid)} × ${sym} — ${fit.toFixed(1)}%`}
                      className="aspect-square rounded-[5px] transition-all duration-700"
                      style={{ background: c.bg, boxShadow: c.glow }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mt-3 text-[0.64rem] dim flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-neon-green/80" /> high fit · profit factor streaming</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-neon-amber/40" /> low-volatility · idling</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-400/20" /> no edge</span>
      </div>

      <div className="mt-4 space-y-2">
        <p className="hud-label !text-[0.56rem]">Locked perfect-fit alerts</p>
        {topFits.slice(0, 4).map((f, i) => (
          <motion.div
            key={`${f.strategyId}-${f.symbol}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green breathe" />
            <span className="text-[0.72rem] flex-1">
              <b>{nameFor(f.strategyId)}</b> fitted with <b>{f.symbol}</b> — Compatibility{' '}
              <span className="text-neon-green font-mono">{f.fit.toFixed(1)}%</span>
            </span>
            <Bar value={f.fit} max={100} color="#2dffb0" className="w-20" />
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

function FlashSandbox() {
  const reports = useStore((s) => s.snapshot?.flashReports ?? []);
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

  const examples = ['Test 21 EMA instead of 20 EMA', 'RSI threshold 40 on BTC', 'Donchian period 30 for BANKNIFTY', 'Supertrend multiplier 2.5'];

  return (
    <Panel
      title="Flash Backtest Sandbox"
      subtitle="Natural-language strategy variations · 3-year parallel simulation in ~3 seconds"
      right={<Chip tone="cyan"><FlaskConical size={11} /> instant micro-reports</Chip>}
    >
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Describe a variation — e.g. ‘Test 21 EMA instead of 20 EMA’"
            className="w-full bg-white/[0.05] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <button onClick={() => run()} disabled={busy} className="btn-ghost px-5 rounded-2xl text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          {busy ? 'Simulating…' : 'Flash Test'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {examples.map((ex) => (
          <button key={ex} onClick={() => run(ex)} className="chip hover:border-[var(--accent)] transition-colors">
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {reports.length === 0 && <p className="text-xs dim text-center py-6">No flash tests yet — the Falcon will narrate each result in Hinglish.</p>}
        {reports.map((r) => (
          <motion.div
            key={r.at}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">“{r.query}”</p>
                <p className="text-[0.68rem] dim mt-1">{r.parsed}</p>
              </div>
              <Chip tone={r.recommendation === 'GO' ? 'green' : 'red'}>
                {r.recommendation === 'GO' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {r.recommendation}
              </Chip>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <MiniStat label="Win rate" value={`${(r.winRate * 100).toFixed(1)}%`} />
              <MiniStat label="Profit factor" value={r.profitFactor.toFixed(2)} />
              <MiniStat label="Trades" value={r.trades.toLocaleString()} />
              <MiniStat label="Expectancy" value={`${(r.expectancy * 100).toFixed(2)}%`} />
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

export function HatcheryView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Dna size={19} className="text-neon-violet" /> AI Strategy Hatchery & Lab
        </h2>
        <p className="text-xs dim mt-1">
          Self-mutation engine combines SMC, ICT, Volume Profile and momentum parameters — no human intervention
        </p>
      </div>
      <StrategyPods />
      <OmniFitStream />
      <FlashSandbox />
    </div>
  );
}
