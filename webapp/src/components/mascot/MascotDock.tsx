import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, X } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { FalconMascot } from './FalconMascot';
import { MOOD_META } from './moods';
import { cn } from '../../utils/cn';

function useTypewriter(text: string, speed = 18) {
  const [out, setOut] = useState('');
  useEffect(() => {
    setOut('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

/** Floating mood emojis that drift above the 3D falcon. */
function MoodEmojis({ mood }: { mood: keyof typeof MOOD_META }) {
  const emojis = MOOD_META[mood].emojis;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence mode="popLayout">
        {emojis.map((e, i) => (
          <motion.span
            key={`${mood}-${i}-${e}`}
            initial={{ opacity: 0, y: 18, scale: 0.6, rotate: -12 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-6, -34, -58], scale: [0.7, 1.15, 1], rotate: 10 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
            className="absolute text-2xl drop-shadow-[0_0_12px_rgba(56,232,255,0.5)]"
            style={{ right: `${18 + i * 14}%`, top: '34%' }}
          >
            {e}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function MascotDock() {
  const snapshot = useStore((s) => s.snapshot);
  const chatOpen = useStore((s) => s.chatOpen);
  const toggleChat = useStore((s) => s.toggleChat);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const latest = snapshot?.chat.at(-1);
  const typed = useTypewriter(latest?.text ?? '');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [snapshot?.chat.length]);

  if (!snapshot) return null;
  const meta = MOOD_META[snapshot.mood];

  const send = () => {
    const q = input.trim();
    if (!q) return;
    brain.userMessage(q);
    setInput('');
  };

  return (
    <section className="glass rounded-3xl overflow-hidden relative">
      <header className="flex items-center justify-between px-5 pt-4">
        <div>
          <h3 className="text-[0.95rem] font-semibold">Cybernetic Falcon</h3>
          <p className="text-xs dim">Autonomous neural mascot · Hinglish/English</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={snapshot.mood}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="chip"
            style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}14` }}
          >
            <span className="w-1.5 h-1.5 rounded-full breathe" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
            {meta.label} · {meta.hindi}
          </motion.span>
        </AnimatePresence>
      </header>

      <div className="relative">
        <FalconMascot mood={snapshot.mood} />
        <MoodEmojis mood={snapshot.mood} />
        {/* Mood blurb */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          <span
            className="text-[0.62rem] tracking-[0.18em] uppercase px-3 py-1 rounded-full whitespace-nowrap"
            style={{ color: meta.color, background: 'rgba(5,8,16,0.6)', border: `1px solid ${meta.color}44`, backdropFilter: 'blur(8px)' }}
          >
            {meta.blurb}
          </span>
        </div>
        {/* Speech bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={latest?.id ?? 'boot'}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-3 left-4 right-4 glass-strong rounded-2xl p-3 text-xs leading-relaxed z-20"
            style={{ borderLeft: `2px solid ${meta.color}` }}
          >
            <span className="dim mr-1.5">Falcon:</span>
            {typed}
            <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle breathe" style={{ background: meta.color }} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => toggleChat()}
          className={cn('btn-ghost w-full py-2 text-xs flex items-center justify-center gap-2')}
        >
          {chatOpen ? <X size={13} /> : <MessageCircle size={13} />}
          {chatOpen ? 'Close bilingual chat' : 'Talk to the Falcon'}
        </button>

        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="h-44 overflow-y-auto mt-3 space-y-2 pr-1">
                {snapshot.chat.map((line) => (
                  <div key={line.id} className={`flex ${line.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={cn(
                        'max-w-[85%] px-3 py-2 rounded-2xl text-[0.74rem] leading-relaxed',
                        line.from === 'user'
                          ? 'bg-[var(--accent-soft)] rounded-br-sm'
                          : 'bg-white/[0.05] rounded-bl-sm border border-white/10',
                      )}
                    >
                      {line.text}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Ask about Path A, risk, whales…"
                  className="flex-1 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button onClick={send} className="btn-ghost w-9 grid place-items-center rounded-xl">
                  <Send size={14} />
                </button>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {['Time Machine kya bol raha hai?', 'Risk status?', 'Whale check karo'].map((q) => (
                  <button key={q} onClick={() => brain.userMessage(q)} className="chip hover:border-[var(--accent)] transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
