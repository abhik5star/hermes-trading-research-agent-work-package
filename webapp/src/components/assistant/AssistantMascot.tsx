import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Send, Mic, MicOff, X, Minus } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { MOOD_META } from '../mascot/moods';
import { cn } from '../../utils/cn';

const QUICK_PROMPTS = [
  'Time Machine kya bol raha hai?',
  'Risk status?',
  'Whale check karo',
  'Latest trade kya hua?',
];

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

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm w-fit" style={{ background: 'var(--panel-2)' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

export function AssistantMascot() {
  const snapshot = useStore((s) => s.snapshot);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [unread, setUnread] = useState(0);
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const chatLen = snapshot?.chat.length ?? 0;
  const lastChatId = snapshot?.chat.at(-1)?.id;

  const mood = snapshot ? MOOD_META[snapshot.mood] : MOOD_META.idle;

  // Unread badge while collapsed + fake typing delay for the assistant feel
  useEffect(() => {
    if (chatLen === 0) return;
    if (!open) setUnread((u) => u + 1);
    else {
      setTyping(true);
      const t = setTimeout(() => setTyping(false), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastChatId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, chatLen, typing]);

  const latestText = useTypewriter(snapshot?.chat.at(-1)?.text ?? '');
  const messages = useMemo(() => snapshot?.chat ?? [], [snapshot?.chat]);

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    brain.userMessage(q);
    setInput('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="card w-[350px] max-w-[92vw] h-[480px] max-h-[70vh] flex flex-col overflow-hidden"
          >
            {/* header */}
            <header className="flex items-center gap-3 px-4 py-3 border-b hairline" style={{ background: 'var(--panel-2)' }}>
              <div className="relative">
                <img src="/miri-assistant.jpg" alt="Miri AI" className="w-10 h-10 rounded-xl object-cover" />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ background: mood.color, borderColor: 'var(--panel-2)' }}
                  title={mood.label}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.82rem] font-bold flex items-center gap-1.5">
                  Miri AI
                  <span className="text-[0.62rem] font-medium px-1.5 py-0.5 rounded-md" style={{ color: mood.color, background: `${mood.color}1c` }}>
                    {mood.emojis[0]} {mood.label}
                  </span>
                </p>
                <p className="text-[0.62rem] dim">{mood.blurb}</p>
              </div>
              <button onClick={() => setOpen(false)} className="btn w-7 h-7 grid place-items-center rounded-lg">
                <Minus size={13} />
              </button>
              <button onClick={() => setOpen(false)} className="btn w-7 h-7 grid place-items-center rounded-lg">
                <X size={13} />
              </button>
            </header>

            {/* messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ background: 'var(--bg-1)' }}>
              {messages.map((line, i) => {
                const isLast = i === messages.length - 1;
                return (
                  <div key={line.id} className={cn('flex', line.from === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[86%] px-3 py-2 rounded-2xl text-[0.74rem] leading-relaxed',
                        line.from === 'user'
                          ? 'rounded-br-sm text-white'
                          : 'rounded-bl-sm',
                      )}
                      style={
                        line.from === 'user'
                          ? { background: 'var(--accent-soft)', border: '1px solid rgba(58,168,232,0.35)' }
                          : { background: 'var(--panel-2)', border: '1px solid var(--panel-border)' }
                      }
                    >
                      {line.from === 'mascot' && isLast ? latestText : line.text}
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="flex justify-start">
                  <TypingDots />
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* quick prompts */}
            <div className="px-3 pt-2 flex gap-1.5 flex-wrap border-t hairline" style={{ background: 'var(--panel)' }}>
              {QUICK_PROMPTS.map((q) => (
                <button key={q} onClick={() => send(q)} className="chip hover:border-[var(--accent)] transition-colors !text-[0.62rem]">
                  {q}
                </button>
              ))}
            </div>

            {/* input */}
            <div className="p-3 flex gap-2 border-t hairline" style={{ background: 'var(--panel)' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Miri se kuch pucho…"
                className="input flex-1 px-3 py-2 text-[0.76rem]"
              />
              <button
                onClick={() => setListening((v) => !v)}
                className={cn('btn w-9 grid place-items-center rounded-lg shrink-0', listening && 'btn-primary')}
                title="Tap to speak (demo)"
              >
                {listening ? <Mic size={14} /> : <MicOff size={14} className="dim" />}
              </button>
              <button onClick={() => send()} className="btn btn-primary w-9 grid place-items-center rounded-lg shrink-0">
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mascot button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative float-y"
        title="Miri AI se baat karo"
      >
        <span
          className="block w-16 h-16 rounded-2xl overflow-hidden border-2"
          style={{ borderColor: mood.color, boxShadow: '0 6px 20px rgba(3,7,18,0.45)' }}
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
            className="absolute -top-1.5 -left-1.5 text-base bg-[var(--panel-2)] rounded-full w-6 h-6 grid place-items-center border hairline"
          >
            {mood.emojis[0]}
          </motion.span>
        </AnimatePresence>

        {/* unread count */}
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[var(--red)] text-white text-[0.62rem] font-bold grid place-items-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}

        {/* idle hint */}
        {!open && (
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap card px-3 py-1.5 text-[0.68rem] dim hidden xl:flex items-center gap-1.5">
            <MessageCircle size={12} className="text-[var(--accent)]" />
            Miri se baat karo
          </span>
        )}
      </motion.button>
    </div>
  );
}
