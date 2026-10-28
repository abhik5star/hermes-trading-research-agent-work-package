import { motion } from 'framer-motion';
import { BrainCircuit, TrendingUp, TrendingDown, Minus, BookOpenText } from 'lucide-react';
import { useStore } from '../state/store';
import { Panel, Chip } from '../components/ui/Primitives';
import { timeAgo, cn } from '../utils/cn';

export function LearningView() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold heading-accent flex items-center gap-2">
          <BookOpenText size={19} className="neon-text" /> AI Brain Learning Log & Post-Mortem Panel
        </h2>
        <p className="text-xs dim mt-1">Every closed trade becomes a structured mistake → correction → new probability lesson</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {snapshot.postMortems.map((pm, i) => (
          <motion.article
            key={pm.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.07, 0.4) }}
            className="glass rounded-3xl p-5 relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl bg-neon-violet/15" />
            <header className="flex items-start justify-between gap-3 relative">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{pm.asset}</h3>
                  <Chip tone={pm.action === 'BUY' ? 'green' : 'red'}>{pm.action}</Chip>
                </div>
                <p className="text-[0.7rem] dim mt-1">{pm.outcome}</p>
              </div>
              <div
                className="rounded-2xl px-3 py-2 text-right shrink-0"
                style={{ border: '1px solid rgba(45,255,176,0.4)', background: 'rgba(45,255,176,0.08)', boxShadow: '0 0 18px rgba(45,255,176,0.18)' }}
              >
                <p className="text-[0.58rem] dim tracking-widest uppercase">New backtest profit probability</p>
                <p className="text-lg font-mono font-semibold text-neon-green leading-tight">{pm.newProbability.toFixed(1)}%</p>
                <p className="text-[0.64rem] text-neon-green font-mono">[+{pm.delta.toFixed(1)}%]</p>
              </div>
            </header>

            <div className="mt-4 space-y-3 relative">
              <section className="rounded-2xl bg-neon-red/[0.06] border border-neon-red/20 p-3">
                <h4 className="text-[0.72rem] font-semibold text-neon-red flex items-center gap-1.5">
                  <BrainCircuit size={12} /> Kya Galti Hui? <span className="dim font-normal">(What was the mistake?)</span>
                </h4>
                <p className="text-[0.74rem] leading-relaxed mt-1.5 text-white/100">{pm.mistake}</p>
              </section>
              <section className="rounded-2xl bg-neon-green/[0.06] border border-neon-green/20 p-3">
                <h4 className="text-[0.72rem] font-semibold text-neon-green flex items-center gap-1.5">
                  <TrendingUp size={12} /> Kya Sudhar Hua? <span className="dim font-normal">(What was corrected?)</span>
                </h4>
                <p className="text-[0.74rem] leading-relaxed mt-1.5 text-white/100">{pm.correction}</p>
              </section>
            </div>

            <footer className="flex items-center justify-between mt-3 relative">
              <span className="text-[0.62rem] dim">
                was {pm.previousProbability.toFixed(1)}% → now {pm.newProbability.toFixed(1)}%
              </span>
              <span className="text-[0.62rem] dim">{timeAgo(pm.at)}</span>
            </footer>
          </motion.article>
        ))}
      </div>

      <Panel title="Recent Execution History" subtitle="Autonomous paper / live neural trades">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
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
                <tr><td colSpan={6} className="dim text-center py-8">Trades will appear here as the brain executes.</td></tr>
              )}
              {snapshot.recentTrades.map((t) => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-4 font-medium">{t.symbol}</td>
                  <td className="pr-4">
                    <span className={cn('font-mono', t.side === 'BUY' ? 'text-neon-green' : 'text-neon-red')}>{t.side}</span>
                  </td>
                  <td className="pr-4">
                    <span className="inline-flex items-center gap-1">
                      {t.outcome === 'win' ? <TrendingUp size={12} className="text-neon-green" /> : t.outcome === 'loss' ? <TrendingDown size={12} className="text-neon-red" /> : <Minus size={12} className="dim" />}
                      {t.outcome}
                    </span>
                  </td>
                  <td className={cn('pr-4 font-mono', t.pnl >= 0 ? 'text-neon-green' : 'text-neon-red')}>
                    ₹{Math.round(t.pnl).toLocaleString('en-IN')}
                  </td>
                  <td className="pr-4 dim max-w-[260px] truncate">{t.reason}</td>
                  <td className="dim">{timeAgo(t.closedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
