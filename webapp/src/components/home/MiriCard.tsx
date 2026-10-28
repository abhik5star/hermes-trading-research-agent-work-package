import { useEffect, useState } from 'react';
import { ChevronRight, Mic, MicOff, Sparkles } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { MOOD_META } from '../mascot/moods';

function useTypewriter(text: string, speed = 16) {
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

export function MiriCard() {
  const snapshot = useStore((s) => s.snapshot);
  const setView = useStore((s) => s.setView);
  const [listening, setListening] = useState(false);
  const latest = snapshot?.chat.at(-1);
  const typed = useTypewriter(latest?.text ?? '');
  const mood = snapshot ? MOOD_META[snapshot.mood] : MOOD_META.idle;

  return (
    <section className="card overflow-hidden flex h-full">
      {/* portrait */}
      <div className="relative w-[42%] min-w-[150px] shrink-0">
        <img src="/miri-assistant.jpg" alt="Miri AI assistant" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 55%, rgba(10,19,46,0.95))' }} />
        <div
          className="absolute top-3 left-3 chip !text-[0.62rem]"
          style={{ color: mood.color, borderColor: `${mood.color}55`, background: 'rgba(6,13,32,0.72)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full breathe" style={{ background: mood.color }} />
          {mood.label}
        </div>
      </div>

      {/* conversation */}
      <div className="flex-1 p-4 flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="w-7 h-7 rounded-lg grid place-items-center"
            style={{ background: 'var(--accent-soft)', border: '1px solid rgba(39,214,245,0.35)' }}
          >
            <Sparkles size={13} className="text-[var(--accent)]" />
          </div>
          <div className="leading-tight">
            <p className="text-[0.82rem] font-bold">Miri AI</p>
            <p className="text-[0.58rem] dim">Aapka neural trading assistant</p>
          </div>
          <div className="ml-auto flex items-end gap-[2px] h-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="voice-bar" style={{ height: '100%', animationDelay: `${i * 0.12}s`, opacity: listening ? 1 : 0.45 }} />
            ))}
          </div>
        </div>

        <div className="rounded-xl p-3 text-[0.74rem] leading-relaxed flex-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--panel-border)' }}>
          <p className="font-semibold text-[0.8rem] mb-1">Hi Abhishek! 👋 Main hoon Miri AI</p>
          <p className="dim">
            {typed}
            <span className="inline-block w-1.5 h-3 ml-0.5 align-middle bg-[var(--accent)] breathe" />
          </p>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setView('scanner')}
            className="btn btn-primary flex-1 py-2 text-[0.72rem] font-semibold flex items-center justify-center gap-1.5"
          >
            Haan, dikhao <ChevronRight size={13} />
          </button>
          <button
            onClick={() => brain.say('Theek hai, main background mein monitor karta rahoonga — setup milte hi ping karunga.')}
            className="btn flex-1 py-2 text-[0.72rem] font-semibold"
          >
            Nahi, abhi nahi
          </button>
          <button
            onClick={() => setListening((v) => !v)}
            className="btn w-9 h-9 grid place-items-center rounded-xl shrink-0"
            title="Tap to speak (demo)"
          >
            {listening ? <Mic size={14} className="text-[var(--accent)]" /> : <MicOff size={14} className="dim" />}
          </button>
        </div>
      </div>
    </section>
  );
}
