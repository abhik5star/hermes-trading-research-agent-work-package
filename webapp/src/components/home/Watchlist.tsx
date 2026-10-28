import { useMemo, useRef, useState } from 'react';
import { Star, StarOff } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { feed } from '../../engine/marketFeed';
import { UNIVERSE, FOCUS_SYMBOLS, instrument } from '../../engine/instruments';
import { MorphNumber } from '../ui/Primitives';
import { cn } from '../../utils/cn';

const TABS = ['Watchlist', 'Favorites', 'Indices', 'Crypto'] as const;
type Tab = (typeof TABS)[number];

const WATCH_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', '^NSEI', '^NSEBANK',
  'RELIANCE.NS', 'TATASTEEL.NS', 'HDFCBANK.NS', 'TCS.NS', 'INFY.NS',
];

export function Watchlist() {
  const [tab, setTab] = useState<Tab>('Watchlist');
  const [favs, setFavs] = useState<Set<string>>(new Set(['BTCUSDT', '^NSEI']));
  const heartbeat = useStore((s) => s.snapshot?.heartbeat ?? 0);
  const baseRef = useRef<Map<string, number>>(new Map());

  const rows = useMemo(() => {
    let symbols = WATCH_SYMBOLS;
    if (tab === 'Favorites') symbols = WATCH_SYMBOLS.filter((s) => favs.has(s));
    if (tab === 'Indices') symbols = UNIVERSE.filter((i) => i.assetClass === 'index' && i.vehicle === 'spot').map((i) => i.symbol);
    if (tab === 'Crypto') symbols = UNIVERSE.filter((i) => i.assetClass === 'crypto' && i.vehicle === 'spot').slice(0, 8).map((i) => i.symbol);
    return symbols.map((symbol) => {
      const price = feed.getMark(symbol) || instrument(symbol).basePrice;
      if (!baseRef.current.has(symbol)) baseRef.current.set(symbol, price);
      const base = baseRef.current.get(symbol)!;
      return { symbol, inst: instrument(symbol), price, chg: ((price - base) / base) * 100 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, favs, heartbeat]);

  const toggleFav = (s: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  return (
    <section className="card p-4 h-full flex flex-col">
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all',
              tab === t ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[0.6rem] hud-label !text-[0.56rem] px-2 pb-2 border-b border-white/8">
        <span>Symbol</span>
        <span className="text-right">Last</span>
        <span className="text-right w-16">Chg%</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {rows.length === 0 && <p className="text-[0.72rem] dim text-center py-8">No favorites yet — star any symbol.</p>}
        {rows.map((r) => (
          <button
            key={r.symbol}
            onClick={() => {
              if (FOCUS_SYMBOLS.includes(r.symbol)) brain.setFocus(r.symbol);
            }}
            className="w-full grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(r.symbol);
                }}
                className="shrink-0"
              >
                {favs.has(r.symbol) ? <Star size={12} className="text-[var(--amber)] fill-[var(--amber)]" /> : <StarOff size={12} className="dim" />}
              </span>
              <div className="min-w-0">
                <p className="text-[0.74rem] font-semibold truncate">{r.inst.display}</p>
                <p className="text-[0.58rem] dim">{r.inst.exchange}</p>
              </div>
            </div>
            <MorphNumber value={r.price} format={(n) => n.toFixed(n > 1000 ? 0 : 2)} className="text-[0.72rem] font-mono text-right" />
            <span
              className={cn(
                'text-[0.7rem] font-mono font-semibold text-right w-16 px-1.5 py-0.5 rounded-md',
                r.chg >= 0 ? 'text-[var(--green)] bg-[rgba(29,184,134,0.08)]' : 'text-[var(--red)] bg-[rgba(229,83,107,0.08)]',
              )}
            >
              {r.chg >= 0 ? '+' : ''}{r.chg.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
