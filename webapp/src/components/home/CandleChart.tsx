import { useEffect, useMemo, useRef, useState } from 'react';
import { CandlestickChart, Crosshair, Maximize2, Settings2, TrendingUp, FlaskConical } from 'lucide-react';
import { useStore } from '../../state/store';
import { feed } from '../../engine/marketFeed';
import { instrument } from '../../engine/instruments';
import type { Candle } from '../../engine/types';
import { cn } from '../../utils/cn';

const TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'];
const VIEW = 84;

export function CandleChart() {
  const snapshot = useStore((s) => s.snapshot);
  const focus = snapshot?.focusSymbol ?? useStore.getState().focusHistory[0];
  const focusHistory = useStore((s) => s.focusHistory);
  const timeframe = useStore((s) => s.timeframe);
  const setTimeframe = useStore((s) => s.setTimeframe);
  const beginner = useStore((s) => s.beginnerMode);
  const selectFocus = useStore((s) => s.selectFocus);
  const setSelectedPodId = useStore((s) => s.setSelectedPodId);
  const setView = useStore((s) => s.setView);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const candles: Candle[] = useMemo(
    () => feed.getCandles(focus).slice(-VIEW),
    // re-derive on every store commit (heartbeat-driven)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focus, snapshot?.heartbeat],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || candles.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const padR = 64;
    const padB = 18;
    const volH = 58;
    const plotH = H - volH - padB;
    const plotW = W - padR - 10;
    const lows = candles.map((c) => c.l);
    const highs = candles.map((c) => c.h);
    let min = Math.min(...lows);
    let max = Math.max(...highs);
    const pad = (max - min) * 0.08 || 1;
    min -= pad;
    max += pad;
    const cw = plotW / candles.length;
    const bodyW = Math.max(2, cw * 0.62);
    const y = (p: number) => ((max - p) / (max - min)) * plotH + 6;
    const maxVol = Math.max(...candles.map((c) => c.v));

    // grid + price axis
    ctx.font = '10px ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const p = min + ((max - min) / 5) * i;
      const yy = y(p);
      ctx.strokeStyle = 'rgba(120,150,210,0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, yy);
      ctx.lineTo(plotW, yy);
      ctx.stroke();
      ctx.fillStyle = 'rgba(191,207,235,0.55)';
      ctx.fillText(p.toFixed(p > 1000 ? 0 : 2), plotW + 6, yy);
    }

    // SMC/ICT demand & supply zones (kept subtle — normal dashboard look)
    for (const z of snapshot?.zones ?? []) {
      if (z.priceHigh < min || z.priceLow > max) continue;
      const isDemand = z.bias === 'bullish';
      ctx.fillStyle = isDemand ? 'rgba(29,184,134,0.09)' : 'rgba(229,83,107,0.09)';
      const y1 = y(z.priceHigh);
      const y2 = y(z.priceLow);
      ctx.fillRect(10, y1, plotW - 10, Math.max(2, y2 - y1));
    }

    // candles + volume
    candles.forEach((c, i) => {
      const x = 10 + i * cw + cw / 2;
      const up = c.c >= c.o;
      const color = up ? '#16d99c' : '#ff5470';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      // wick
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y(c.h));
      ctx.lineTo(x, y(c.l));
      ctx.stroke();
      // body
      const yO = y(c.o);
      const yC = y(c.c);
      const top = Math.min(yO, yC);
      const hgt = Math.max(1.5, Math.abs(yC - yO));
      ctx.globalAlpha = up ? 0.95 : 0.9;
      ctx.fillRect(x - bodyW / 2, top, bodyW, hgt);
      ctx.globalAlpha = 1;
      // volume
      const vh = (c.v / maxVol) * (volH - 12);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x - bodyW / 2, H - padB - vh, bodyW, vh);
      ctx.globalAlpha = 1;
    });

    // last price line + tag
    const last = candles[candles.length - 1];
    const lastY = y(last.c);
    ctx.strokeStyle = last.c >= last.o ? '#16d99c' : '#ff5470';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(10, lastY);
    ctx.lineTo(plotW, lastY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = last.c >= last.o ? '#16d99c' : '#ff5470';
    ctx.fillRect(plotW + 2, lastY - 9, padR - 6, 18);
    ctx.fillStyle = '#04101f';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.fillText(last.c.toFixed(last.c > 1000 ? 0 : 2), plotW + 6, lastY);

    // simple structural annotations from the latest SMC events
    const bos = [...(snapshot?.zones ?? [])].reverse().find((z) => z.kind === 'BOS' || z.kind === 'MSS');
    if (bos) {
      const bx = 10 + Math.max(4, candles.length - 26) * cw;
      const by = y((bos.priceHigh + bos.priceLow) / 2) - 14;
      drawTag(ctx, bx, by, bos.kind === 'MSS' ? 'Breakout' : 'BOS', '#3aa8e8');
    }
    const ob = [...(snapshot?.zones ?? [])].reverse().find((z) => z.kind === 'order-block');
    if (ob) {
      const rx = 10 + Math.max(4, candles.length - 12) * cw;
      const ry = y((ob.priceHigh + ob.priceLow) / 2) + 16;
      drawTag(ctx, rx, ry, ob.bias === 'bullish' ? 'Demand Zone' : 'Retest Hold', ob.bias === 'bullish' ? '#16d99c' : '#ffc24b');
    }

    // crosshair
    if (hover && hover.x < plotW) {
      ctx.strokeStyle = 'rgba(191,207,235,0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hover.x, 6);
      ctx.lineTo(hover.x, H - padB);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, hover.y);
      ctx.lineTo(plotW, hover.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const idx = Math.min(candles.length - 1, Math.max(0, Math.floor((hover.x - 10) / cw)));
      const hc = candles[idx];
      if (hc) {
        ctx.fillStyle = 'rgba(10,19,46,0.92)';
        ctx.fillRect(12, 8, 132, 34);
        ctx.strokeStyle = 'rgba(120,150,210,0.3)';
        ctx.strokeRect(12, 8, 132, 34);
        ctx.fillStyle = '#c3d2ee';
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(`O ${hc.o.toFixed(2)}  H ${hc.h.toFixed(2)}`, 18, 19);
        ctx.fillText(`L ${hc.l.toFixed(2)}  C ${hc.c.toFixed(2)}`, 18, 33);
      }
    }
  }, [candles, snapshot?.zones, hover]);

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const change = last && prev ? last.c - prev.c : 0;
  const changePct = prev ? (change / prev.c) * 100 : 0;

  return (
    <section className="card p-4 h-full flex flex-col">
      {/* symbol tabs — every chart opened from the scanner is added here */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {focusHistory.map((s) => (
          <button
            key={s}
            onClick={() => selectFocus(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[0.72rem] font-semibold transition-all flex items-center gap-1.5',
              s === focus ? 'bg-[var(--accent-soft)] text-white border border-[rgba(58,168,232,0.4)]' : 'dim btn',
            )}
          >
            {instrument(s).display.replace(' Perpetual', '')}
            {s === focus && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] breathe" />}
          </button>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2 text-[0.82rem] font-semibold">
          <CandlestickChart size={15} className="text-[var(--accent)]" />
          {instrument(focus).display}
          <span className="chip !py-0.5 !text-[0.62rem]">{timeframe} · {instrument(focus).exchange}</span>
        </div>
        <div className="flex items-center gap-1 card p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[0.68rem] font-semibold transition-colors',
                tf === timeframe ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'dim hover:text-white',
              )}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 dim">
          {/* Flow 3 — Chart → Strategy Lab setup inspection */}
          <button
            onClick={() => {
              if (snapshot) setSelectedPodId(snapshot.activeGenome.id);
              setView('lab');
            }}
            className="btn btn-primary h-8 px-3 grid place-items-center rounded-lg flex items-center gap-1.5 !text-[0.68rem] font-semibold"
            title="Is setup ki conditions Strategy Lab mein inspect karo"
          >
            <FlaskConical size={13} />
            <span className="hidden md:inline">Strategy Lab</span>
          </button>
          <button className="btn w-8 h-8 grid place-items-center rounded-lg"><TrendingUp size={14} /></button>
          <button className="btn w-8 h-8 grid place-items-center rounded-lg"><Crosshair size={14} /></button>
          <button className="btn w-8 h-8 grid place-items-center rounded-lg"><Settings2 size={14} /></button>
          <button className="btn w-8 h-8 grid place-items-center rounded-lg"><Maximize2 size={14} /></button>
        </div>
      </div>

      {/* OHLC strip */}
      {last && !beginner && (
        <div className="flex items-center gap-4 text-[0.68rem] font-mono mb-1 flex-wrap">
          <span className="dim">O <b className="text-white/85">{last.o.toFixed(2)}</b></span>
          <span className="dim">H <b className="text-[var(--green)]">{last.h.toFixed(2)}</b></span>
          <span className="dim">L <b className="text-[var(--red)]">{last.l.toFixed(2)}</b></span>
          <span className="dim">C <b className="text-white/85">{last.c.toFixed(2)}</b></span>
          <span className={change >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)
          </span>
          <span className="dim">Vol {(last.v / 1000).toFixed(1)}K</span>
        </div>
      )}

      <div ref={wrapRef} className="flex-1 min-h-[320px] relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onMouseLeave={() => setHover(null)}
        />
      </div>
      <p className="text-[0.62rem] dim mt-1.5">
        {beginner
          ? 'Hare candle = price badhi, laal = giri. Boxed zones wahan hain jahan bade players active the.'
          : 'Candles, volume profile, SMC order-block demand/supply zones and structural annotations rendered on local canvas.'}
      </p>
    </section>
  );
}

function drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = '600 10px Inter, system-ui, sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = 'rgba(8,17,42,0.9)';
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y - 11, w, 20, 6);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(text, x + 7, y);
}
