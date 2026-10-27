import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { brain, useStore } from '../../state/store';

export function PanicButton() {
  const [armed, setArmed] = useState(false);
  const [shatter, setShatter] = useState(false);
  const locked = useStore((s) => s.snapshot?.lockdown);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3200);
    return () => clearTimeout(t);
  }, [armed]);

  const fire = () => {
    if (!armed) {
      setArmed(true);
      setShatter(true);
      setTimeout(() => setShatter(false), 600);
      return;
    }
    brain.panicSquareOff();
    setArmed(false);
  };

  return (
    <div className="relative" title="Emergency Square-Off — instantly flatten every autonomous position">
      <motion.button
        onClick={fire}
        whileTap={{ scale: 0.94 }}
        className="relative h-11 px-4 rounded-2xl font-semibold text-xs tracking-[0.14em] overflow-hidden border"
        style={{
          borderColor: armed ? 'rgba(255,84,112,0.8)' : 'rgba(255,84,112,0.35)',
          background: armed
            ? 'linear-gradient(135deg, rgba(255,84,112,0.35), rgba(255,59,87,0.5))'
            : 'rgba(255,84,112,0.08)',
          boxShadow: armed ? '0 0 30px rgba(255,84,112,0.6)' : '0 0 14px rgba(255,84,112,0.18)',
          color: '#ffd7dd',
        }}
      >
        {/* glass cover */}
        <AnimatePresence>
          {!armed && (
            <motion.span
              key="glass"
              initial={false}
              exit={{ opacity: 0, scale: 1.25 }}
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.1))',
                backdropFilter: 'blur(3px)',
              }}
            />
          )}
        </AnimatePresence>
        {shatter && (
          <span className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 7 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 w-[2px] h-6 bg-white/70"
                initial={{ rotate: i * 51, opacity: 1, x: '-50%', y: '-50%' }}
                animate={{ opacity: 0, y: '-180%', x: `${(i - 3) * 22}px` }}
                transition={{ duration: 0.55 }}
              />
            ))}
          </span>
        )}
        <span className="relative z-10 flex items-center gap-2">
          <ShieldAlert size={15} />
          {armed ? 'CONFIRM SQUARE-OFF' : 'EMERGENCY SQUARE-OFF'}
        </span>
      </motion.button>
      {locked && <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[0.6rem] text-neon-red whitespace-nowrap">risk lock engaged</span>}
    </div>
  );
}
