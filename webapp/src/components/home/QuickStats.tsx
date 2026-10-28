import { Briefcase, Gauge, Wallet, Activity, Database, FlaskConical } from 'lucide-react';
import { useStore } from '../../state/store';
import { compactInr } from '../../utils/cn';

export function QuickStats() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;

  const rows = [
    { icon: Briefcase, label: 'Active Positions', value: String(snapshot.positions.length), tone: 'var(--accent)' },
    { icon: Gauge, label: 'Total Risk', value: `${(snapshot.risk.hardStopPct * 100).toFixed(1)}%`, tone: 'var(--amber)' },
    {
      icon: Wallet,
      label: 'Daily P&L',
      value: compactInr(snapshot.risk.dailyPnl),
      tone: snapshot.risk.dailyPnl >= 0 ? 'var(--green)' : 'var(--red)',
    },
    {
      icon: Activity,
      label: 'Max Drawdown',
      value: `${Math.abs(snapshot.risk.drawdownPct * 100).toFixed(2)}%`,
      tone: Math.abs(snapshot.risk.drawdownPct) > 0.012 ? 'var(--red)' : 'var(--green)',
    },
    { icon: Database, label: 'Data Feed', value: 'Demo Connected', tone: 'var(--green)' },
    { icon: FlaskConical, label: 'Mode', value: snapshot.mode.replace('-', ' '), tone: 'var(--accent)' },
  ];

  return (
    <section className="card p-4 h-full">
      <h3 className="text-[0.88rem] font-bold mb-3">Quick Stats</h3>
      <div className="space-y-1">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${r.tone}1a`, border: `1px solid ${r.tone}33` }}>
                <Icon size={14} style={{ color: r.tone }} />
              </div>
              <span className="text-[0.72rem] dim flex-1 capitalize">{r.label}</span>
              <span className="text-[0.76rem] font-bold font-mono capitalize" style={{ color: r.tone }}>{r.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
