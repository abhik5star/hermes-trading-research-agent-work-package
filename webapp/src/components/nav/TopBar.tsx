import { BrainCircuit } from 'lucide-react';
import { ModeSwitch } from './ModeSwitch';
import { FontScaler } from './FontScaler';
import { NotificationBell } from './NotificationBell';
import { PanicButton } from './PanicButton';
import { useStore, brain } from '../../state/store';
import { FOCUS_SYMBOLS, instrument, VEHICLE_LABEL } from '../../engine/instruments';
import { cn } from '../../utils/cn';

export function TopBar() {
  const focusSymbol = useStore((s) => s.snapshot?.focusSymbol);

  return (
    <header className="relative z-30 px-4 lg:px-6 pt-4">
      <div className="glass-strong rounded-3xl px-4 lg:px-5 py-3 flex items-center gap-4 flex-wrap">
        {/* Brand */}
        <div className="flex items-center gap-3 pr-2">
          <div className="w-10 h-10 rounded-2xl grid place-items-center relative" style={{ background: 'var(--accent-soft)', border: '1px solid var(--panel-border)' }}>
            <BrainCircuit size={20} className="neon-text" />
            <span className="absolute inset-0 rounded-2xl pulse-ring" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold tracking-wide">HERMES NEURAL</p>
            <p className="text-[0.62rem] dim tracking-[0.28em] uppercase">Self-Learning Trading Brain</p>
          </div>
        </div>

        {/* Multi-asset focus */}
        <div className="glass rounded-2xl p-1 flex items-center gap-0.5 flex-wrap">
          {FOCUS_SYMBOLS.map((sym) => {
            const inst = instrument(sym);
            const active = sym === focusSymbol;
            return (
              <button
                key={sym}
                onClick={() => brain.setFocus(sym)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 flex items-center gap-2',
                  active ? 'bg-[var(--accent-soft)] text-white shadow-glow' : 'dim hover:text-white',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', inst.exchange === 'NSE' ? 'bg-neon-amber' : 'bg-neon-violet')} />
                {inst.display.replace(' Perpetual', '')}
                <span className="text-[0.58rem] opacity-60 hidden xl:inline">{VEHICLE_LABEL[inst.vehicle]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <ModeSwitch />
        <FontScaler />
        <PanicButton />
        <NotificationBell />
      </div>
    </header>
  );
}
