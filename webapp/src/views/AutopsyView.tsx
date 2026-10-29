import { motion } from 'framer-motion';
import {
  BookOpenText, TrendingUp, TrendingDown, Minus, BrainCircuit, RefreshCw,
  Check, Lock, FlaskConical, FileSearch, ArrowRight,
} from 'lucide-react';
import { useStore } from '../state/store';
import { Chip } from '../components/ui/Primitives';
import { timeAgo, cn } from '../utils/cn';
import type { PostMortem } from '../engine/types';
import { proposalsFor, learningQueryFor, relatedTrades, testStatus } from '../utils/learning';

const LOOP_STEPS = ['Generate Hypothesis', 'Backtest', 'Analyse Results', 'Improve Strategy', 'Validate & Promote'];


export function AutopsyView() {
  const snapshot = useStore((s) => s.snapshot);
  const tab = useStore((s) => s.autopsyTab);
  const setTab = useStore((s) => s.setAutopsyTab);
  const selectedId = useStore((s) => s.selectedPostMortemId);
  const setSelectedId = useStore((s) => s.setSelectedPostMortemId);
  const setHypothesisQuery = useStore((s) => s.setHypothesisQuery);
  const setBacktestTab = useStore((s) => s.setBacktestTab);
  const setView = useStore((s) => s.setView);
  if (!snapshot) return null;

  const selected = snapshot.postMortems.find((p) => p.id === selectedId) ?? snapshot.postMortems[0];
  const baseline = snapshot.activeGenome;

  const goTest = (pm: PostMortem) => {
    setHypothesisQuery(learningQueryFor(pm));
    setBacktestTab('flash');
    setView('backtest');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <BookOpenText size={18} className="text-[var(--accent)]" /> Trade Autopsy & AI Learning Memory
        </h2>
        <Chip tone="amber">Simulated learning log · live trading disabled</Chip>
      </div>

      {/* Tabs — flow 6 lands on Post-mortems, flow 7 on Learning Loop */}
      <div className="card p-1 flex w-fit">
        <button
          onClick={() => setTab('postmortem')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.72rem] font-semibold transition-all', tab === 'postmortem' ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white')}
        >
          <FileSearch size={13} /> Post-mortems
        </button>
        <button
          onClick={() => setTab('learning')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.72rem] font-semibold transition-all', tab === 'learning' ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white')}
        >
          <RefreshCw size={13} /> Learning Loop
        </button>
      </div>

      {tab === 'postmortem' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {snapshot.postMortems.map((pm, i) => {
              const evidence = relatedTrades(pm, snapshot.recentTrades);
              const highlighted = selectedId === pm.id;
              return (
                <motion.article
                  key={pm.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.06, 0.3) }}
                  className={cn('card p-5', highlighted && 'ring-2 ring-[var(--accent)]')}
                >
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
                        <BrainCircuit size={12} /> Suspected failure reason
                      </h4>
                      <p className="text-[0.72rem] leading-relaxed mt-1.5 text-white/80">{pm.mistake}</p>
                    </section>
                    <section className="rounded-xl p-3" style={{ background: 'rgba(29,184,134,0.07)', border: '1px solid rgba(29,184,134,0.2)' }}>
                      <h4 className="text-[0.7rem] font-bold text-[var(--green)] flex items-center gap-1.5">
                        <TrendingUp size={12} /> Correction applied
                      </h4>
                      <p className="text-[0.72rem] leading-relaxed mt-1.5 text-white/80">{pm.correction}</p>
                    </section>

                    {/* Supporting evidence */}
                    <section className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                      <h4 className="text-[0.7rem] font-bold flex items-center gap-1.5 mb-2">
                        <FileSearch size={12} className="text-[var(--accent)]" /> Supporting evidence
                      </h4>
                      {evidence.length > 0 ? (
                        <div className="space-y-1.5">
                          {evidence.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 text-[0.66rem]">
                              {t.outcome === 'win' ? <TrendingUp size={11} className="text-[var(--green)]" /> : t.outcome === 'loss' ? <TrendingDown size={11} className="text-[var(--red)]" /> : <Minus size={11} className="dim" />}
                              <span className="font-mono shrink-0">{t.symbol}</span>
                              <span className="dim truncate flex-1">{t.reason}</span>
                              <span className={cn('font-mono shrink-0', t.pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                                ₹{Math.round(t.pnl).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[0.64rem] dim">
                          Engine learning log entry — probability shift {pm.previousProbability.toFixed(1)}% → {pm.newProbability.toFixed(1)}% simulated cross-validation se supported hai.
                        </p>
                      )}
                      <p className="text-[0.6rem] dim mt-2">{timeAgo(pm.at)} · simulated environment</p>
                    </section>
                  </div>

                  <footer className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[0.62rem] dim">was {pm.previousProbability.toFixed(1)}% → now {pm.newProbability.toFixed(1)}%</span>
                    {/* Flow 7 — take this lesson into the Learning Loop comparison */}
                    <button
                      onClick={() => { setSelectedId(pm.id); setTab('learning'); }}
                      className="btn btn-primary px-3 py-1.5 rounded-lg text-[0.66rem] font-semibold flex items-center gap-1"
                    >
                      Learning Loop compare <ArrowRight size={11} />
                    </button>
                  </footer>
                </motion.article>
              );
            })}
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
        </>
      )}

      {tab === 'learning' && selected && (
        <div className="space-y-4">
          {/* Loop stage rail */}
          <section className="card p-5">
            <h3 className="text-[0.88rem] font-bold mb-4 flex items-center gap-2">
              <RefreshCw size={15} className="text-[var(--green)]" /> Learning Loop — test → learn → improve
            </h3>
            <ol className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {LOOP_STEPS.map((step, i) => {
                const current = 3;
                const done = i < current;
                const active = i === current;
                const locked = i > current;
                return (
                  <li key={step} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.035)' }}>
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full grid place-items-center shrink-0 text-[0.62rem] font-bold',
                        done && 'bg-[rgba(29,184,134,0.18)] text-[var(--green)] border border-[rgba(29,184,134,0.4)]',
                        active && 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[rgba(58,168,232,0.5)] breathe',
                        locked && 'bg-white/5 dim border border-white/10',
                      )}
                    >
                      {done ? <Check size={11} /> : locked ? <Lock size={10} /> : i + 1}
                    </span>
                    <span className={cn('text-[0.66rem] leading-tight', active && 'text-white font-semibold', !active && 'dim')}>{step}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Flow 7 — baseline vs proposed changes */}
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <h3 className="text-[0.88rem] font-bold">Lesson: {selected.asset}</h3>
              <Chip tone={selected.action === 'BUY' ? 'green' : 'red'}>{selected.action} · {selected.outcome.split('—')[0].trim()}</Chip>
            </div>
            <p className="text-[0.68rem] dim mb-4">
              Baseline: <b className="text-white/80">{baseline.codename}</b> (GEN-{baseline.generation}) — neeche proposed changes tab tak untested amber mein hain jab tak Flash Backtest validate nahi karta.
            </p>

            <div className="space-y-2.5">
              {proposalsFor(selected, baseline).map((p) => {
                const tested = testStatus(p.testKeyword, snapshot.flashReports);
                return (
                  <div key={p.condition} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.035)' }}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-[0.74rem] font-semibold">{p.condition}</p>
                      {tested ? (
                        <Chip tone={tested.recommendation === 'GO' ? 'green' : 'red'}>
                          Flash-tested · {tested.recommendation} (simulated)
                        </Chip>
                      ) : (
                        <Chip tone="amber">Proposed · untested</Chip>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2.5">
                      <div className="rounded-lg p-2.5" style={{ background: 'rgba(148,163,184,0.08)' }}>
                        <p className="hud-label !text-[0.54rem] mb-1">Baseline</p>
                        <p className="text-[0.68rem] dim">{p.baseline}</p>
                      </div>
                      <div className="rounded-lg p-2.5" style={{ background: 'rgba(143,127,224,0.1)', border: '1px solid rgba(143,127,224,0.3)' }}>
                        <p className="hud-label !text-[0.54rem] mb-1 !text-[var(--violet)]">Proposed change</p>
                        <p className="text-[0.68rem] text-white/85">{p.proposed}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => goTest(selected)}
              className="btn btn-primary mt-4 px-5 py-2.5 rounded-lg text-[0.74rem] font-semibold flex items-center gap-2"
            >
              <FlaskConical size={14} /> In proposed changes ko Flash Backtest mein test karo
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
