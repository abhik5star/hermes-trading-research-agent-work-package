import { Dna, Boxes, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../state/store';
import { ProgressRing, Chip, Bar } from '../components/ui/Primitives';

function statusColor(status: string): string {
  if (status.startsWith('Evolving') || status.startsWith('Cross')) return '#ffc24b';
  if (status.startsWith('Highly')) return '#16d99c';
  if (status.startsWith('Failed')) return '#ff5470';
  return '#9d8cff';
}

export function LabView() {
  const pods = useStore((s) => s.snapshot?.pods ?? []);
  const matrix = useStore((s) => s.snapshot?.fitMatrix ?? []);
  const topFits = useStore((s) => s.snapshot?.topFits ?? []);
  const strategyIds = [...new Set(matrix.map((c) => c.strategyId))].slice(0, 3);
  const symbols = [...new Set(matrix.map((c) => c.symbol))].slice(0, 14);
  const nameFor = (id: string) => pods.find((p) => p.genome.id === id)?.genome.codename ?? id.slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <Dna size={18} className="text-[#9d8cff]" /> AI Strategy Hatchery & Lab
        </h2>
        <p className="text-[0.72rem] dim mt-1">
          Genetic self-mutation engine — SMC, ICT, Volume Profile aur momentum parameters ko bina human input ke combine karta rehta hai
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {pods.map((pod) => {
          const color = statusColor(pod.status);
          return (
            <motion.div
              key={pod.genome.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: pod.terminated ? 0.6 : 1, y: 0 }}
              className="card card-hover p-4"
              style={{ borderTop: `2px solid ${color}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[0.6rem] tracking-[0.22em] dim">GEN-{pod.genome.generation}</p>
                  <h4 className="font-bold text-[0.88rem] mt-0.5 flex items-center gap-1.5">
                    {pod.genome.codename}
                    {pod.status === 'Active in Execution Engine' && <CheckCircle2 size={13} className="text-[#9d8cff]" />}
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
            </motion.div>
          );
        })}
      </div>

      <div className="card p-4">
        <h3 className="text-[0.88rem] font-bold mb-1 flex items-center gap-2">
          <Boxes size={15} className="text-[var(--accent)]" /> Omni-Asset Fit Stream
        </h3>
        <p className="text-[0.66rem] dim mb-4">
          Live strategy × asset compatibility — {useStore.getState().snapshot?.sandbox.total ?? 300}+ instruments parallel paper trading
        </p>
        <div className="space-y-2.5">
          {strategyIds.map((sid) => (
            <div key={sid} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[0.62rem] dim truncate font-mono">{nameFor(sid)}</span>
              <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: 'repeat(14, minmax(0,1fr))' }}>
                {symbols.map((sym) => {
                  const cell = matrix.find((c) => c.strategyId === sid && c.symbol === sym);
                  const fit = cell?.fit ?? 20;
                  const bg = fit > 85 ? 'rgba(22,217,156,0.75)' : fit > 68 ? 'rgba(39,214,245,0.5)' : fit > 45 ? 'rgba(255,194,75,0.32)' : 'rgba(148,163,184,0.16)';
                  return <div key={sym} title={`${nameFor(sid)} × ${sym} — ${fit.toFixed(1)}%`} className="aspect-square rounded-[4px] transition-all duration-700" style={{ background: bg }} />;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-[0.62rem] dim flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(22,217,156,0.75)' }} /> High fit · profit factor streaming</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(255,194,75,0.4)' }} /> Low volatility · idling</span>
        </div>

        <div className="mt-4 space-y-2">
          <p className="hud-label !text-[0.58rem]">Locked perfect-fit alerts</p>
          {topFits.slice(0, 4).map((f) => (
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
        <Chip tone="violet"><Dna size={11} /> Mutation loop background mein continuously chal raha hai — promotion hone par Miri khud broadcast karti hai</Chip>
      </div>
    </div>
  );
}
