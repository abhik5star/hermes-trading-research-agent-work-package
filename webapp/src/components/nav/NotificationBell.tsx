import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X, ShieldAlert, Waves, ShieldCheck, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../state/store';
import type { AlertTone } from '../../engine/types';
import { timeAgo } from '../../utils/cn';
import { cn } from '../../utils/cn';

const TONE_GLOW: Record<AlertTone, string> = {
  info: 'rgba(111,179,255,0.55)',
  success: 'rgba(45,255,176,0.55)',
  warning: 'rgba(255,174,59,0.6)',
  danger: 'rgba(255,84,112,0.65)',
  whale: 'rgba(157,107,255,0.65)',
  hedge: 'rgba(111,179,255,0.7)',
};

const TONE_ICON: Record<AlertTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: ShieldAlert,
  whale: Waves,
  hedge: ShieldCheck,
};

export function NotificationBell() {
  const snapshot = useStore((s) => s.snapshot);
  const bellOpen = useStore((s) => s.bellOpen);
  const toggleBell = useStore((s) => s.toggleBell);
  const [ringing, setRinging] = useState(false);
  const lastId = useRef<string | null>(null);
  const alerts = snapshot?.alerts ?? [];
  const unread = alerts.filter((a) => !a.read).length;
  const latest = alerts[0];
  const glow = latest ? TONE_GLOW[latest.tone] : TONE_GLOW.info;

  useEffect(() => {
    if (latest && latest.id !== lastId.current) {
      lastId.current = latest.id;
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 1200);
      return () => clearTimeout(t);
    }
  }, [latest]);

  return (
    <>
      <button
        onClick={() => toggleBell()}
        className="relative w-11 h-11 rounded-2xl glass grid place-items-center transition-transform hover:scale-105"
        style={{ boxShadow: latest ? `0 0 22px ${glow}` : undefined }}
        title="Ambient notification center"
      >
        <Bell size={18} className={cn(ringing && 'bell-ring')} style={{ color: latest ? glow : undefined }} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[0.62rem] font-bold grid place-items-center text-void-950"
            style={{ background: glow, boxShadow: `0 0 12px ${glow}` }}
          >
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {bellOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => toggleBell(false)} />
            <motion.aside
              initial={{ opacity: 0, x: 28, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed right-4 top-20 z-50 w-[380px] max-w-[92vw] glass-strong rounded-3xl overflow-hidden"
            >
              <header className="flex items-center justify-between px-5 py-4 border-b hairline">
                <div>
                  <h3 className="font-semibold">Neural Alert Stream</h3>
                  <p className="text-xs dim">Ambient telemetry from every engine</p>
                </div>
                <button className="btn-ghost w-8 h-8 grid place-items-center rounded-xl" onClick={() => toggleBell(false)}>
                  <X size={15} />
                </button>
              </header>
              <div className="max-h-[62vh] overflow-y-auto p-3 space-y-2">
                {alerts.length === 0 && <p className="text-sm dim text-center py-10">No alerts yet — engines are listening.</p>}
                {alerts.map((a) => {
                  const Icon = TONE_ICON[a.tone];
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5"
                      style={{ borderLeft: `2px solid ${TONE_GLOW[a.tone]}` }}
                    >
                      <Icon size={16} className="mt-0.5 shrink-0" style={{ color: TONE_GLOW[a.tone] }} />
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[0.83rem] font-medium truncate">{a.title}</p>
                          <span className="text-[0.62rem] dim shrink-0">{timeAgo(a.at)}</span>
                        </div>
                        <p className="text-xs dim mt-0.5 leading-relaxed">{a.body}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
