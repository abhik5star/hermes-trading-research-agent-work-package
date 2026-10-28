import {
  Home, Radar, Bitcoin, ListChecks, BarChart3, TrendingUp, FlaskConical, History,
  ScanSearch, BrainCircuit, ShieldHalf, LineChart, Plug, Settings as SettingsIcon,
} from 'lucide-react';
import { useStore, type ViewKey } from '../../state/store';
import { cn } from '../../utils/cn';

interface NavItem {
  label: string;
  icon: typeof Home;
  view: ViewKey;
}

const NAV: NavItem[] = [
  { label: 'Home', icon: Home, view: 'home' },
  { label: 'AI Market Scanner', icon: Radar, view: 'scanner' },
  { label: 'Crypto Trading', icon: Bitcoin, view: 'scanner' },
  { label: 'Indian Index Options', icon: ListChecks, view: 'scanner' },
  { label: 'Stock Options & Futures', icon: BarChart3, view: 'scanner' },
  { label: 'High Beta Stocks', icon: TrendingUp, view: 'scanner' },
  { label: 'Strategy Lab', icon: FlaskConical, view: 'lab' },
  { label: 'Backtesting & Paper Trading', icon: History, view: 'backtest' },
  { label: 'Trade Autopsy', icon: ScanSearch, view: 'autopsy' },
  { label: 'AI Learning Memory', icon: BrainCircuit, view: 'autopsy' },
  { label: 'Risk Centre', icon: ShieldHalf, view: 'risk' },
  { label: 'Performance & Reports', icon: LineChart, view: 'risk' },
  { label: 'Data Connections', icon: Plug, view: 'settings' },
  { label: 'Settings', icon: SettingsIcon, view: 'settings' },
];

export function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const beginner = useStore((s) => s.beginnerMode);
  const setBeginner = useStore((s) => s.setBeginnerMode);

  return (
    <aside className="w-[218px] shrink-0 h-full flex-col card p-3 overflow-y-auto hidden lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 py-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
          style={{ background: 'var(--accent-soft)', border: '1px solid rgba(58,168,232,0.4)' }}
        >
          <BrainCircuit size={18} className="text-[var(--accent)]" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-[0.92rem] tracking-wide">HERMES NEURAL</p>
          <p className="text-[0.6rem] dim">Smarter Trading · Better Decisions</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.label}
              onClick={() => setView(item.view)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[0.78rem] font-medium transition-all duration-200 text-left',
                active
                  ? 'bg-[var(--accent-soft)] text-white border border-[rgba(58,168,232,0.35)]'
                  : 'dim hover:text-white hover:bg-white/5 border border-transparent',
              )}
            >
              <Icon size={16} className={active ? 'text-[var(--accent)]' : ''} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Beginner mode */}
      <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(58,168,232,0.07)', border: '1px solid var(--panel-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[0.78rem] font-semibold">Beginner Mode</span>
          <button className={cn('toggle', beginner && 'on')} onClick={() => setBeginner(!beginner)} aria-label="Beginner mode" />
        </div>
        <p className="text-[0.64rem] dim mt-1.5 leading-snug">
          {beginner ? 'Simple view, easy language — jargon chhupa hua hai' : 'Full professional telemetry visible'}
        </p>
      </div>
    </aside>
  );
}

const MOBILE_VIEWS: { label: string; icon: typeof Home; view: ViewKey }[] = [
  { label: 'Home', icon: Home, view: 'home' },
  { label: 'Scanner', icon: Radar, view: 'scanner' },
  { label: 'Lab', icon: FlaskConical, view: 'lab' },
  { label: 'Backtest', icon: History, view: 'backtest' },
  { label: 'Autopsy', icon: ScanSearch, view: 'autopsy' },
  { label: 'Risk', icon: ShieldHalf, view: 'risk' },
  { label: 'Settings', icon: SettingsIcon, view: 'settings' },
];

export function MobileNav() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  return (
    <nav className="lg:hidden card p-1.5 flex gap-1 overflow-x-auto">
      {MOBILE_VIEWS.map((item) => {
        const Icon = item.icon;
        const active = view === item.view;
        return (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.68rem] font-semibold whitespace-nowrap transition-all',
              active ? 'bg-[var(--accent-soft)] text-white' : 'dim',
            )}
          >
            <Icon size={13} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
