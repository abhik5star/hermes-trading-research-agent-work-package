import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Flower2 } from 'lucide-react';
import { useStore, brain } from '../state/store';

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
          style={{ background: 'rgba(5,9,22,0.8)', backdropFilter: 'blur(14px)' }}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="card p-8 max-w-md w-full text-center"
            style={{ borderColor: 'rgba(143,127,224,0.45)' }}
          >
            <div className="flex items-center justify-center gap-2 text-[#9d8cff] mb-3">
              <Flower2 size={18} />
              <span className="tracking-[0.25em] text-xs uppercase font-semibold">Psychological Zen Guard</span>
            </div>
            <div className="text-5xl my-4 float-y">🧘</div>
            <h3 className="text-[1rem] font-bold">Calm mode engaged — non-essential operations locked</h3>
            <p className="text-[0.76rem] dim mt-2 leading-relaxed">{zen.reason}</p>
            <div className="flex items-center justify-center gap-2 mt-4 text-[0.72rem] dim">
              <Lock size={12} />
              Auto-release in <span className="font-mono text-[#9d8cff] font-bold">{remaining}s</span> · revenge-trading protection
            </div>
            <button onClick={() => brain.releaseZen()} className="btn btn-primary mt-5 px-6 py-2.5 text-[0.78rem] font-semibold">
              I am calm — release guard
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
