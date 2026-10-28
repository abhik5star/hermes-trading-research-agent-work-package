import { useMemo, useRef } from 'react';
import { Bitcoin, LineChart, CandlestickChart, ArrowRight } from 'lucide-react';
import { useStore } from '../../state/store';
import { UNIVERSE, VEHICLE_LABEL } from '../../engine/instruments';
import { feed } from '../../engine/marketFeed';
import { MorphNumber, Chip } from '../ui/Primitives';
import { cn } from '../../utils/cn';
import type { ScannerCategory } from '../../state/store';

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'];

const CATEGORY_META: Record<ScannerCategory, { label: string; hint: string; icon: typeof Bitcoin }> = {
  crypto: { label: 'Crypto', hint: 'Binance-style spot, perpetuals aur options', icon: Bitcoin },
  indices: { label: 'Indian Indices', hint: 'Nifty 50, Bank Nifty aur index option chain', icon: LineChart },
  fno: { label: 'F&O Stocks', hint: 'NSE equity futures/options universe', icon: CandlestickChart },
};

function categorySymbols(category: ScannerCategory) {
  if (category === 'crypto') return UNIVERSE.filter((i) => i.assetClass === 'crypto');
  if (category === 'indices') return UNIVERSE.filter((i) => i.assetClass === 'index');
  return UNIVERSE.filter((i) => i.assetClass === 'equity');
}

export function InstrumentBrowser() {
  const category = useStore((s) => s.scannerCategory);
  const setCategory = useStore((s) => s.setScannerCategory);
  const timeframe = useStore((s) => s.timeframe);
  const setTimeframe = useStore((s) => s.setTimeframe);
  const openChart = useStore((s) => s.openChart);
  const focusSymbol = useStore((s) => s.snapshot?.focusSymbol);
  const heartbeat = useStore((s) => s.snapshot?.heartbeat ?? 0);
  const baseRef = useRef<Map<string, number>>(new Map());

  const rows = useMemo(() => {
    return categorySymbols(category).map((inst) => {
      const price = feed.getMark(inst.symbol) || inst.basePrice;
      if (!baseRef.current.has(inst.symbol)) baseRef.current.set(inst.symbol, price);
      const base = baseRef.current.get(inst.symbol)!;
      return { inst, price, chg: ((price - base) / base) * 100 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, heartbeat]);

  return (
    <section className="card p-4">
      {/* Category tabs — flow 1 landing selection */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="card p-1 flex">
          {(Object.keys(CATEGORY_META) as ScannerCategory[]).map((key) => {
            const meta = CATEGORY_META[key];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.7rem] font-semibold transition-all',
                  category === key ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white',
                )}
              >
                <Icon size={13} /> {meta.label}
              </button>
            );
          })}
        </div>
        <span className="chip !text-[0.6rem]">{rows.length} instruments · simulated feed</span>
      </div>

      <p className="text-[0.66rem] dim mb-3">{CATEGORY_META[category].hint} — timeframe chart kholne ke liye apply hoga.</p>

      {/* Timeframe picker — flow 2 carries this into the chart */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="hud-label !text-[0.58rem]">Timeframe</span>
        <div className="card p-0.5 flex">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[0.66rem] font-semibold transition-colors',
                tf === timeframe ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'dim hover:text-white',
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Instrument table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[0.72rem]">
          <thead>
            <tr className="dim text-left hud-label !text-[0.56rem]">
              <th className="font-normal py-2 pr-3">Instrument</th>
              <th className="font-normal pr-3">Vehicle</th>
              <th className="font-normal pr-3 text-right">LTP</th>
              <th className="font-normal pr-3 text-right">Chg%</th>
              <th className="font-normal text-right">Chart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ inst, price, chg }) => {
              const active = focusSymbol === inst.symbol;
              return (
                <tr
                  key={inst.symbol}
                  onClick={() => openChart(inst.symbol, timeframe)}
                  className="border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold">{inst.display}</p>
                    <p className="text-[0.58rem] dim">{inst.exchange} · {inst.symbol}</p>
                  </td>
                  <td className="pr-3">
                    <Chip tone={inst.vehicle === 'options' ? 'violet' : inst.vehicle === 'futures' ? 'cyan' : 'steel'}>
                      {VEHICLE_LABEL[inst.vehicle]}
                    </Chip>
                  </td>
                  <td className="pr-3 text-right">
                    <MorphNumber value={price} format={(n) => n.toFixed(n > 1000 ? 0 : 2)} className="font-mono" />
                  </td>
                  <td className={cn('pr-3 text-right font-mono font-semibold', chg >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                    {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                  </td>
                  <td className="text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openChart(inst.symbol, timeframe); }}
                      className={cn(
                        'btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[0.64rem] font-semibold',
                        active && 'btn-primary',
                      )}
                    >
                      Open <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
