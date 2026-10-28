import { Settings as SettingsIcon, Type, Plug, FlaskConical, Info, AArrowDown, AArrowUp, Type as TypeIcon } from 'lucide-react';
import { useStore, type FontScale } from '../state/store';
import { FOCUS_SYMBOLS, instrument } from '../engine/instruments';
import { cn } from '../utils/cn';

export function SettingsView() {
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  const beginner = useStore((s) => s.beginnerMode);
  const setBeginner = useStore((s) => s.setBeginnerMode);
  const snapshot = useStore((s) => s.snapshot);

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
        <h3 className="text-[0.88rem] font-bold flex items-center gap-2 mb-4"><Plug size={15} className="text-[var(--accent)]" /> Data Connections</h3>
        <div className="space-y-2.5">
          <ConnectionRow name="Simulated Feed (Binance/yfinance parity)" status="Connected (demo)" ok detail={snapshot?.dataAdapter ?? ''} />
          <ConnectionRow name="Binance WebSocket (live)" status="Not Connected" ok={false} detail="wss://stream.binance.com — API key required" />
          <ConnectionRow name="yfinance / NSE Bridge (live)" status="Not Connected" ok={false} detail="Nifty, BankNifty, NSE stocks — bridge deployment required" />
          <ConnectionRow name="Broker Order Routing (Kite/Dhan/Angel)" status="Not Connected" ok={false} detail="ExecutionEngine adapter plug-in point" />
        </div>
        <p className="text-[0.64rem] dim mt-3 leading-relaxed">
          Research build mein sab data ek local simulated feed se aata hai jo real WebSocket structures (ticks, candles, order book, funding, OI)
          ko mirror karta hai. Live ke liye sirf <span className="font-mono text-white/80">engine/marketFeed.ts</span> ka adapter replace karna hota hai — baaki code untouched rehta hai.
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
          Hermes Neural — autonomous SMC/ICT research dashboard. Saare P&L, orders aur predictions locally simulated hain.
          Real capital ke saath use karne se pehle live data adapter, broker compliance aur 2–3 mahine ka paper performance zaroori hai.
        </p>
      </div>
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
