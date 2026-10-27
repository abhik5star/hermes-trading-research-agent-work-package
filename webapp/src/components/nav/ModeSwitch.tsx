import { motion } from 'framer-motion';
import { FlaskConical, ScrollText, Radio, Sparkles } from 'lucide-react';
import type { AppMode } from '../../engine/types';
import { useStore } from '../../state/store';
import { cn } from '../../utils/cn';

const MODES: { key: AppMode; label: string; icon: typeof Radio; hint: string }[] = [
  { key: 'backtest', label: 'Backtesting', icon: ScrollText, hint: 'Historical replay' },
  { key: 'paper', label: 'Paper Trading', icon: FlaskConical, hint: 'Zero-capital execution' },
  { key: 'live', label: 'Live Neural', icon: Radio, hint: 'Live monitoring' },
  { key: 'timemachine', label: 'AI Time Machine', icon: Sparkles, hint: 'Predictive simulation' },
];

export function ModeSwitch() {
  const mode = useStore((s) => s.snapshot?.mode ?? 'paper');
  const setMode = useStore((s) => s.setMode);
  const activeIdx = Math.max(0, MODES.findIndex((m) => m.key === mode));

  return (
    <div
      className="glass rounded-2xl p-1 flex relative"
      style={{ perspective: 900 }}
      title="Global execution mode"
    >
      {MODES.map((m, i) => {
        const Icon = m.icon;
        const active = i === activeIdx;
        return (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              'relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors duration-300 whitespace-nowrap',
              active ? 'text-white' : 'dim hover:text-white',
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-thumb"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(56,232,255,0.25), rgba(77,125,255,0.28))',
                  border: '1px solid rgba(56,232,255,0.45)',
                  boxShadow: '0 6px 24px rgba(56,232,255,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
                  transform: 'translateZ(20px)',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Icon size={14} className="relative z-10" style={{ filter: active ? 'drop-shadow(0 0 6px var(--accent))' : undefined }} />
            <span className="relative z-10 hidden lg:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
