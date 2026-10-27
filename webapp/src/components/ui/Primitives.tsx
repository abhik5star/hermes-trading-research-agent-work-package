import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('glass rounded-3xl relative overflow-hidden', className)}>
      {(title || right) && (
        <header className="flex items-start justify-between px-5 pt-4 pb-3">
          <div>
            {title && <h3 className="text-[0.95rem] font-semibold tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs dim mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={cn('px-5 pb-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Chip({ tone, children, className }: { tone?: 'green' | 'red' | 'amber' | 'violet' | 'cyan' | 'steel'; children: ReactNode; className?: string }) {
  const tones: Record<string, string> = {
    green: 'text-neon-green border-neon-green/30 bg-neon-green/10',
    red: 'text-neon-red border-neon-red/30 bg-neon-red/10',
    amber: 'text-neon-amber border-neon-amber/30 bg-neon-amber/10',
    violet: 'text-neon-violet border-neon-violet/30 bg-neon-violet/10',
    cyan: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
    steel: 'text-neon-steel border-neon-steel/30 bg-neon-steel/10',
  };
  return <span className={cn('chip', tone && tones[tone], className)}>{children}</span>;
}

/** Elegantly morphing number — never aggressively blinks (spec §6). */
export function MorphNumber({
  value,
  format,
  className,
  prefix = '',
  suffix = '',
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const text = format ? format(value) : value.toFixed(2);

  useEffect(() => {
    if (value > prev.current) setFlash('up');
    else if (value < prev.current) setFlash('down');
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className={cn('morph font-mono tabular-nums', flash === 'up' && 'flash-up', flash === 'down' && 'flash-down', className)}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 92,
  stroke = 7,
  color = 'var(--accent)',
  track = 'rgba(255,255,255,0.08)',
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, value))) }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Bar({ value, max, color = 'var(--accent)', className }: { value: number; max: number; color?: string; className?: string }) {
  const pct = Math.min(100, Math.abs((value / max) * 100));
  return (
    <div className={cn('h-1.5 rounded-full bg-white/10 overflow-hidden', className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 70, damping: 18 }}
      />
    </div>
  );
}

export function Gauge({ label, value, max = 1, unit = '', color = 'var(--accent)' }: { label: string; value: number; max?: number; unit?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ProgressRing value={Math.abs(value) / max} size={64} stroke={5} color={color}>
        <span className="text-[0.7rem] font-mono" style={{ color }}>
          {value.toFixed(2)}
          {unit}
        </span>
      </ProgressRing>
      <span className="hud-label !text-[0.58rem]">{label}</span>
    </div>
  );
}
