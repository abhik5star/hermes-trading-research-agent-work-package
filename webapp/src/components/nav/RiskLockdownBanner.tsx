import { AnimatePresence, motion } from 'framer-motion';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useStore, brain } from '../../state/store';

export function RiskLockdownBanner() {
  const risk = useStore((s) => s.snapshot?.risk);
  const zenActive = useStore((s) => s.snapshot?.zen.active);
  const locked = risk?.locked && !zenActive;

  return (
    <AnimatePresence>
      {locked && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[65] glass-strong rounded-2xl px-5 py-3 flex items-center gap-4"
          style={{ border: '1px solid rgba(255,84,112,0.5)', boxShadow: '0 0 34px rgba(255,84,112,0.35)' }}
        >
          <LockKeyhole size={18} className="text-neon-red breathe" />
          <div>
            <p className="text-sm font-semibold text-neon-red">2% Daily Drawdown Lockdown</p>
            <p className="text-[0.68rem] dim">Autonomous execution frozen — non-essential modules locked for the session</p>
          </div>
          <button
            onClick={() => brain.acknowledgeRiskLock()}
            className="btn-ghost px-3 py-2 rounded-xl text-xs flex items-center gap-2"
          >
            <ShieldCheck size={13} /> Acknowledge & reset
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
