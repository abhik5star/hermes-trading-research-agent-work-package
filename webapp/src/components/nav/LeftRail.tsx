import { LayoutDashboard, Sparkles, FlaskConical, BookOpenText, ShieldHalf, Lock } from 'lucide-react';
import { useStore, type ViewKey } from '../../state/store';
import { cn } from '../../utils/cn';

const VIEWS: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'command', label: 'Command Center', icon: LayoutDashboard },
  { key: 'timemachine', label: 'Time Machine', icon: Sparkles },
  { key: 'hatchery', label: 'Strategy Hatchery & Lab', icon: FlaskConical },
  { key: 'learning', label: 'Brain Learning Log', icon: BookOpenText },
  { key: 'deck', label: 'Risk & Execution Deck', icon: ShieldHalf },
];

export function LeftRail() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const lockdown = useStore((s) => s.snapshot?.lockdown);
  const zenActive = useStore((s) => s.snapshot?.zen.active);

  return (
    <nav className="relative z-20 flex lg:flex-col items-center gap-2 glass rounded-2xl p-1.5">
      {VIEWS.map((v) => {
        const Icon = v.icon;
        const active = view === v.key;
        const locked = Boolean(lockdown) && (v.key === 'timemachine' || v.key === 'hatchery');
        return (
          <button
            key={v.key}
            onClick={() => !locked && setView(v.key)}
            disabled={locked}
          className={cn(
            'group relative w-11 h-11 lg:w-12 lg:h-12 rounded-xl grid place-items-center transition-all duration-300',
            active ? 'bg-[var(--accent-soft)] text-white shadow-glow' : 'dim hover:text-white hover:bg-white/5',
            locked && 'opacity-40 cursor-not-allowed',
          )}
          aria-label={v.label}
          >
            <Icon size={18} />
            {locked && <Lock size={9} className="absolute top-1 right-1 text-neon-amber" />}
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-xl glass-strong text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 hidden lg:block">
              {v.label}
            </span>
          </button>
        );
      })}
      {zenActive && (
        <div className="hidden lg:block mt-2 text-[0.55rem] text-neon-violet text-center leading-tight px-1">
          ZEN<br />GUARD
        </div>
      )}
    </nav>
  );
}
