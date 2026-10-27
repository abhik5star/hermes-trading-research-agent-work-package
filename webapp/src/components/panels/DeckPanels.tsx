import { useMemo } from 'react';
import { Flame, Landmark, ShieldCheck, RefreshCw, Gauge as GaugeIcon, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useStore, brain } from '../../state/store';
import { feed } from '../../engine/marketFeed';
import { Panel, Chip, MorphNumber, Bar } from '../ui/Primitives';
import { compactInr, cn } from '../../utils/cn';
import { mulberry32, hashSeed } from '../../engine/rng';

// ── Crypto funding + liquidation radar ─────────────────────────────────────
export function FundingLiquidation() {
  const snapshot = useStore((s) => s.snapshot);
  const book = feed.getBook(snapshot?.focusSymbol ?? '^NSEI');
  const funding = book.fundingRate;
  const heartbeat = snapshot?.heartbeat ?? 0;

  const grid = useMemo(() => {
    const r = mulberry32(hashSeed('liq' + Math.floor(heartbeat / 3)));
    return Array.from({ length: 40 }, () => r());
  }, [heartbeat]);

  return (
    <Panel title="Crypto Funding & Liquidation Radar" subtitle="Counter-retail entry mapping · dark leverage clusters">
      {funding !== undefined ? (
        <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] border border-white/10 p-3 mb-3">
          <div>
            <p className="hud-label !text-[0.56rem]">Funding Rate Arbitrage Alert</p>
            <p className="text-sm font-mono mt-1" style={{ color: funding > 0 ? '#ff5470' : '#2dffb0' }}>
              {(funding * 100).toFixed(4)}%
            </p>
          </div>
          <Chip tone={funding > 0.0002 ? 'red' : 'green'}>
            {funding > 0.0002 ? 'Routing via Options to bypass fee decay' : 'Futures vehicle efficient'}
          </Chip>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 mb-3 flex items-center justify-between">
          <p className="text-xs dim">Focus an NSE instrument — crypto funding appears on BTC/ETH perps</p>
          <Chip tone="steel">NSE feed</Chip>
        </div>
      )}

      <p className="hud-label !text-[0.56rem] mb-2">3D Liquidation Heat-Map Grid — retail leverage pools</p>
      <div className="grid grid-cols-8 gap-1">
        {grid.map((v, i) => {
          const hot = v > 0.82;
          const entry = v > 0.93;
          return (
            <div
              key={i}
              className="aspect-square rounded-md transition-all duration-700 relative"
              style={{
                background: entry
                  ? 'rgba(45,255,176,0.65)'
                  : hot
                    ? `rgba(255,84,112,${0.25 + v * 0.55})`
                    : `rgba(77,125,255,${0.06 + v * 0.2})`,
                boxShadow: entry ? '0 0 12px rgba(45,255,176,0.7)' : hot ? '0 0 8px rgba(255,84,112,0.4)' : undefined,
              }}
              title={entry ? 'AI counter-retail entry zone' : hot ? 'High liquidation density' : undefined}
            />
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-[0.64rem] dim">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neon-green" /> AI entry before sweep</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neon-red/70" /> Retail liq pool</span>
      </div>
    </Panel>
  );
}

// ── TWAP / VWAP execution monitor ──────────────────────────────────────────
export function ExecutionModule() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const order = snapshot.execution.orders[0];

  return (
    <Panel
      title="Institutional Execution — TWAP / VWAP"
      subtitle="Iceberg-sliced micro-orders vs market impact"
      right={<Chip tone="cyan"><GaugeIcon size={11} /> slippage counter</Chip>}
    >
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 mb-3 flex items-center justify-between">
        <div>
          <p className="hud-label !text-[0.56rem]">Slippage Optimization Counter</p>
          <MorphNumber value={snapshot.execution.saved} format={(n) => compactInr(n)} className="text-xl font-semibold text-neon-green" />
        </div>
        <p className="text-[0.64rem] dim max-w-[46%] text-right">saved vs market-order impact benchmark across all sliced orders</p>
      </div>

      {order ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium">{order.symbol} · {order.side}</span>
            <Chip tone="steel">{order.algo} · {order.filledQty}/{order.totalQty}</Chip>
          </div>
          <div className="space-y-1.5">
            {order.slices.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-[0.6rem] dim w-14 font-mono">#{s.id} {s.venue}</span>
                <div className="flex-1 h-4 rounded-md bg-white/5 overflow-hidden relative">
                  <div
                    className="h-full rounded-md"
                    style={{ width: `${(s.qty / order.totalQty) * 100}%`, background: 'linear-gradient(90deg, rgba(56,232,255,0.5), rgba(77,125,255,0.6))' }}
                  />
                </div>
                <span className="text-[0.62rem] font-mono dim w-16 text-right">{s.qty} @ {s.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Bar value={order.filledQty} max={order.totalQty} className="mt-3 h-1.5" />
        </div>
      ) : (
        <p className="text-xs dim text-center py-6">Awaiting next autonomous execution — slices will stream here.</p>
      )}
    </Panel>
  );
}

// ── Black Swan insurance vault ─────────────────────────────────────────────
export function InsuranceVault() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const active = snapshot.execution.hedgeActive;

  return (
    <Panel title="Black Swan Insurance Vault" subtitle="Overnight far-OTM portfolio hedge">
      <div className={cn('rounded-2xl border p-4 flex items-center gap-4 relative overflow-hidden', active ? 'border-neon-steel/50' : 'border-white/10')}>
        {active && <div className="absolute inset-0 bg-neon-steel/10 breathe" />}
        <div
          className="w-14 h-14 rounded-2xl grid place-items-center shrink-0"
          style={{
            background: active ? 'rgba(111,179,255,0.18)' : 'rgba(255,255,255,0.05)',
            boxShadow: active ? '0 0 26px rgba(111,179,255,0.5)' : undefined,
          }}
        >
          <ShieldCheck size={26} className={active ? 'text-neon-steel' : 'dim'} />
        </div>
        <div className="relative">
          <p className="text-sm font-medium flex items-center gap-2">
            {active ? 'Hedge locked & active' : 'No overnight carry — vault standing by'}
            {active && <span className="w-1.5 h-1.5 rounded-full bg-neon-steel breathe" />}
          </p>
          <p className="text-[0.68rem] dim mt-1">
            {active ? snapshot.execution.hedgeLabel : 'A far-OTM hedge auto-deploys when leverage is carried overnight.'}
          </p>
          <p className="text-[0.72rem] mt-1.5 text-neon-steel font-medium">
            Black Swan Exposure: {active ? '100% Protected' : '0% Deployed'} against a sudden ±5% market gap event
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ── Pre-market gap forecast ────────────────────────────────────────────────
export function GapForecastPanel() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot?.gapForecast) return null;
  const f = snapshot.gapForecast;
  const up = f.direction !== 'GAP-DOWN';

  return (
    <Panel
      title="Pre-Market Holographic Forecast · 9:00 AM IST"
      subtitle="GIFT Nifty · global indices · block flow · PCR / Max Pain"
      right={
        <button onClick={() => brain.refreshForecast()} className="btn-ghost w-8 h-8 grid place-items-center rounded-xl">
          <RefreshCw size={13} />
        </button>
      }
    >
      <div className="flex items-center gap-5 mb-4">
        <div>
          <p className="hud-label !text-[0.56rem]">Predicted Gap</p>
          <div className="flex items-center gap-2 mt-1">
            {up ? <ArrowUpRight className="text-neon-green" size={20} /> : <ArrowDownRight className="text-neon-red" size={20} />}
            <MorphNumber
              value={f.gapPct}
              format={(n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`}
              className={cn('text-2xl font-semibold', up ? 'text-neon-green' : 'text-neon-red')}
            />
          </div>
          <Chip tone={up ? 'green' : 'red'} className="mt-1.5">{f.direction}</Chip>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2 text-[0.68rem]">
          <Metric label="GIFT Nifty" value={f.giftNifty.toFixed(1)} />
          <Metric label="S&P 500" value={`${f.spx >= 0 ? '+' : ''}${f.spx.toFixed(2)}%`} tone={f.spx} />
          <Metric label="Nasdaq" value={`${f.nasdaq >= 0 ? '+' : ''}${f.nasdaq.toFixed(2)}%`} tone={f.nasdaq} />
          <Metric label="Dow Jones" value={`${f.dow >= 0 ? '+' : ''}${f.dow.toFixed(2)}%`} tone={f.dow} />
          <Metric label="Close PCR" value={f.pcr.toFixed(2)} />
          <Metric label="Max Pain shift" value={`${f.maxPainShift >= 0 ? '+' : ''}${f.maxPainShift.toFixed(2)}%`} tone={f.maxPainShift} />
          <Metric label="Block flow (₹Cr)" value={compactInr(f.blockFlow * 1e7)} tone={f.blockFlow} />
        </div>
      </div>
      <p className="hud-label !text-[0.56rem] mb-2 flex items-center gap-1"><Flame size={10} /> Structural zones likely tested on open</p>
      <div className="flex flex-wrap gap-2">
        {f.zones.map((z, i) => (
          <span key={i} className="chip">
            <Landmark size={10} /> {z.label} <b className="font-mono ml-1">{z.price.toFixed(0)}</b>
          </span>
        ))}
      </div>
    </Panel>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: number }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 px-2.5 py-1.5">
      <p className="dim text-[0.58rem] tracking-wider uppercase">{label}</p>
      <p className={cn('font-mono mt-0.5', tone !== undefined && (tone >= 0 ? 'text-neon-green' : 'text-neon-red'))}>{value}</p>
    </div>
  );
}
