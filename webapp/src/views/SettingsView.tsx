import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Type, Plug, FlaskConical, Info, AArrowDown, AArrowUp, Type as TypeIcon, Radio, Palette, Check } from 'lucide-react';
import { useStore, THEME_OPTIONS, type FontScale } from '../state/store';
import { FOCUS_SYMBOLS, instrument } from '../engine/instruments';
import { feed, type LiveSource } from '../engine/liveFeed';
import type { FeedStatusReport } from '../engine/feedTypes';
import { cn } from '../utils/cn';

const LIVE_META: Record<LiveSource, { name: string; detail: string }> = {
  binance: {
    name: 'Binance Public WebSocket',
    detail: 'wss://stream.binance.com — free, no API key · crypto spot & USD-M futures',
  },
  yahoo: {
    name: 'Yahoo Finance (NSE indices & stocks)',
    detail: 'query1.finance.yahoo.com chart API · free, no API key · ^NSEI, ^NSEBANK, *.NS',
  },
};

export function SettingsView() {
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  const beginner = useStore((s) => s.beginnerMode);
  const setBeginner = useStore((s) => s.setBeginnerMode);
  const snapshot = useStore((s) => s.snapshot);
  const themeToken = useStore((s) => s.themeToken);
  const setThemeToken = useStore((s) => s.setThemeToken);

  const fontOptions: { key: FontScale; label: string; Icon: typeof TypeIcon }[] = [
    { key: 'sm', label: 'Chhota (Small)', Icon: AArrowDown },
    { key: 'md', label: 'Medium', Icon: TypeIcon },
    { key: 'lg', label: 'Bada (Large)', Icon: AArrowUp },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
        <SettingsIcon size={18} className="text-[var(--accent)]" /> Settings & Data Connections
      </h2>

      <div className="card p-5">
        <h3 className="text-[0.88rem] font-bold flex items-center gap-2 mb-4"><Type size={15} className="text-[var(--accent)]" /> Dynamic Font Scaler</h3>
        <div className="flex gap-3">
          {fontOptions.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setFontScale(key)}
              className={cn(
                'btn flex-1 py-3 px-4 flex items-center gap-3 text-left',
                fontScale === key && 'btn-primary',
              )}
            >
              <Icon size={16} />
              <div>
                <p className="text-[0.76rem] font-semibold">{label}</p>
                <p className="text-[0.6rem] dim">Layout responsive rahega</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[0.88rem] font-bold">Beginner Mode</h3>
            <p className="text-[0.68rem] dim mt-1">Simple view, easy Hinglish language — raw OHLC jargon chhup jata hai</p>
          </div>
          <button className={cn('toggle', beginner && 'on')} onClick={() => setBeginner(!beginner)} aria-label="Beginner mode" />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-[0.88rem] font-bold flex items-center gap-2 mb-1">
          <Palette size={15} className="text-[var(--accent)]" /> Dashboard Theme (manual)
        </h3>
        <p className="text-[0.66rem] dim mb-4">
          Colour ab apni marzi se set hota hai — whale, gamma blast ya mood ke event pe dashboard ka colour
          automatically change nahi hota.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {THEME_OPTIONS.map((o) => {
            const active = themeToken === o.token;
            return (
              <button
                key={o.token}
                onClick={() => setThemeToken(o.token)}
                className={cn(
                  'rounded-xl p-3 text-left transition-colors border',
                  active ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-white/5 hover:border-white/15',
                )}
                style={{ background: active ? undefined : 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {o.swatch.map((c) => (
                    <span key={c} className="w-4 h-4 rounded-md" style={{ background: c, border: '1px solid rgba(255,255,255,0.12)' }} />
                  ))}
                  {active && <Check size={13} className="ml-auto text-[var(--accent)]" />}
                </div>
                <p className="text-[0.74rem] font-semibold">{o.label}</p>
                <p className="text-[0.6rem] dim mt-0.5 leading-snug">{o.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>

      <LiveConnectionsCard />

      <div className="card p-5">
        <h3 className="text-[0.88rem] font-bold flex items-center gap-2 mb-4"><Plug size={15} className="text-[var(--accent)]" /> Data Connections</h3>
        <div className="space-y-2.5">
          <ConnectionRow name="Simulated Feed (local generator)" status="Connected" ok detail="Always available — per-symbol fallback when a live socket is unreachable" />
          <ConnectionRow name="Broker Order Routing (Kite/Dhan/Angel)" status="Not Connected" ok={false} detail="ExecutionEngine adapter plug-in point — live trading stays OFF" />
        </div>
        <p className="text-[0.64rem] dim mt-3 leading-relaxed">
          Live market data adapters public data hi padhte hain (candles, order book, ticker) — koi order endpoint, API key ya
          broker credential nahi. Chart ka badge <span className="font-mono text-white/80">LIVE</span> tab dikhta hai jab koi symbol
          sach me live socket se aa raha ho, warna <span className="font-mono text-white/80">SIM</span>. Socket band ho toh us symbol
          par simulated stream seamlessly wapas aa jata hai.
        </p>
      </div>

      <div className="card p-5">
        <h3 className="text-[0.88rem] font-bold flex items-center gap-2 mb-4"><FlaskConical size={15} className="text-[var(--accent)]" /> Focus Instruments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {FOCUS_SYMBOLS.map((s) => {
            const inst = instrument(s);
            return (
              <div key={s} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                <span className={cn('w-2 h-2 rounded-full', inst.exchange === 'NSE' ? 'bg-[var(--amber)]' : 'bg-[#9d8cff]')} />
                <div className="flex-1">
                  <p className="text-[0.76rem] font-semibold">{inst.display}</p>
                  <p className="text-[0.6rem] dim">{inst.exchange} · {inst.vehicle}</p>
                </div>
                <span className="chip !text-[0.58rem]">{inst.tickSize}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-[0.88rem] font-bold flex items-center gap-2 mb-2"><Info size={15} className="text-[var(--accent)]" /> About</h3>
        <p className="text-[0.7rem] dim leading-relaxed">
          Hermes Neural — autonomous SMC/ICT research dashboard. Saare P&amp;L, orders aur predictions locally simulated hain.
          Real capital ke saath use karne se pehle live data adapter, broker compliance aur 2–3 mahine ka paper performance zaroori hai.
        </p>
      </div>
    </div>
  );
}

/** Live feed toggles with the adapter's real connection state. */
function LiveConnectionsCard() {
  const [reports, setReports] = useState<FeedStatusReport[]>(() => feed.statusReports());
  const [binanceOn, setBinanceOn] = useState(() => feed.isSourceEnabled('binance'));
  const [yahooOn, setYahooOn] = useState(() => feed.isSourceEnabled('yahoo'));

  useEffect(() => {
    const id = setInterval(() => setReports(feed.statusReports()), 2000);
    return () => clearInterval(id);
  }, []);

  const toggle = (source: LiveSource, next: boolean) => {
    feed.setSource(source, next);
    if (source === 'binance') setBinanceOn(next);
    else setYahooOn(next);
    setReports(feed.statusReports());
  };

  const bySource = (name: string) => reports.find((r) => r.source.startsWith(name));

  return (
    <div className="card p-5">
      <h3 className="text-[0.88rem] font-bold flex items-center gap-2 mb-1">
        <Radio size={15} className="text-[var(--green)]" /> Live Market Data (free, no API key)
      </h3>
      <p className="text-[0.66rem] dim mb-4">
        Public data only — Binance WebSocket aur Yahoo Finance. Koi broker connect nahi hota, live trading OFF hi rehta hai.
      </p>

      <div className="space-y-2.5">
        {(['binance', 'yahoo'] as LiveSource[]).map((source) => {
          const meta = LIVE_META[source];
          const report = bySource(source === 'binance' ? 'binance' : 'yahoo');
          const on = source === 'binance' ? binanceOn : yahooOn;
          const status = report?.status ?? 'idle';
          const live = status === 'live';
          const errored = status === 'error';
          const tone = live ? 'var(--green)' : errored ? 'var(--red)' : 'var(--text-dim)';
          return (
            <div key={source} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', live ? 'bg-[var(--green)] pulse-dot' : errored ? 'bg-[var(--red)]' : 'bg-[var(--text-dim)]')} />
              <div className="flex-1 min-w-0">
                <p className="text-[0.76rem] font-semibold">{meta.name}</p>
                <p className="text-[0.6rem] dim truncate">{report?.detail ?? meta.detail}</p>
                {report && report.symbols.length > 0 && (
                  <p className="text-[0.58rem] dim mt-0.5">
                    {report.symbols.length} symbol(s) live · {report.symbols.slice(0, 4).join(', ')}
                    {report.symbols.length > 4 ? '…' : ''}
                  </p>
                )}
              </div>
              <span className="chip !text-[0.6rem]" style={{ color: tone, borderColor: `${tone}55` }}>
                {status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Unavailable' : 'Off'}
              </span>
              <button
                className={cn('toggle', on && 'on')}
                onClick={() => toggle(source, !on)}
                aria-label={`Toggle ${meta.name}`}
                title={on ? 'Band karo' : 'Chalu karo'}
              />
            </div>
          );
        })}
      </div>

      <p className="text-[0.62rem] dim mt-3 leading-relaxed">
        {reports.find((r) => r.source.startsWith('binance'))?.status === 'error' && (
          <span className="text-[var(--amber)]">
            Binance socket reachable nahi hua (network blocked?) — crypto symbols simulated stream pe hi chal rahe hain. App bilkul theek chalega.
          </span>
        )}
        <span className="font-mono text-white/70">engine/feeds/binanceWs.ts</span> aur{' '}
        <span className="font-mono text-white/70">engine/feeds/yahooFeed.ts</span> me adapters hain —{' '}
        <span className="font-mono text-white/70">engine/liveFeed.ts</span> unhe composite feed me route karta hai.
      </p>
    </div>
  );
}

function ConnectionRow({ name, status, ok, detail }: { name: string; status: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', ok ? 'bg-[var(--green)] pulse-dot' : 'bg-[var(--red)]')} />
      <div className="flex-1 min-w-0">
        <p className="text-[0.76rem] font-semibold">{name}</p>
        <p className="text-[0.6rem] dim truncate">{detail}</p>
      </div>
      <span
        className="chip !text-[0.6rem]"
        style={{ color: ok ? 'var(--green)' : 'var(--red)', borderColor: ok ? 'rgba(29,184,134,0.35)' : 'rgba(229,83,107,0.35)' }}
      >
        {status}
      </span>
    </div>
  );
}
