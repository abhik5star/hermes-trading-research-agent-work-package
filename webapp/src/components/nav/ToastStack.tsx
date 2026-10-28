import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Info, CheckCircle2, AlertTriangle, ShieldAlert, Waves, ShieldCheck, X, BellRing,
} from 'lucide-react';
import { brain } from '../../state/store';
import type { BrainAlert, AlertTone } from '../../engine/types';
import { timeAgo } from '../../utils/cn';

interface Toast extends BrainAlert {
  quip: string;
  emoji: string;
}

const TONE: Record<AlertTone, { color: string; icon: typeof Info; quip: string; emoji: string }> = {
  info: { color: '#6fb3ff', icon: Info, quip: 'Update hai bhai', emoji: '🛰️' },
  success: { color: '#2dffb0', icon: CheckCircle2, quip: 'Mast khabar!', emoji: '✅' },
  warning: { color: '#ffae3b', icon: AlertTriangle, quip: 'Heads up!', emoji: '⚠️' },
  danger: { color: '#ff5470', icon: ShieldAlert, quip: 'Alert, dhyan se!', emoji: '🚨' },
  whale: { color: '#c06bff', icon: Waves, quip: 'Whale movement!', emoji: '🐋' },
  hedge: { color: '#6fb3ff', icon: ShieldCheck, quip: 'Safety on!', emoji: '🛡️' },
};

const MAX_TOASTS = 4;
const LIFETIME = 7000;

export function ToastStack() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const off = brain.on('alert', (alert: BrainAlert) => {
      const tone = TONE[alert.tone];
      const toast: Toast = { ...alert, quip: tone.quip, emoji: tone.emoji };
      setToasts((prev) => [toast, ...prev].slice(0, MAX_TOASTS));
      const id = alert.id;
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), LIFETIME);
    });
    return off;
  }, []);

  return (
    <div className="fixed top-24 right-4 z-[75] w-[360px] max-w-[92vw] flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const tone = TONE[toast.tone];
          const Icon = tone.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 380, scale: 0.92, rotate: 2 }}
              animate={{
                opacity: 1,
                // "jhumna" — spring overshoot with a quick shake as it lands
                x: [380, -14, 10, -6, 4, 0],
                scale: 1,
                rotate: 0,
                transition: {
                  x: { type: 'spring', stiffness: 480, damping: 22, mass: 0.9 },
                  opacity: { duration: 0.25 },
                  scale: { type: 'spring', stiffness: 300, damping: 18 },
                },
              }}
              exit={{ opacity: 0, x: 320, scale: 0.9, transition: { duration: 0.22 } }}
              whileHover={{ scale: 1.025 }}
              className="glass-strong toast-shake rounded-2xl p-3.5 pointer-events-auto relative overflow-hidden"
              style={{
                border: `1px solid ${tone.color}55`,
                boxShadow: '0 10px 30px rgba(3,7,18,0.45)',
              }}
            >
              {/* glow strip */}
              <motion.span
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: tone.color }}
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <div className="flex items-start gap-3 pl-1.5">
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{ background: `${tone.color}1c`, border: `1px solid ${tone.color}44` }}
                >
                  <Icon size={16} style={{ color: tone.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{toast.emoji}</span>
                    <p className="text-[0.82rem] font-semibold truncate">{toast.title}</p>
                    <button
                      onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                      className="ml-auto dim hover:text-white transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <p className="text-[0.72rem] dim mt-1 leading-relaxed">{toast.body}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className="text-[0.62rem] font-semibold tracking-wider uppercase"
                      style={{ color: tone.color }}
                    >
                      {toast.quip}
                    </span>
                    <span className="text-[0.58rem] dim">{timeAgo(toast.at)}</span>
                  </div>
                  {/* lifetime progress */}
                  <span className="block h-[2px] rounded-full mt-2 bg-white/10 overflow-hidden">
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: tone.color }}
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: LIFETIME / 1000, ease: 'linear' }}
                    />
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {toasts.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          className="card rounded-2xl px-4 py-2.5 flex items-center gap-2 text-[0.68rem] dim pointer-events-none"
        >
          <BellRing size={12} />
          Brain events yahan pop-up honge — koi action miss nahi hoga
        </motion.div>
      )}
    </div>
  );
}
