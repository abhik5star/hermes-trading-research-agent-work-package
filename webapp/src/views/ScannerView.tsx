import { Radar, Layers3, Network } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../state/store';
import { CandleChart } from '../components/home/CandleChart';
import { NeuralStateWidget } from '../components/panels/NeuralStateWidget';
import { PositionsList } from '../components/panels/PositionsList';
import { Watchlist } from '../components/home/Watchlist';
import { Chip } from '../components/ui/Primitives';
import { cn } from '../utils/cn';

type Layer = 'structure' | 'wormhole' | 'montecarlo';

export function ScannerView() {
  const snapshot = useStore((s) => s.snapshot);
  const [layer, setLayer] = useState<Layer>('structure');
  if (!snapshot) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
          <Radar size={18} className="text-[var(--accent)]" /> AI Market Scanner
        </h2>
        <div className="card p-1 flex">
          {([
            { key: 'structure', label: 'SMC/ICT Structure', icon: Layers3 },
            { key: 'wormhole', label: 'Multi-Timeframe', icon: Network },
            { key: 'montecarlo', label: 'Monte Carlo 10K', icon: Network },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setLayer(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.7rem] font-semibold transition-all',
                  layer === t.key ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white',
                )}
              >
                <Icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 min-h-[480px]">
          <CandleChart />
        </div>
        <div className="xl:col-span-4 space-y-4">
          <NeuralStateWidget />
          <PositionsList />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 card p-4">
          <h3 className="text-[0.88rem] font-bold mb-3">
            {layer === 'structure' && 'Detected SMC / ICT Structures'}
            {layer === 'wormhole' && 'Multi-Timeframe Confluence (5M · 15M · 1H)'}
            {layer === 'montecarlo' && 'Monte Carlo Neural Tree — 10,000 Paths'}
          </h3>
          {layer === 'structure' && (
            <div className="flex flex-wrap gap-2">
              {snapshot.zones.length === 0 && <p className="text-[0.74rem] dim">Structure build ho rahi hai…</p>}
              {snapshot.zones.slice(-12).map((z) => (
                <Chip key={z.id} tone={z.bias === 'bullish' ? 'green' : z.bias === 'bearish' ? 'red' : 'cyan'}>
                  {z.kind.toUpperCase()} · {z.bias} · {Math.round((z.priceHigh + z.priceLow) / 2)}
                </Chip>
              ))}
            </div>
          )}
          {layer === 'wormhole' && (
            <div className="space-y-3">
              {[
                { tf: '5M', note: snapshot.zones.at(-1)?.kind ?? 'scanning' },
                { tf: '15M', note: snapshot.bias },
                { tf: '1H', note: snapshot.confluenceScore > 60 ? 'aligned — laser confluence' : 'divergent' },
              ].map((row) => (
                <div key={row.tf} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                  <span className="font-mono text-[0.74rem] font-bold w-12">{row.tf}</span>
                  <span className="text-[0.72rem] dim capitalize flex-1">{row.note}</span>
                  <span className={cn('w-2 h-2 rounded-full', snapshot.confluenceScore > 60 ? 'bg-[var(--green)] breathe' : 'bg-[var(--amber)]')} />
                </div>
              ))}
              <p className="text-[0.66rem] dim">
                Confluence glow score: <b className="text-[var(--accent)]">{snapshot.confluenceScore}%</b> — teenon timeframes align hone par high-probability setup banta hai.
              </p>
            </div>
          )}
          {layer === 'montecarlo' && snapshot.monteCarlo && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: 'Simulated paths', v: '10,000' },
                { l: 'P(up) terminal', v: `${(snapshot.monteCarlo.probUp * 100).toFixed(1)}%` },
                { l: 'Median terminal', v: snapshot.monteCarlo.expected.toFixed(0) },
                { l: 'VaR 95 worst case', v: `${(snapshot.monteCarlo.var95 * 100).toFixed(2)}%` },
              ].map((s) => (
                <div key={s.l} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                  <p className="hud-label !text-[0.56rem]">{s.l}</p>
                  <p className="text-[0.95rem] font-bold font-mono mt-1">{s.v}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <p className="hud-label !text-[0.58rem] mb-2">Silent indicator confirmations (backend-only)</p>
            <div className="flex flex-wrap gap-2">
              {snapshot.hiddenConfirmations.map((c) => <Chip key={c} tone="cyan">{c}</Chip>)}
            </div>
          </div>
        </div>
        <div className="xl:col-span-4 min-h-[300px]">
          <Watchlist />
        </div>
      </div>
    </div>
  );
}
