import { Wifi, WifiOff, FlaskConical, Quote, ShieldOff } from 'lucide-react';
import { useStore } from '../../state/store';

export function StatusBar() {
  const snapshot = useStore((s) => s.snapshot);
  const brokerConnected = false; // no live broker adapter in the research build

  return (
    <footer className="card flex items-center gap-6 px-5 py-2.5 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg">🦅</span>
        <div className="leading-tight">
          <p className="text-[0.78rem] font-semibold whitespace-nowrap">Trade Smarter. Learn Faster. Grow Together.</p>
          <p className="text-[0.62rem] dim">Galtiyon se seekho, AI ke saath improve karo</p>
        </div>
      </div>

      <div className="flex items-center gap-5 ml-auto flex-wrap">
        <StatusPill
          icon={<Wifi size={14} className="text-[var(--green)]" />}
          label="Live Market Data"
          value="Demo Feed Connected"
          tone="green"
        />
        <StatusPill
          icon={brokerConnected ? <Wifi size={14} className="text-[var(--green)]" /> : <WifiOff size={14} className="text-[var(--red)]" />}
          label="Broker API"
          value={brokerConnected ? 'Connected' : 'Not Connected'}
          tone={brokerConnected ? 'green' : 'red'}
        />
        <StatusPill
          icon={<FlaskConical size={14} className="text-[var(--accent)]" />}
          label="Mode"
          value={(snapshot?.mode ?? 'paper').replace('-', ' ')}
          tone="cyan"
        />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(224,165,47,0.1)', border: '1px solid rgba(224,165,47,0.35)' }}>
          <ShieldOff size={14} className="text-[var(--amber)]" />
          <div className="leading-tight">
            <p className="text-[0.58rem] dim">Data</p>
            <p className="text-[0.68rem] font-semibold text-[var(--amber)]">Simulated · Live trading disabled</p>
          </div>
        </div>
      </div>

      <div className="hidden 2xl:flex items-center gap-2 text-[0.66rem] dim max-w-[260px]">
        <Quote size={12} className="shrink-0 text-[var(--accent)]" />
        <span className="italic">Small steps in the right direction lead to big results. — Neural Assistant</span>
      </div>
    </footer>
  );
}

function StatusPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'green' | 'red' | 'cyan' }) {
  const color = tone === 'green' ? 'var(--green)' : tone === 'red' ? 'var(--red)' : 'var(--accent)';
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${color}1c`, border: `1px solid ${color}38` }}>
        {icon}
      </div>
      <div className="leading-tight">
        <p className="text-[0.6rem] dim">{label}</p>
        <p className="text-[0.7rem] font-semibold capitalize" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}
