import { Zap } from 'lucide-react';
import { useStore } from '../../state/store';
import { Panel, Gauge, Bar, Chip } from '../ui/Primitives';

export function GreeksPanel() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const rows = snapshot.greeks;
  const atm = rows.reduce(
    (best, r) => (Math.abs(Math.abs(r.delta) - 0.5) < Math.abs(Math.abs(best?.delta ?? 0.5) - 0.5) ? r : best),
    rows[0],
  );
  const blast = snapshot.gammaBlast;

  return (
    <Panel
      title="Real-Time Option Greeks"
      subtitle="Black–Scholes pipeline · NIFTY / BANKNIFTY / crypto chains"
      right={
        blast.blast ? (
          <Chip tone="amber" className="breathe">
            <Zap size={11} /> GAMMA BLAST
          </Chip>
        ) : (
          <Chip tone="steel">gamma nominal</Chip>
        )
      }
    >
      {atm && (
        <div className="flex items-center justify-around py-2">
          <Gauge label="Delta" value={atm.delta} color="#38e8ff" />
          <Gauge label="Gamma" value={atm.gamma * 100} max={5} unit="" color="#2dffb0" />
          <Gauge label="Theta" value={atm.theta} max={Math.abs(atm.theta) * 1.4 || 1} color="#ffd84d" />
          <Gauge label="Vega" value={atm.vega * 100} max={3} color="#9d6bff" />
        </div>
      )}

      <div className="mt-2">
        <div className="flex justify-between mb-1">
          <span className="hud-label !text-[0.56rem]">Gamma Blast Radar — ATM OI acceleration</span>
          <span className="text-[0.66rem] font-mono" style={{ color: blast.blast ? '#ffae3b' : undefined }}>
            {(blast.score * 100).toFixed(0)}%
          </span>
        </div>
        <Bar value={blast.score} max={1} color={blast.blast ? '#ffae3b' : 'var(--accent)'} className="h-2" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-[0.68rem]">
          <thead>
            <tr className="bg-white/[0.04] dim">
              <th className="text-left font-normal px-3 py-2">Strike</th>
              <th className="font-normal px-2">Type</th>
              <th className="font-normal px-2">IV</th>
              <th className="font-normal px-2">Δ</th>
              <th className="font-normal px-2">OI chg</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(4, 12).map((r) => (
              <tr key={`${r.strike}-${r.kind}`} className="border-t border-white/5">
                <td className="px-3 py-1.5 font-mono">{r.strike}</td>
                <td className="px-2 text-center">
                  <span className={r.kind === 'CE' ? 'text-neon-green' : 'text-neon-red'}>{r.kind}</span>
                </td>
                <td className="px-2 text-center font-mono dim">{(r.iv * 100).toFixed(1)}</td>
                <td className="px-2 text-center font-mono">{r.delta.toFixed(2)}</td>
                <td className={`px-2 text-center font-mono ${r.oiChangePct >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {r.oiChangePct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
