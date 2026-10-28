import { motion } from 'framer-motion';
import { Target, ShieldCheck, Wallet } from 'lucide-react';
import { useStore } from '../../state/store';
import { MorphNumber } from '../ui/Primitives';
import { compactInr, cn } from '../../utils/cn';

export function GlanceCards() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const positive = snapshot.glance.healthPct >= 0;

  const cards = [
    {
      icon: Target,
      label: 'Current Goal',
      tone: 'var(--accent)',
      body: <p className="text-sm leading-snug">{snapshot.glance.goal}</p>,
    },
    {
      icon: ShieldCheck,
      label: 'Current Safety Status',
      tone: snapshot.lockdown ? '#ff5470' : '#2dffb0',
      body: <p className="text-sm leading-snug">{snapshot.glance.safety}</p>,
    },
    {
      icon: Wallet,
      label: 'Financial Health · Daily P&L',
      tone: positive ? '#2dffb0' : '#ff5470',
      body: (
        <div className="flex items-baseline gap-3">
          <MorphNumber
            value={snapshot.glance.healthPnl}
            format={(n) => compactInr(n)}
            className="text-2xl font-semibold"
          />
          <MorphNumber
            value={snapshot.glance.healthPct * 100}
            format={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`}
            className="text-sm dim"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass lift rounded-3xl p-5 relative overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl" style={{ background: `${c.tone}33` }} />
            <div className="flex items-center gap-2.5 mb-2.5">
              <span
                className="w-8 h-8 rounded-xl grid place-items-center"
                style={{ background: `${c.tone}1c`, border: `1px solid ${c.tone}44`, boxShadow: `0 0 14px ${c.tone}2e` }}
              >
                <Icon size={15} style={{ color: c.tone }} />
              </span>
              <span className="hud-label">{c.label}</span>
            </div>
            {c.body}
          </motion.div>
        );
      })}
    </div>
  );
}

export function EquityStrip() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const positive = snapshot.risk.dailyPnl >= 0;
  return (
    <div className="glass rounded-2xl px-4 py-2.5 flex items-center gap-5 flex-wrap">
      <div>
        <p className="hud-label !text-[0.56rem]">Neural Equity</p>
        <MorphNumber value={snapshot.risk.equity} format={(n) => compactInr(n)} className="text-lg font-semibold" />
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div>
        <p className="hud-label !text-[0.56rem]">Daily P&L</p>
        <MorphNumber
          value={snapshot.risk.dailyPnlPct * 100}
          format={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`}
          className={cn('text-lg font-semibold', positive ? 'text-neon-green' : 'text-neon-red')}
        />
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div>
        <p className="hud-label !text-[0.56rem]">Sandbox Paper P&L (300+ instruments)</p>
        <MorphNumber value={snapshot.sandbox.pnl * 100} format={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`} className="text-lg font-semibold text-neon-violet" />
      </div>
    </div>
  );
}
