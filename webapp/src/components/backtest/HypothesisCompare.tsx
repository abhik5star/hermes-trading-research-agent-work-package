import { useMemo, useState } from 'react';
import { ArrowRight, FlaskConical, Loader2, Info } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { Chip } from '../ui/Primitives';
import { cn } from '../../utils/cn';
import type { StrategyGenome } from '../../engine/types';
import { hypothesisQueryFor } from '../../views/LabView';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Deterministic proposed mutation of the selected (or active) genome. */
function buildVariant(base: StrategyGenome): StrategyGenome {
  return {
    ...base,
    id: `${base.id}-v2`,
    codename: `${base.codename}-V2`,
    donchianPeriod: clamp(base.donchianPeriod + 4, 10, 40),
    rsiOversold: clamp(base.rsiOversold - 2, 22, 45),
    rsiOverbought: clamp(base.rsiOverbought + 2, 55, 82),
    fvgDepth: clamp(base.fvgDepth + 1, 1, 4),
    supertrendMult: clamp(+(base.supertrendMult + 0.4).toFixed(1), 1.8, 4.5),
    emaFast: clamp(base.emaFast + 1, 9, 34),
    emaSlow: base.emaSlow,
  };
}

const FIELDS: { key: keyof StrategyGenome; label: string; reason: string; fmt?: (v: number) => string }[] = [
  { key: 'donchianPeriod', label: 'Donchian period', reason: 'Lamba lookback → kam false breakouts, wider structural moves', fmt: (v) => `${v}` },
  { key: 'rsiOversold', label: 'RSI oversold', reason: 'Thoda lower threshold → behtar discount-zone entries', fmt: (v) => `${v}` },
  { key: 'rsiOverbought', label: 'RSI overbought', reason: 'Higher exit band → winners ko run karne ki jagah', fmt: (v) => `${v}` },
  { key: 'fvgDepth', label: 'FVG depth', reason: 'Extra confirmation candle → weak imbalances filter', fmt: (v) => `${v}` },
  { key: 'supertrendMult', label: 'Supertrend multiplier', reason: 'Wider trail → normal noise pe stop-out kam', fmt: (v) => `×${v.toFixed(1)}` },
  { key: 'emaFast', label: 'EMA fast', reason: 'Ek period shift → whipsaw ke against smoothing', fmt: (v) => `${v}` },
];

export function HypothesisCompare() {
  const snapshot = useStore((s) => s.snapshot);
  const selectedPodId = useStore((s) => s.selectedPodId);
  const query = useStore((s) => s.hypothesisQuery);
  const setHypothesisQuery = useStore((s) => s.setHypothesisQuery);
  const setBacktestTab = useStore((s) => s.setBacktestTab);
  const [busy, setBusy] = useState(false);

  const base = useMemo<StrategyGenome>(() => {
    const pod = snapshot?.pods.find((p) => p.genome.id === selectedPodId);
    return pod?.genome ?? snapshot?.activeGenome ?? snapshot?.pods[0]?.genome ?? ({} as StrategyGenome);
  }, [snapshot, selectedPodId]);

  const variant = useMemo(() => (base.id ? buildVariant(base) : null), [base]);
  const effectiveQuery = query || (variant ? hypothesisQueryFor(base) : '');

  const runBacktest = async () => {
    if (!effectiveQuery || busy) return;
    setBusy(true);
    setHypothesisQuery(effectiveQuery);
    await brain.flashTest(effectiveQuery);
    setBusy(false);
    setBacktestTab('flash');
  };

  if (!snapshot || !variant) return null;

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-start gap-3" style={{ borderColor: 'rgba(224,165,47,0.4)' }}>
        <Info size={16} className="text-[var(--amber)] shrink-0 mt-0.5" />
        <p className="text-[0.7rem] dim leading-relaxed">
          Yeh <b className="text-white/85">hypothesis comparison</b> hai — original strategy aur ek proposed modification ke parameters side-by-side.
          Green "profitable" status tab tak nahi aayega jab tak Flash Backtest actual simulated results nahi de deta. Live trading prototype mein disabled hai.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[0.88rem]">Original strategy</h3>
            <Chip tone="cyan">Baseline</Chip>
          </div>
          <p className="text-[0.72rem] font-mono dim mb-4">{base.codename} · GEN-{base.generation}</p>
          <div className="space-y-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.035)' }}>
                <span className="text-[0.7rem] dim">{f.label}</span>
                <span className="text-[0.74rem] font-mono font-bold">{f.fmt ? f.fmt(base[f.key] as number) : String(base[f.key])}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Modified */}
        <section className="card p-5" style={{ borderColor: 'rgba(143,127,224,0.45)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[0.88rem]">Modified variant</h3>
            <Chip tone="violet">Proposed · untested</Chip>
          </div>
          <p className="text-[0.72rem] font-mono dim mb-4">{variant.codename} · hypothesis draft</p>
          <div className="space-y-2">
            {FIELDS.map((f) => {
              const changed = base[f.key] !== variant[f.key];
              return (
                <div
                  key={f.key}
                  className="rounded-lg px-3 py-2"
                  style={{ background: changed ? 'rgba(143,127,224,0.1)' : 'rgba(255,255,255,0.035)', border: changed ? '1px solid rgba(143,127,224,0.35)' : '1px solid transparent' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.7rem] dim">{f.label}</span>
                    <span className="flex items-center gap-1.5 text-[0.74rem] font-mono font-bold">
                      {changed && <span className="dim line-through text-[0.66rem]">{f.fmt ? f.fmt(base[f.key] as number) : String(base[f.key])}</span>}
                      {changed && <ArrowRight size={11} className="text-[var(--violet)]" />}
                      <span className={cn(changed && 'text-[var(--violet)]')}>{f.fmt ? f.fmt(variant[f.key] as number) : String(variant[f.key])}</span>
                    </span>
                  </div>
                  {changed && <p className="text-[0.6rem] dim mt-1">{f.reason}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Query + handoff into the actual backtest */}
      <section className="card p-5">
        <h3 className="text-[0.84rem] font-bold mb-2">Backtest query jo Flash engine ko jayegi</h3>
        <input
          value={effectiveQuery}
          onChange={(e) => setHypothesisQuery(e.target.value)}
          className="input w-full px-3.5 py-2.5 text-[0.78rem]"
        />
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            onClick={runBacktest}
            disabled={busy}
            className="btn btn-primary px-5 py-2.5 rounded-lg text-[0.76rem] font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            {busy ? '3 saal simulate ho raha hai…' : 'Flash Backtest chalao (simulated)'}
          </button>
          <button onClick={() => setBacktestTab('flash')} className="btn px-4 py-2.5 rounded-lg text-[0.72rem] font-semibold">
            Pehle ke reports dekho
          </button>
          <span className="text-[0.62rem] dim ml-auto">Result aane par hi green GO/NO-GO status milega</span>
        </div>
      </section>
    </div>
  );
}
