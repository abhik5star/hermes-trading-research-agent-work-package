import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, Mic, MicOff, X, Keyboard, Radio } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { MOOD_META } from '../mascot/moods';
import { cn } from '../../utils/cn';

const DEMO_VOICE_LINES = [
  'Time Machine kya bol raha hai?',
  'Risk status batao',
  'Whale check karo',
];

// Minimal structural type — SpeechRecognition is not in the default TS DOM lib.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | null;
}

/**
 * Compact corner assistant. The mascot stays parked in the bottom-right corner
 * and NEVER opens on its own — the panel appears only on click. A red dot marks
 * unread brain lines. Inside, the user picks Text or Voice interaction.
 */
export function AssistantMascot() {
  const snapshot = useStore((s) => s.snapshot);
  const open = useStore((s) => s.miriOpen);
  const mode = useStore((s) => s.miriMode);
  const setOpen = useStore((s) => s.setMiriOpen);
  const setMode = useStore((s) => s.setMiriMode);

  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const lastChatId = snapshot?.chat.at(-1)?.id;
  const messages = useMemo(() => snapshot?.chat.slice(-8) ?? [], [snapshot?.chat]);
  const mood = snapshot ? MOOD_META[snapshot.mood] : MOOD_META.idle;
  const speechSupported = typeof window !== 'undefined' && getSpeechRecognition() !== null;

  // Unread counter only — no auto popup, ever.
  useEffect(() => {
    if (!lastChatId) return;
    if (!open) setUnread((u) => u + 1);
  }, [lastChatId, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length]);

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* noop */ }
  }, []);

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    brain.userMessage(q);
    setInput('');
  };

  const startListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      // Prototype fallback: clearly-labelled simulated voice interaction.
      setListening(true);
      setTimeout(() => {
        const line = DEMO_VOICE_LINES[Math.floor(Math.random() * DEMO_VOICE_LINES.length)];
        setListening(false);
        send(line);
      }, 1400);
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      send(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopListening = () => {
    try { recRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            key="miri-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 27 }}
            className="card w-[320px] max-w-[90vw] max-h-[70vh] flex flex-col overflow-hidden"
          >
            {/* header */}
            <header className="flex items-center gap-2.5 px-3 py-2.5 border-b hairline" style={{ background: 'var(--panel-2)' }}>
              <img src="/miri-assistant.jpg" alt="Miri AI" className="w-9 h-9 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[0.8rem] font-bold flex items-center gap-1.5">
                  Miri AI
                  <span className="text-[0.58rem] font-medium px-1.5 py-0.5 rounded-md" style={{ color: mood.color, background: `${mood.color}1c` }}>
                    {mood.emojis[0]} {mood.label}
                  </span>
                </p>
                <p className="text-[0.58rem] dim truncate">{mood.blurb}</p>
              </div>
              {/* text / voice mode picker */}
              <div className="card p-0.5 flex">
                <button
                  onClick={() => setMode('text')}
                  className={cn('w-7 h-7 grid place-items-center rounded-md transition-colors', mode === 'text' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'dim')}
                  title="Text interaction"
                >
                  <Keyboard size={13} />
                </button>
                <button
                  onClick={() => setMode('voice')}
                  className={cn('w-7 h-7 grid place-items-center rounded-md transition-colors', mode === 'voice' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'dim')}
                  title="Voice interaction"
                >
                  <Radio size={13} />
                </button>
              </div>
              <button onClick={() => setOpen(false)} className="btn w-7 h-7 grid place-items-center rounded-lg shrink-0" title="Band karo">
                <X size={13} />
              </button>
            </header>

            {/* messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[180px]" style={{ background: 'var(--bg-1)' }}>
              {messages.map((line) => (
                <div key={line.id} className={cn('flex', line.from === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn('max-w-[88%] px-3 py-2 rounded-2xl text-[0.72rem] leading-relaxed')}
                    style={
                      line.from === 'user'
                        ? { background: 'var(--accent-soft)', border: '1px solid rgba(58,168,232,0.35)', borderBottomRightRadius: 4 }
                        : { background: 'var(--panel-2)', border: '1px solid var(--panel-border)', borderBottomLeftRadius: 4 }
                    }
                  >
                    {line.text}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* footer — text or voice */}
            {mode === 'text' ? (
              <div className="p-2.5 flex gap-2 border-t hairline" style={{ background: 'var(--panel)' }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Miri se kuch pucho…"
                  className="input flex-1 px-3 py-2 text-[0.74rem]"
                />
                <button onClick={() => send()} className="btn btn-primary w-9 grid place-items-center rounded-lg shrink-0">
                  <Send size={14} />
                </button>
              </div>
            ) : (
              <div className="p-3 border-t hairline text-center" style={{ background: 'var(--panel)' }}>
                <button
                  onClick={listening ? stopListening : startListening}
                  className={cn(
                    'mx-auto w-12 h-12 rounded-2xl grid place-items-center btn transition-all',
                    listening && 'btn-primary breathe',
                  )}
                  title={speechSupported ? 'Tap to speak' : 'Voice demo (browser Speech API unavailable)'}
                >
                  {listening ? <Mic size={20} /> : speechSupported ? <Mic size={20} /> : <MicOff size={20} className="dim" />}
                </button>
                <p className="text-[0.64rem] dim mt-2">
                  {listening
                    ? 'Sun rahi hoon… bolte raho'
                    : speechSupported
                      ? 'Mic dabao aur bolo — speech text ban jayega'
                      : 'VOICE DEMO — browser Speech API unavailable, simulated interaction'}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parked corner mascot — click is the ONLY way to open the panel */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative float-y shrink-0"
        title="Miri AI se baat karo"
      >
        <span
          className="block w-14 h-14 rounded-2xl overflow-hidden border-2"
          style={{ borderColor: mood.color, boxShadow: '0 6px 18px rgba(3,7,18,0.45)' }}
        >
          <img src="/miri-assistant.jpg" alt="Miri AI mascot" className="w-full h-full object-cover" />
        </span>

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

        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--red)] text-white text-[0.6rem] font-bold grid place-items-center border-2 border-[var(--bg-0)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </motion.button>
    </div>
  );
}
