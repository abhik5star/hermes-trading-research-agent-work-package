import { Dna, Boxes, CheckCircle2, XCircle, Loader2, Zap, ArrowLeft, Lightbulb, Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../state/store';
import { ProgressRing, Chip, Bar } from '../components/ui/Primitives';
import type { StrategyGenome, StrategyPod } from '../engine/types';
import { hypothesisQueryFor } from '../utils/learning';

function statusColor(status: string): string {
  if (status.startsWith('Evolving') || status.startsWith('Cross')) return '#e0a52f';
  if (status.startsWith('Highly')) return '#1db886';
  if (status.startsWith('Failed')) return '#e5536b';
  return '#8f7fe0';
}

/** Human-readable explanation of every genome condition. */
function conditionRows(g: StrategyGenome) {
  return [
    { label: 'Donchian breakout', value: `${g.donchianPeriod} periods`, note: 'Entry tab jab price N-period high/low break kare' },
    { label: 'RSI oversold / overbought', value: `${g.rsiOversold} / ${g.rsiOverbought}`, note: 'Momentum extreme ke andar hi entry allowed' },
    { label: 'FVG validation depth', value: `${g.fvgDepth} candle${g.fvgDepth > 1 ? 's' : ''}`, note: 'Fair value gap confirm hone ka wait' },
    { label: 'Supertrend multiplier', value: `×${g.supertrendMult.toFixed(1)}`, note: 'Trailing stop ATR multiplier' },
    { label: 'EMA fast / slow', value: `${g.emaFast} / ${g.emaSlow}`, note: 'Trend alignment dono EMAs se confirm' },
  ];
}

/** Build a natural-language hypothesis query the Flash Backtest can parse. */
export function LabView() {
  const pods = useStore((s) => s.snapshot?.pods ?? []);
  const matrix = useStore((s) => s.snapshot?.fitMatrix ?? []);
  const snapshot = useStore((s) => s.snapshot);
  const selectedPodId = useStore((s) => s.selectedPodId);
  const setSelectedPodId = useStore((s) => s.setSelectedPodId);
  const setHypothesisQuery = useStore((s) => s.setHypothesisQuery);
  const setBacktestTab = useStore((s) => s.setBacktestTab);
  const setView = useStore((s) => s.setView);

  const strategyIds = [...new Set(matrix.map((c) => c.strategyId))].slice(0, 3);
  const symbols = [...new Set(matrix.map((c) => c.symbol))].slice(0, 14);
  const nameFor = (id: string) => pods.find((p) => p.genome.id === id)?.genome.codename ?? id.slice(0, 10);

  const selected: StrategyPod | undefined = pods.find((p) => p.genome.id === selectedPodId);

  const goHypothesis = (g: StrategyGenome) => {
    setHypothesisQuery(hypothesisQueryFor(g));
    setBacktestTab('hypothesis');
    setView('backtest');
  };

  // ── Detail mode — flow 3: inspect the setup and every condition ─────────
  if (selected && snapshot) {
    const g = selected.genome;
    const color = statusColor(selected.status);
    const zones = snapshot.zones;
    const alignment = [
      { label: 'BOS / MSS structural breakout present', met: zones.some((z) => z.kind === 'BOS' || z.kind === 'MSS') },
      { label: 'Order-block demand/supply zone nearby', met: zones.some((z) => z.kind === 'order-block') },
      { label: 'Fair value gap (FVG) detected', met: zones.some((z) => z.kind === 'FVG') },
      { label: `Confluence score above 60% (now ${snapshot.confluenceScore.toFixed(0)}%)`, met: snapshot.confluenceScore >= 60 },
      { label: 'Hidden indicator confirmations aligned', met: snapshot.hiddenConfirmations.length >= 3 },
      { label: 'Price outside premium chase zone', met: !snapshot.inPremium },
    ];

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedPodId(null)} className="btn px-3 py-1.5 rounded-lg text-[0.7rem] font-semibold flex items-center gap-1.5">
          <ArrowLeft size={13} /> Saari strategies
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Setup summary + conditions */}
          <section className="xl:col-span-7 card p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[0.6rem] tracking-[0.22em] dim">GEN-{g.generation}</p>
                <h2 className="text-[1.1rem] font-bold flex items-center gap-2 mt-0.5">
                  {g.codename}
                  {selected.promoted && <CheckCircle2 size={15} className="text-[var(--green)]" />}
                  {selected.terminated && <XCircle size={15} className="text-[var(--red)]" />}
                </h2>
              </div>
              <Chip tone={selected.promoted ? 'green' : selected.terminated ? 'red' : 'amber'}>
                {selected.promoted ? 'Cross-validation passed (simulated)' : selected.status}
              </Chip>
            </div>

            <h3 className="hud-label !text-[0.6rem] mt-5 mb-2">Setup conditions — yeh rules milte hain tabhi entry</h3>
            <div className="space-y-2">
              {conditionRows(g).map((row) => (
                <div key={row.label} className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.74rem] font-semibold">{row.label}</p>
                    <p className="text-[0.62rem] dim mt-0.5">{row.note}</p>
                  </div>
                  <span className="font-mono text-[0.74rem] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Flow 4 — hand the setup into the Hypothesis comparator */}
            <button
              onClick={() => goHypothesis(g)}
              className="btn btn-primary w-full mt-4 py-2.5 rounded-lg text-[0.74rem] font-semibold flex items-center justify-center gap-2"
            >
              <Lightbulb size={14} /> Hypothesis banao — original vs modified compare karo
            </button>
          </section>

          {/* Live alignment + measured metrics */}
          <div className="xl:col-span-5 space-y-4">
            <section className="card p-5">
              <h3 className="text-[0.84rem] font-bold mb-3">Live condition alignment — {snapshot.focusSymbol.replace('_PERP', '')}</h3>
              <div className="space-y-2">
                {alignment.map((a) => (
                  <div key={a.label} className="flex items-center gap-2.5 text-[0.7rem]">
                    <span className={`w-5 h-5 rounded-full grid place-items-center shrink-0 border ${a.met ? 'text-[var(--green)] border-[rgba(29,184,134,0.45)] bg-[rgba(29,184,134,0.1)]' : 'dim border-white/10 bg-white/5'}`}>
                      {a.met ? <Check size={10} /> : <Clock size={9} />}
                    </span>
                    <span className={a.met ? '' : 'dim'}>{a.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[0.6rem] dim mt-3">Simulated real-time structure — koi live order place nahi hota.</p>
            </section>

            <section className="card p-5">
              <h3 className="text-[0.84rem] font-bold mb-3">Measured test metrics <span className="dim font-normal">(simulated backtest)</span></h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { l: 'Win rate', v: `${(selected.winRate * 100).toFixed(1)}%` },
                  { l: 'Profit factor', v: selected.profitFactor.toFixed(2) },
                  { l: 'Max DD', v: `${(selected.maxDrawdown * 100).toFixed(1)}%` },
                  { l: 'Trades', v: selected.trades.toLocaleString() },
                  { l: 'Fitness', v: `${(selected.fitness * 100).toFixed(0)}%` },
                  { l: 'Status', v: selected.promoted ? 'Active' : selected.terminated ? 'Rejected' : 'Testing' },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg py-2.5" style={{ background: 'rgba(255,255,255,0.035)' }}>
                    <p className="text-[0.78rem] font-bold font-mono">{s.v}</p>
                    <p className="text-[0.54rem] dim mt-0.5 uppercase tracking-wider">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[0.62rem] dim mb-1">
                  <span>Fitness wheel</span><span>{(selected.fitness * 100).toFixed(0)}%</span>
                </div>
                <Bar value={selected.fitness * 100} max={100} color={color} />
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ── Grid mode — all strategy pods ───────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <Dna size={18} className="text-[#8f7fe0]" /> AI Strategy Hatchery & Lab
        </h2>
        <p className="text-[0.72rem] dim mt-1">
          Genetic self-mutation engine — SMC, ICT, Volume Profile aur momentum parameters ko bina human input ke combine karta rehta hai. Card pe click karke setup conditions inspect karo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pods.map((pod) => {
          const color = statusColor(pod.status);
          return (
            <motion.button
              key={pod.genome.id}
              layout
              onClick={() => setSelectedPodId(pod.genome.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: pod.terminated ? 0.6 : 1, y: 0 }}
              className="card card-hover p-4 text-left"
              style={{ borderTop: `2px solid ${color}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[0.6rem] tracking-[0.22em] dim">GEN-{pod.genome.generation}</p>
                  <h4 className="font-bold text-[0.88rem] mt-0.5 flex items-center gap-1.5">
                    {pod.genome.codename}
                    {pod.status === 'Active in Execution Engine' && <CheckCircle2 size={13} className="text-[#8f7fe0]" />}
                    {pod.terminated && <XCircle size={13} className="text-[var(--red)]" />}
                  </h4>
                </div>
                <ProgressRing value={pod.fitness} size={56} stroke={5} color={color}>
                  <span className="text-[0.64rem] font-mono font-bold" style={{ color }}>{(pod.fitness * 100).toFixed(0)}</span>
                </ProgressRing>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                {[
                  { l: 'Win rate', v: `${(pod.winRate * 100).toFixed(1)}%` },
                  { l: 'Profit factor', v: pod.profitFactor.toFixed(2) },
                  { l: 'Max DD', v: `${(pod.maxDrawdown * 100).toFixed(1)}%` },
                ].map((s) => (
                  <div key={s.l} className="rounded-lg py-2" style={{ background: 'rgba(255,255,255,0.035)' }}>
                    <p className="text-[0.78rem] font-bold font-mono">{s.v}</p>
                    <p className="text-[0.54rem] dim mt-0.5 uppercase tracking-wider">{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-lg px-3 py-2 text-[0.66rem] font-semibold flex items-center gap-2" style={{ color, background: `${color}14`, border: `1px solid ${color}33` }}>
                {(pod.status.startsWith('Evolving') || pod.status.startsWith('Cross')) && <Loader2 size={11} className="animate-spin" />}
                {pod.status.startsWith('Highly') && <Zap size={11} />}
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
            </motion.button>
          );
        })}
      </div>

      <div className="card p-4">
        <h3 className="text-[0.88rem] font-bold mb-1 flex items-center gap-2">
          <Boxes size={15} className="text-[var(--accent)]" /> Omni-Asset Fit Stream
        </h3>
        <p className="text-[0.66rem] dim mb-4">
          Live strategy × asset compatibility — {snapshot?.sandbox.total ?? 300}+ instruments parallel paper trading (simulated)
        </p>
        <div className="space-y-2.5">
          {strategyIds.map((sid) => (
            <div key={sid} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[0.62rem] dim truncate font-mono">{nameFor(sid)}</span>
              <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0,1fr))' }}>
                {symbols.map((sym) => {
                  const cell = matrix.find((c) => c.strategyId === sid && c.symbol === sym);
                  const fit = cell?.fit ?? 20;
                  const bg = fit > 85 ? 'rgba(29,184,134,0.75)' : fit > 68 ? 'rgba(58,168,232,0.5)' : fit > 45 ? 'rgba(224,165,47,0.32)' : 'rgba(148,163,184,0.16)';
                  return <div key={sym} title={`${nameFor(sid)} × ${sym} — ${fit.toFixed(1)}%`} className="aspect-square rounded-[4px] transition-all duration-700" style={{ background: bg }} />;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-[0.62rem] dim flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(29,184,134,0.75)' }} /> High fit · simulated profit factor streaming</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(224,165,47,0.4)' }} /> Low volatility · idling</span>
        </div>

        <div className="mt-4 space-y-2">
          <p className="hud-label !text-[0.58rem]">Locked perfect-fit alerts</p>
          {(snapshot?.topFits ?? []).slice(0, 4).map((f) => (
            <div key={`${f.strategyId}-${f.symbol}`} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.035)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] breathe" />
              <span className="text-[0.7rem] flex-1">
                <b>{nameFor(f.strategyId)}</b> fitted with <b>{f.symbol}</b> — Compatibility{' '}
                <span className="text-[var(--green)] font-mono">{f.fit.toFixed(1)}%</span>
              </span>
              <Bar value={f.fit} max={100} color="var(--green)" className="w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <Chip tone="violet"><Dna size={11} /> Mutation loop background mein continuously chal raha hai — promotion hone par Miri khud broadcast karti hai. Sab metrics simulated cross-validation se aate hain, live trading disabled hai.</Chip>
      </div>
    </div>
  );
}
