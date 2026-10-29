import { motion } from 'framer-motion';
import {
  FlaskConical, Lightbulb, RefreshCw, Search, ShieldHalf, ChevronRight, Lock, Check, Trophy } from 'lucide-react';
import { useStore } from '../../state/store';
import { Bar } from '../ui/Primitives';
import { compactInr, cn } from '../../utils/cn';
import type { PodStatus } from '../../engine/types';

function CardShell({
  icon: Icon, title, subtitle, accent, onOpen, children,
}: {
  icon: typeof FlaskConical; title: string; subtitle: string; accent: string;
  onOpen?: () => void; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="card card-hover p-4 flex flex-col"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `${accent}1c`, border: `1px solid ${accent}40` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[0.84rem] font-bold truncate">{title}</h3>
          <p className="text-[0.6rem] dim truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
      {onOpen && (
        <button onClick={onOpen} className="btn mt-3 py-1.5 text-[0.68rem] font-semibold flex items-center justify-center gap-1">
          View Details <ChevronRight size={12} />
        </button>
      )}
    </motion.section>
  );
}

function Badge({ label }: { label: PodStatus | string }) {
  const tone =
    label.startsWith('Highly') || label === 'Ready' || label === 'Validated'
      ? { c: 'var(--green)', bg: 'rgba(29,184,134,0.1)' }
      : label.startsWith('Failed') || label === 'Rejected'
        ? { c: 'var(--red)', bg: 'rgba(229,83,107,0.1)' }
        : label === 'Testing' || label.startsWith('Evolving') || label.startsWith('Cross')
          ? { c: 'var(--amber)', bg: 'rgba(224,165,47,0.1)' }
          : { c: 'var(--accent)', bg: 'var(--accent-soft)' };
  return (
    <span className="chip !text-[0.58rem] !py-0.5" style={{ color: tone.c, background: tone.bg, borderColor: `${tone.c}44` }}>
      {label.startsWith('Evolving') || label.startsWith('Cross') ? 'Testing' : label.startsWith('Highly') ? 'Ready' : label.startsWith('Failed') ? 'Rejected' : label === 'Active in Execution Engine' ? 'Active' : label}
    </span>
  );
}

export function StrategyLabCard({ onOpen }: { onOpen: () => void }) {
  const pods = useStore((s) => s.snapshot?.pods ?? []);
  const list = pods.slice(0, 4);
  return (
    <CardShell icon={FlaskConical} title="Strategy Lab" subtitle="AI se test ki gayi top strategies" accent="#3aa8e8" onOpen={onOpen}>
      <div className="space-y-2.5">
        {list.map((p, i) => (
          <div key={p.genome.id} className="flex items-center gap-2">
            <span className="text-[0.68rem] dim w-3 shrink-0">{i + 1}.</span>
            <span className="text-[0.7rem] font-medium flex-1 truncate">{p.genome.codename}</span>
            <Badge label={p.status} />
          </div>
        ))}
      </div>
      <p className="text-[0.56rem] dim mt-2.5">Green badges sirf simulated cross-validation pass karne pe</p>
    </CardShell>
  );
}

export function StrategyRegistryCard({ onOpen }: { onOpen: () => void }) {
  const registry = useStore((s) => s.snapshot?.registry ?? []);
  const activeId = useStore((s) => s.snapshot?.registryActiveId ?? null);
  const list = registry.slice(0, 4);
  return (
    <CardShell icon={Trophy} title="Strategy Registry" subtitle="Best validated strategies — ek jagah" accent="#ffc24b" onOpen={onOpen}>
      {list.length === 0 ? (
        <p className="text-[0.68rem] dim leading-relaxed">
          Abhi khaali hai. Har trade ke baad autopsy auto-learn karke rule change banata hai; jo cross-validation me
          baseline se jeete, wahi yahan store hota hai.
        </p>
      ) : (
        <div className="space-y-2.5">
          {list.map((e, i) => (
            <div key={e.id} className="flex items-center gap-2">
              <span className="text-[0.68rem] dim w-3 shrink-0">{i + 1}.</span>
              <span className="text-[0.7rem] font-medium flex-1 truncate">{e.codename}</span>
              {e.id === activeId && <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md" style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}>ACTIVE</span>}
              <Badge label={e.verdict === 'validated' ? `CV ${(e.metrics.cvFitness * 100).toFixed(0)}%` : e.verdict} />
            </div>
          ))}
        </div>
      )}
      <p className="text-[0.56rem] dim mt-2.5">Validated = asli cross-validation pass · paper trade aur backtest dono me use kar sakte ho</p>
    </CardShell>
  );
}

export function HypothesisCard({ onOpen }: { onOpen: () => void }) {
  const pods = useStore((s) => s.snapshot?.pods ?? []);
  const reports = useStore((s) => s.snapshot?.flashReports ?? []);
  const items = reports.length
    ? reports.slice(0, 3).map((r) => ({ name: r.query.length > 34 ? r.query.slice(0, 34) + '…' : r.query, pct: r.winRate * 100, tag: r.recommendation === 'GO' ? 'Validated' : 'Rejected' }))
    : pods.slice(0, 3).map((p) => ({ name: `${p.genome.codename} hypothesis`, pct: p.fitness * 100, tag: p.promoted ? 'Validated' : p.terminated ? 'Rejected' : 'Testing' }));

  return (
    <CardShell icon={Lightbulb} title="Hypothesis Engine" subtitle="Nayi soch. Better results." accent="#9d8cff" onOpen={onOpen}>
      <div className="space-y-3">
        {items.map((h, i) => (
          <div key={i}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[0.68rem] font-medium truncate flex-1">Hypothesis #{12 - i} · {h.name}</span>
              <Badge label={h.tag} />
            </div>
            <div className="flex items-center gap-2">
              <Bar value={h.pct} max={100} color={h.tag === 'Rejected' ? 'var(--red)' : h.tag === 'Validated' ? 'var(--green)' : 'var(--accent)'} />
              <span className="text-[0.66rem] font-mono dim w-9 text-right">{h.pct.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[0.56rem] dim mt-2.5">Validated = actual Flash Backtest ya CV result (simulated)</p>
    </CardShell>
  );
}

const LOOP_STEPS = ['Generate Hypothesis', 'Backtest', 'Analyse Results', 'Improve Strategy', 'Validate & Promote'];

export function LearningLoopCard({ onOpen }: { onOpen: () => void }) {
  const current = 3; // step 4 highlighted, matching the autonomous loop cadence
  return (
    <CardShell icon={RefreshCw} title="Learning Loop" subtitle="Test → Learn → Improve" accent="#16d99c" onOpen={onOpen}>
      <ol className="space-y-2">
        {LOOP_STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const locked = i > current;
          return (
            <li key={step} className="flex items-center gap-2.5">
              <span
                className={cn(
                  'w-5 h-5 rounded-full grid place-items-center shrink-0 text-[0.6rem] font-bold',
                  done && 'bg-[rgba(29,184,134,0.18)] text-[var(--green)] border border-[rgba(29,184,134,0.4)]',
                  active && 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[rgba(58,168,232,0.5)] breathe',
                  locked && 'bg-white/5 dim border border-white/10',
                )}
              >
                {done ? <Check size={10} /> : locked ? <Lock size={9} /> : i + 1}
              </span>
              <span className={cn('text-[0.7rem]', active ? 'text-white font-semibold' : done ? 'dim' : 'dim opacity-70')}>{step}</span>
            </li>
          );
        })}
      </ol>
    </CardShell>
  );
}

export function TradeAutopsyCard({ onOpen }: { onOpen: () => void }) {
  const trades = useStore((s) => s.snapshot?.recentTrades ?? []);
  const postMortems = useStore((s) => s.snapshot?.postMortems ?? []);
  const last = trades[0];
  const lesson = postMortems[0];

  return (
    <CardShell icon={Search} title="Trade Autopsy" subtitle="Har trade se seekho" accent="#ffc24b" onOpen={onOpen}>
      {last ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-semibold">Last Trade: {last.symbol} ({last.side})</span>
            <Badge label={last.outcome === 'win' ? 'Validated' : last.outcome === 'loss' ? 'Loss' : 'Testing'} />
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.035)' }}>
            <p className="text-[0.62rem] hud-label !text-[0.56rem]">Why?</p>
            <p className="text-[0.68rem] dim mt-0.5 leading-snug">{last.reason}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.035)' }}>
            <p className="text-[0.62rem] hud-label !text-[0.56rem]">Root Cause</p>
            <p className="text-[0.68rem] dim mt-0.5 leading-snug line-clamp-3">
              {lesson?.mistake ?? 'Awaiting enough closed trades for pattern analysis.'}
            </p>
          </div>
          <p className="text-[0.66rem] font-mono" style={{ color: last.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            P&L {compactInr(last.pnl)}
          </p>
        </div>
      ) : (
        <p className="text-[0.7rem] dim text-center py-6">Abhi koi closed trade nahi — jaise hi position square-off hogi, autopsy yahan aayega.</p>
      )}
    </CardShell>
  );
}

export function RiskCentreCard({ onOpen }: { onOpen: () => void }) {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const rows = [
    { label: 'Max Risk Per Trade', value: `${(snapshot.risk.hardStopPct * 100).toFixed(1)}%` },
    { label: 'Daily Loss Limit', value: '2.0%' },
    { label: 'Max Drawdown', value: `${Math.abs(snapshot.risk.drawdownPct * 100).toFixed(2)}%` },
    { label: 'Leverage', value: '3x max' },
  ];
  return (
    <CardShell icon={ShieldHalf} title="Risk Centre" subtitle="Capital hi game hai" accent="#ff5470" onOpen={onOpen}>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[0.68rem] dim">{r.label}</span>
            <span className="text-[0.72rem] font-bold font-mono">{r.value}</span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}
