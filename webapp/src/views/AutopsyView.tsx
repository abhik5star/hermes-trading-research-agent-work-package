import { motion } from 'framer-motion';
import { BookOpenText, TrendingUp, TrendingDown, Minus, BrainCircuit } from 'lucide-react';
import { useStore } from '../state/store';
import { Chip } from '../components/ui/Primitives';
import { timeAgo, cn } from '../utils/cn';

export function AutopsyView() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <BookOpenText size={18} className="text-[var(--accent)]" /> Trade Autopsy & AI Learning Memory
        </h2>
        <p className="text-[0.72rem] dim mt-1">Har band trade → Mistake → Correction → New Probability. Yahi Miri ki self-learning memory hai.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {snapshot.postMortems.map((pm, i) => (
          <motion.article key={pm.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.06, 0.3) }} className="card p-5">
            <header className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-[0.9rem]">{pm.asset}</h3>
                  <Chip tone={pm.action === 'BUY' ? 'green' : 'red'}>{pm.action}</Chip>
                </div>
                <p className="text-[0.66rem] dim mt-1">{pm.outcome}</p>
              </div>
              <div className="rounded-xl px-3 py-2 text-right shrink-0" style={{ border: '1px solid rgba(29,184,134,0.4)', background: 'rgba(29,184,134,0.08)' }}>
                <p className="text-[0.54rem] dim tracking-widest uppercase">New profit probability</p>
                <p className="text-[1rem] font-mono font-bold text-[var(--green)] leading-tight">{pm.newProbability.toFixed(1)}%</p>
                <p className="text-[0.62rem] font-mono text-[var(--green)]">[+{pm.delta.toFixed(1)}%]</p>
              </div>
            </header>

            <div className="mt-4 space-y-3">
              <section className="rounded-xl p-3" style={{ background: 'rgba(229,83,107,0.07)', border: '1px solid rgba(229,83,107,0.2)' }}>
                <h4 className="text-[0.7rem] font-bold text-[var(--red)] flex items-center gap-1.5">
                  <BrainCircuit size={12} /> Kya Galti Hui? <span className="dim font-normal">(What went wrong?)</span>
                </h4>
                <p className="text-[0.72rem] leading-relaxed mt-1.5 text-white/80">{pm.mistake}</p>
              </section>
              <section className="rounded-xl p-3" style={{ background: 'rgba(29,184,134,0.07)', border: '1px solid rgba(29,184,134,0.2)' }}>
                <h4 className="text-[0.7rem] font-bold text-[var(--green)] flex items-center gap-1.5">
                  <TrendingUp size={12} /> Kya Sudhar Hua? <span className="dim font-normal">(What was corrected?)</span>
                </h4>
                <p className="text-[0.72rem] leading-relaxed mt-1.5 text-white/80">{pm.correction}</p>
              </section>
            </div>

            <footer className="flex items-center justify-between mt-3">
              <span className="text-[0.62rem] dim">was {pm.previousProbability.toFixed(1)}% → now {pm.newProbability.toFixed(1)}%</span>
              <span className="text-[0.62rem] dim">{timeAgo(pm.at)}</span>
            </footer>
          </motion.article>
        ))}
      </div>

      <div className="card p-4">
        <h3 className="text-[0.88rem] font-bold mb-3">Execution History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.72rem]">
            <thead>
              <tr className="dim text-left">
                <th className="font-normal py-2 pr-4">Asset</th>
                <th className="font-normal pr-4">Side</th>
                <th className="font-normal pr-4">Outcome</th>
                <th className="font-normal pr-4">P&L</th>
                <th className="font-normal pr-4">Reason</th>
                <th className="font-normal">Closed</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.recentTrades.length === 0 && (
                <tr><td colSpan={6} className="dim text-center py-8">Trades yahan dikhenge jaise hi brain positions close karega.</td></tr>
              )}
              {snapshot.recentTrades.map((t) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-4 font-semibold">{t.symbol}</td>
                  <td className="pr-4">
                    <span className={cn('font-mono', t.side === 'BUY' ? 'text-[var(--green)]' : 'text-[var(--red)]')}>{t.side}</span>
                  </td>
                  <td className="pr-4">
                    <span className="inline-flex items-center gap-1">
                      {t.outcome === 'win' ? <TrendingUp size={12} className="text-[var(--green)]" /> : t.outcome === 'loss' ? <TrendingDown size={12} className="text-[var(--red)]" /> : <Minus size={12} className="dim" />}
                      {t.outcome}
                    </span>
                  </td>
                  <td className={cn('pr-4 font-mono', t.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                    ₹{Math.round(t.pnl).toLocaleString('en-IN')}
                  </td>
                  <td className="pr-4 dim max-w-[260px] truncate">{t.reason}</td>
                  <td className="dim">{timeAgo(t.closedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
