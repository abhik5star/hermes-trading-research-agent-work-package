import { useState } from 'react';
import {
  Trophy, CheckCircle2, XCircle, Rocket, FlaskConical, ShieldCheck, BrainCircuit, Loader2,
} from 'lucide-react';
import { useStore } from '../../state/store';
import { Chip } from '../ui/Primitives';
import { timeAgo } from '../../utils/cn';
import type { RegistryEntry } from '../../engine/strategyRegistry';

/**
 * Strategy Registry — the single place where the best strategies live.
 *
 * Entries arrive here from the auto-learning loop (a post-mortem produced a
 * rule change, the change was backtested for real and it won) and from the
 * genetic lab. A green badge only ever appears for an entry whose metrics came
 * from an actual cross-validation run.
 *
 * Every entry can be handed straight to paper trading or to the backtester.
 */
export function StrategyRegistryPanel() {
  const snapshot = useStore((s) => s.snapshot);
  const activeId = useStore((s) => s.snapshot?.registryActiveId ?? null);
  const activateStrategy = useStore((s) => s.activateStrategy);
  const backtestStrategy = useStore((s) => s.backtestStrategy);
  const setBacktestTab = useStore((s) => s.setBacktestTab);
  const setView = useStore((s) => s.setView);
  const [busyId, setBusyId] = useState<string | null>(null);

  const entries = snapshot?.registry ?? [];

  if (!entries.length) {
    return (
      <div className="card p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl grid place-items-center" style={{ background: 'var(--accent-soft)', border: '1px solid var(--panel-border)' }}>
          <Trophy size={22} className="text-[var(--accent)]" />
        </div>
        <h3 className="font-bold mt-3">Registry abhi khaali hai</h3>
        <p className="text-[0.72rem] dim mt-1.5 max-w-lg mx-auto leading-relaxed">
          Har trade ke baad autopsy ek post-mortem banata hai. Auto-learning us post-mortem se ek rule change
          banata hai, use cross-validation se test karta hai aur <b>Sirf tabhi</b> yahan store karta hai jab wo
          baseline strategy se sach me behtar nikle. Phir ise paper trading aur backtest me use kar sakte ho.
        </p>
        <p className="text-[0.64rem] dim mt-3">Pehla validated strategy aate hi yahan dikhega.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
            <Trophy size={18} className="text-[var(--amber)]" /> Strategy Registry
          </h2>
          <p className="text-[0.72rem] dim mt-1">
            Sabse best strategies ek hi jagah — autopsy auto-learning ne cross-validation pass kiye, yahan store hue hain.
            Ek click me paper trading ya backtest me use karo.
          </p>
        </div>
        <Chip tone="cyan">{entries.length} stored</Chip>
      </div>

      {entries.map((entry, idx) => (
        <RegistryCard
          key={entry.id}
          entry={entry}
          rank={idx + 1}
          active={entry.id === activeId}
          busy={busyId === entry.id}
          onActivate={() => activateStrategy(entry.id)}
          onBacktest={async () => {
            setBusyId(entry.id);
            await backtestStrategy(entry.id);
            setBacktestTab('flash');
            setView('backtest');
            setBusyId(null);
          }}
        />
      ))}
    </div>
  );
}

function RegistryCard({
  entry, rank, active, busy, onActivate, onBacktest,
}: {
  entry: RegistryEntry;
  rank: number;
  active: boolean;
  busy: boolean;
  onActivate: () => void;
  onBacktest: () => void;
}) {
  const validated = entry.verdict === 'validated';
  const color = validated ? 'var(--green)' : entry.verdict === 'rejected' ? 'var(--red)' : 'var(--amber)';
  const m = entry.metrics;

  return (
    <div className="card p-4" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-start gap-3 flex-wrap">
        {/* rank */}
        <div
          className="w-9 h-9 rounded-xl grid place-items-center font-mono font-bold text-[0.8rem] shrink-0"
          style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}
          title={`Rank #${rank}`}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-[0.88rem]">{entry.codename}</h4>
            {active && (
              <span className="chip !text-[0.56rem] font-bold flex items-center gap-1" style={{ color: 'var(--accent)', borderColor: 'rgba(58,168,232,0.45)' }}>
                <Rocket size={9} /> PAPER TRADING MEIN ACTIVE
              </span>
            )}
            <span
              className="chip !text-[0.56rem] font-bold flex items-center gap-1"
              style={{ color, borderColor: `${color}55` }}
            >
              {validated ? <CheckCircle2 size={10} /> : entry.verdict === 'rejected' ? <XCircle size={10} /> : <ShieldCheck size={10} />}
              {validated ? 'VALIDATED' : entry.verdict === 'rejected' ? 'REJECTED' : 'UNTESTED'}
            </span>
            <span className="chip !text-[0.56rem] flex items-center gap-1">
              {entry.source === 'autopsy-learning' ? <BrainCircuit size={10} /> : <FlaskConical size={10} />}
              {entry.source === 'autopsy-learning' ? 'AUTO-LEARNED' : 'LAB'}
            </span>
            <span className="text-[0.58rem] dim ml-auto">{timeAgo(entry.createdAt)}</span>
          </div>

          {/* the mistake it fixed */}
          <p className="text-[0.66rem] dim mt-1.5 leading-snug">
            <span className="font-semibold text-white/80">Fixes: </span>
            {entry.origin}
          </p>

          {/* parameter changes */}
          {entry.changes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {entry.changes.map((c) => (
                <span key={c.param} className="text-[0.6rem] font-mono px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {c.param} <span className="dim">{c.from}</span> → <span style={{ color: 'var(--accent)' }}>{c.to}</span>
                </span>
              ))}
            </div>
          )}

          {/* real metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
            {[
              { l: 'CV fitness', v: `${(m.cvFitness * 100).toFixed(1)}%` },
              { l: 'Win rate', v: `${(m.winRate * 100).toFixed(1)}%` },
              { l: 'Profit factor', v: m.profitFactor.toFixed(2) },
              { l: 'Max DD', v: `${(m.maxDrawdown * 100).toFixed(1)}%` },
              { l: 'Trades', v: String(m.trades) },
            ].map((s) => (
              <div key={s.l} className="rounded-lg py-2 text-center" style={{ background: 'rgba(255,255,255,0.035)' }}>
                <p className="text-[0.78rem] font-bold font-mono">{s.v}</p>
                <p className="text-[0.52rem] dim mt-0.5 uppercase tracking-wider">{s.l}</p>
              </div>
            ))}
          </div>

          {/* flash backtest evidence — a separate single-symbol run */}
          {entry.report ? (
            <p className="text-[0.62rem] dim mt-2 leading-snug">
              Single-symbol Flash test:{' '}
              <span className="font-bold" style={{ color: entry.report.recommendation === 'GO' ? 'var(--green)' : 'var(--amber)' }}>
                {entry.report.recommendation}
              </span>{' '}
              · {(entry.report.winRate * 100).toFixed(1)}% WR · PF {entry.report.profitFactor.toFixed(2)} · {entry.report.trades} trades
              {entry.testQuery && <span className="ml-1">· “{entry.testQuery}”</span>}
              <span className="ml-1">— promotion ka basis 3-instrument cross-validation hai, yeh ek alag single-symbol run hai.</span>
            </p>
          ) : (
            <p className="text-[0.62rem] dim mt-2">Flash Backtest abhi nahi chala — metrics cross-validation se hain.</p>
          )}
        </div>

        {/* actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onActivate}
            disabled={!validated || active}
            className="btn btn-primary px-3 py-2 rounded-lg text-[0.68rem] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title={validated ? 'Is strategy ko paper trading me activate karo' : 'Sirf validated strategy hi paper trading me ja sakti hai'}
          >
            <Rocket size={12} /> {active ? 'Active' : 'Paper trade'}
          </button>
          <button
            onClick={onBacktest}
            disabled={busy}
            className="btn px-3 py-2 rounded-lg text-[0.68rem] font-semibold flex items-center justify-center gap-1.5"
            title="Isi strategy ka Flash Backtest chalao"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <FlaskConical size={12} />} Backtest
          </button>
        </div>
      </div>
    </div>
  );
}
