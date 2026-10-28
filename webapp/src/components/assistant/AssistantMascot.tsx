import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../../state/store';
import { MOOD_META } from '../mascot/moods';

function useTypewriter(text: string, speed = 14) {
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

/**
 * Compact corner assistant — floating mascot + short speech bubble only.
 * No full chat panel / input: the brain's latest Hinglish line is shown in a
 * small clamped bubble, which auto-reappears whenever Miri says something new.
 */
export function AssistantMascot() {
  const snapshot = useStore((s) => s.snapshot);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [typing, setTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastChatId = snapshot?.chat.at(-1)?.id;
  const latestText = snapshot?.chat.at(-1)?.text ?? '';
  const typed = useTypewriter(latestText);
  const mood = snapshot ? MOOD_META[snapshot.mood] : MOOD_META.idle;

  // New brain line -> pop the compact bubble back open with a short typing beat
  useEffect(() => {
    if (!lastChatId) return;
    setBubbleOpen(true);
    setTyping(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTyping(false), 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lastChatId]);

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2">
      {/* Compact speech bubble */}
      <AnimatePresence>
        {bubbleOpen && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="card w-[260px] max-w-[80vw] px-3 py-2.5 relative"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap"
                style={{ color: mood.color, background: `${mood.color}1c` }}
              >
                {mood.emojis[0]} {mood.label}
              </span>
              <button
                onClick={() => setBubbleOpen(false)}
                className="ml-auto btn w-5 h-5 grid place-items-center rounded-md shrink-0"
                title="Band karo"
              >
                <X size={11} />
              </button>
            </div>

            {typing ? (
              <div className="flex items-center gap-1 py-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[0.72rem] leading-snug dim line-clamp-3">{typed}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mascot button */}
      <motion.button
        onClick={() => setBubbleOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative float-y shrink-0"
        title="Miri AI"
      >
        <span
          className="block w-14 h-14 rounded-2xl overflow-hidden border-2"
          style={{ borderColor: mood.color, boxShadow: '0 6px 18px rgba(3,7,18,0.45)' }}
        >
          <img src="/miri-assistant.jpg" alt="Miri AI mascot" className="w-full h-full object-cover" />
        </span>

        {/* mood emoji badge */}
        <AnimatePresence mode="wait">
          <motion.span
            key={snapshot?.mood ?? 'idle'}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute -top-1.5 -left-1.5 text-sm bg-[var(--panel-2)] rounded-full w-5 h-5 grid place-items-center border hairline"
          >
            {mood.emojis[0]}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
