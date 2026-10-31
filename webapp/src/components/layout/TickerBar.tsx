import { useEffect, useRef, useState } from 'react';
import { ChevronDown, AArrowDown, AArrowUp, Type, ShieldAlert, Clock3, Circle } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { FOCUS_SYMBOLS, instrument } from '../../engine/instruments';
import { feed } from '../../engine/liveFeed';
import { MorphNumber } from '../ui/Primitives';
import { NotificationBell } from '../nav/NotificationBell';
import type { AppMode } from '../../engine/types';
import { cn } from '../../utils/cn';
import { createPortal } from 'react-dom';
import { sessionBadge } from '../../engine/marketSession';

const MODE_LABEL: Record<AppMode, string> = {
  backtest: 'Backtesting',
  paper: 'Paper Trading',
  live: 'Live Monitor · Sim',
  timemachine: 'AI Time Machine',
};

const TICKER_EXTRA = ['RELIANCE.NS', 'TATASTEEL.NS', 'SOLUSDT', 'ETHUSDT'];

function TickerPill({ symbol }: { symbol: string }) {
  const snapshot = useStore((s) => s.snapshot);
  const base = useRef<number | null>(null);
  const inst = instrument(symbol);
  const price = feed.getMark(symbol);
  if (base.current === null) base.current = price;
  const chg = base.current ? ((price - base.current) / base.current) * 100 : 0;
  const up = chg >= 0;
  const dotColor = inst.exchange === 'NSE' ? '#ffc24b' : '#9d6bff';
  // Indian symbols freeze while the exchange is shut — say so instead of
  // pretending the price is moving.
  const nseClosed = inst.exchange === 'NSE' && snapshot?.session?.state !== 'open';
  void snapshot;
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl card shrink-0">
      <span className="w-2 h-2 rounded-full" style={{ background: dotColor, opacity: nseClosed ? 0.45 : 1 }} />
      <span className="text-[0.72rem] font-semibold whitespace-nowrap">{inst.display.replace(' Perpetual', '')}</span>
      <MorphNumber
        value={chg}
        format={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`}
        className={cn('text-[0.72rem] font-mono font-semibold', up ? 'text-[var(--green)]' : 'text-[var(--red)]')}
      />
      {nseClosed && (
        <span
          className="text-[0.52rem] font-bold px-1.5 py-0.5 rounded-md"
          style={{ color: 'var(--amber)', background: 'rgba(224,165,47,0.12)', border: '1px solid rgba(224,165,47,0.35)' }}
          title={snapshot?.session?.label ?? 'Indian market is closed'}
        >
          CLOSED
        </span>
      )}
    </div>
  );
}

function ModeMenu() {
  const mode = useStore((s) => s.snapshot?.mode ?? 'paper');
  const open = useStore((s) => s.modeMenuOpen);
  const setOpen = useStore((s) => s.setModeMenuOpen);
  const setMode = useStore((s) => s.setMode);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      // The menu lives in <body> via a portal, so it needs its own hit-test —
      // otherwise mousedown closes the menu before the click lands and the
      // mode never changes.
      if (ref.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [setOpen]);

  // A dropdown rendered inside the flex row used to slide under the sidebar and
  // get clipped. It is now portalled to <body> and pinned to the button.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const MENU_W = 232;
  const left = rect ? Math.max(12, Math.min(rect.left, window.innerWidth - MENU_W - 12)) : 12;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="btn btn-primary flex items-center gap-2 px-4 py-2 text-[0.76rem] font-semibold whitespace-nowrap"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] pulse-dot" />
        {MODE_LABEL[mode]}
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] card rounded-2xl p-1.5"
            style={{ top: rect.bottom + 8, left, width: MENU_W, boxShadow: '0 18px 44px rgba(3,7,18,0.6)' }}
          >
            {(Object.keys(MODE_LABEL) as AppMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl text-[0.76rem] transition-colors whitespace-nowrap',
                  m === mode ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white hover:bg-white/5',
                )}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Live IST clock + the real Indian market session state. */
function ClockChip() {
  const session = useStore((s) => s.snapshot?.session);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: '2-digit',
  }).format(now);

  const open = session?.state === 'open';
  const tone = open ? 'var(--green)' : session?.state === 'pre-open' ? 'var(--amber)' : 'var(--text-dim)';

  return (
    <div
      className="card px-3 py-1.5 flex items-center gap-2.5 whitespace-nowrap"
      title="Indian market hours 09:15–15:30 IST · crypto 24×7"
    >
      <Clock3 size={13} className="text-[var(--accent)]" />
      <div className="leading-tight">
        <p className="text-[0.72rem] font-bold font-mono">{time}</p>
        <p className="text-[0.55rem] dim">{date} IST</p>
      </div>
      <span
        className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1"
        style={{ color: tone, background: `${tone}18`, border: `1px solid ${tone}44` }}
      >
        <Circle size={6} fill="currentColor" />
        NSE {session ? sessionBadge(session.state) : '—'}
      </span>
    </div>
  );
}

function FontButtons() {
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  const sizes = [
    { key: 'sm' as const, Icon: AArrowDown },
    { key: 'md' as const, Icon: Type },
    { key: 'lg' as const, Icon: AArrowUp },
  ];
  return (
    <div className="card p-1 flex items-center">
      {sizes.map(({ key, Icon }) => (
        <button
          key={key}
          onClick={() => setFontScale(key)}
          className={cn(
            'w-8 h-8 rounded-lg grid place-items-center transition-all',
            fontScale === key ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'dim hover:text-white',
          )}
          title={`Font ${key}`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export function TickerBar() {
  const symbols = [...FOCUS_SYMBOLS, ...TICKER_EXTRA.filter((s) => !FOCUS_SYMBOLS.includes(s))].slice(0, 7);
  return (
    <header className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5 flex-1 min-w-[280px]">
        {symbols.map((s) => (
          <TickerPill key={s} symbol={s} />
        ))}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <ClockChip />
        <ModeMenu />
        <FontButtons />
        <PanicButtonCompact />
        <NotificationBell />
        <div className="flex items-center gap-2.5 card pl-1.5 pr-3.5 py-1.5">
          <div
            className="w-8 h-8 rounded-lg grid place-items-center text-[0.72rem] font-bold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid rgba(58,168,232,0.35)' }}
          >
            A
          </div>
          <div className="leading-tight">
            <p className="text-[0.74rem] font-semibold">Abhishek</p>
            <p className="text-[0.58rem] dim">Paper · Simulated</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function PanicButtonCompact() {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      onClick={() => (armed ? (brain.panicSquareOff(), setArmed(false)) : setArmed(true))}
      className={cn('btn flex items-center gap-1.5 px-3 py-2 text-[0.7rem] font-semibold', armed && 'btn-primary')}
      style={armed ? { borderColor: 'rgba(229,83,107,0.7)', color: '#ffd7dd' } : { color: '#ff9daf' }}
      title="Emergency Square-Off"
    >
      <ShieldAlert size={14} />
      <span className="hidden xl:inline">{armed ? 'CONFIRM?' : 'Square-Off'}</span>
    </button>
  );
}
