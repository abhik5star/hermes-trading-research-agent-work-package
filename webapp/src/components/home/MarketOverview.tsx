import { ArrowUpRight, Target } from 'lucide-react';
import { useStore } from '../../state/store';
import { ProgressRing } from '../ui/Primitives';

export function MarketOverview() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const bullish = snapshot.bias === 'bullish';
  const health = snapshot.confidence;

  const opportunities = snapshot.topFits.slice(0, 4).map((f, i) => ({
    name: f.symbol.replace('_PERP', '').replace('.NS', ''),
    fit: f.fit,
    tone: f.fit > 85 ? 'Bullish' : f.fit > 65 ? 'Bullish' : i % 2 ? 'Neutral' : 'Bearish',
  }));

  const toneClass = (t: string) =>
    t === 'Bullish' ? 'text-[var(--green)] bg-[rgba(29,184,134,0.1)] border-[rgba(29,184,134,0.3)]'
    : t === 'Bearish' ? 'text-[var(--red)] bg-[rgba(229,83,107,0.1)] border-[rgba(229,83,107,0.3)]'
    : 'text-[var(--amber)] bg-[rgba(224,165,47,0.1)] border-[rgba(224,165,47,0.3)]';

  return (
    <section className="card p-4 h-full">
      <h3 className="text-[0.88rem] font-bold mb-3">Market Overview</h3>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="hud-label !text-[0.58rem] mb-1.5">Market Regime</p>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[0.8rem] font-semibold"
            style={{
              color: bullish ? 'var(--green)' : 'var(--red)',
              background: bullish ? 'rgba(29,184,134,0.1)' : 'rgba(229,83,107,0.1)',
              border: `1px solid ${bullish ? 'rgba(29,184,134,0.3)' : 'rgba(229,83,107,0.3)'}`,
            }}
          >
            <ArrowUpRight size={14} className={bullish ? '' : 'rotate-90'} />
            {snapshot.regime === 'sideways' ? 'Ranging (Theta)' : snapshot.regime === 'whale-breakout' ? 'Whale Breakout' : bullish ? 'Trending (Bullish)' : 'Trending (Bearish)'}
          </div>
        </div>
        <ProgressRing value={health / 100} size={92} stroke={7} color="var(--accent)">
          <div className="text-center">
            <p className="text-[0.58rem] dim">AI Health</p>
            <p className="text-lg font-bold font-mono leading-none">{health}</p>
            <p className="text-[0.55rem] dim">/100</p>
          </div>
        </ProgressRing>
      </div>

      <div className="mt-4">
        <p className="hud-label !text-[0.58rem] mb-2 flex items-center gap-1.5"><Target size={11} /> Top Opportunities</p>
        <div className="grid grid-cols-2 gap-2">
          {opportunities.map((o) => (
            <div key={o.name} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--panel-border)' }}>
              <p className="text-[0.7rem] font-semibold truncate">{o.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`chip !text-[0.58rem] !py-0.5 border ${toneClass(o.tone)}`}>{o.tone}</span>
                <span className="text-[0.62rem] font-mono dim">{o.fit.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
