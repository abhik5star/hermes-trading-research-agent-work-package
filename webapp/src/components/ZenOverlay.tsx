import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Flower2 } from 'lucide-react';
import { useStore, brain } from '../state/store';
import { FalconMascot } from './mascot/FalconMascot';

export function ZenOverlay() {
  const zen = useStore((s) => s.snapshot?.zen);
  const [, force] = useState(0);

  useEffect(() => {
    if (!zen?.active) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [zen?.active]);

  const remaining = zen ? Math.max(0, Math.round((zen.until - Date.now()) / 1000)) : 0;

  return (
    <AnimatePresence>
      {zen?.active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center p-6"
          style={{ background: 'rgba(7,10,24,0.78)', backdropFilter: 'blur(18px)' }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-strong rounded-[2rem] max-w-lg w-full p-8 text-center relative overflow-hidden"
            style={{ border: '1px solid rgba(180,166,255,0.35)', boxShadow: '0 0 60px rgba(150,130,255,0.25)' }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(180,166,255,0.16), transparent 60%)' }} />
            <div className="flex items-center justify-center gap-2 text-neon-violet mb-2">
              <Flower2 size={18} />
              <span className="tracking-[0.3em] text-xs uppercase">Psychological Zen Guard</span>
            </div>
            <div className="h-56">
              <FalconMascot mood="zen" height={230} />
            </div>
            <h3 className="text-lg font-semibold mt-2">Calm mode engaged — non-essential operations locked</h3>
            <p className="text-sm dim mt-2 leading-relaxed">{zen.reason}</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs dim">
              <Lock size={12} />
              Auto-release in <span className="font-mono text-neon-violet">{remaining}s</span> · revenge-trading protection
            </div>
            <button
              onClick={() => brain.releaseZen()}
              className="btn-ghost mt-5 px-6 py-2.5 rounded-2xl text-sm font-medium"
            >
              I am calm — release guard
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
