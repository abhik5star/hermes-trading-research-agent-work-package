import { Radar, Network, Layers3, ArrowRight, FlaskConical } from 'lucide-react';
import { useStore } from '../state/store';
import { InstrumentBrowser } from '../components/scanner/InstrumentBrowser';
import { Chip } from '../components/ui/Primitives';
import { cn } from '../utils/cn';

export function ScannerView() {
  const snapshot = useStore((s) => s.snapshot);
  const openChart = useStore((s) => s.openChart);
  const timeframe = useStore((s) => s.timeframe);
  const setView = useStore((s) => s.setView);
  if (!snapshot) return null;

  const mc = snapshot.monteCarlo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <Radar size={18} className="text-[var(--accent)]" /> AI Market Scanner
        </h2>
        <Chip tone="amber">Simulated screener · live broker data connected nahi hai</Chip>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Flow 1 + 2: category → instrument → timeframe → chart */}
        <div className="xl:col-span-8">
          <InstrumentBrowser />
        </div>

        {/* Insight rail */}
        <div className="xl:col-span-4 space-y-4">
          <section className="card p-4">
            <h3 className="text-[0.84rem] font-bold flex items-center gap-2 mb-3">
              <Network size={14} className="text-[var(--accent)]" /> Focused Instrument Scan
            </h3>
            <p className="text-[0.7rem] dim mb-3">
              Abhi focus: <b className="text-white/85">{snapshot.focusSymbol.replace('_PERP', '')}</b> · {timeframe}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                <p className="hud-label !text-[0.56rem]">Confluence</p>
                <p className="text-[0.95rem] font-bold font-mono mt-1">{snapshot.confluenceScore.toFixed(0)}%</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                <p className="hud-label !text-[0.56rem]">Bias</p>
                <p className={cn('text-[0.82rem] font-bold mt-1.5 capitalize', snapshot.bias === 'bullish' ? 'text-[var(--green)]' : snapshot.bias === 'bearish' ? 'text-[var(--red)]' : 'text-[var(--amber)]')}>
                  {snapshot.bias}
                </p>
              </div>
              {mc && (
                <>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                    <p className="hud-label !text-[0.56rem]">P(up) · 10K paths</p>
                    <p className="text-[0.95rem] font-bold font-mono mt-1">{(mc.probUp * 100).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                    <p className="hud-label !text-[0.56rem]">VaR 95</p>
                    <p className="text-[0.95rem] font-bold font-mono mt-1 text-[var(--red)]">{(mc.var95 * 100).toFixed(2)}%</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => openChart(snapshot.focusSymbol, timeframe)}
              className="btn btn-primary w-full py-2 rounded-lg text-[0.72rem] font-semibold flex items-center justify-center gap-1.5"
            >
              <Layers3 size={13} /> Focused instrument ka chart kholo
              <ArrowRight size={12} />
            </button>
          </section>

          <section className="card p-4">
            <h3 className="text-[0.84rem] font-bold mb-3">Latest SMC / ICT Structures</h3>
            <div className="flex flex-wrap gap-2">
              {snapshot.zones.length === 0 && <p className="text-[0.72rem] dim">Structure build ho rahi hai…</p>}
              {snapshot.zones.slice(-8).map((z) => (
                <Chip key={z.id} tone={z.bias === 'bullish' ? 'green' : z.bias === 'bearish' ? 'red' : 'cyan'}>
                  {z.kind.toUpperCase()} · {z.bias}
                </Chip>
              ))}
            </div>
            <button
              onClick={() => setView('lab')}
              className="btn w-full mt-4 py-2 rounded-lg text-[0.72rem] font-semibold flex items-center justify-center gap-1.5"
            >
              <FlaskConical size={13} /> Chart setup Strategy Lab mein inspect karo
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
