import { Bitcoin, LineChart, CandlestickChart, ArrowRight } from 'lucide-react';
import { useStore, type ScannerCategory } from '../state/store';
import { UNIVERSE } from '../engine/instruments';
import { MarketOverview } from '../components/home/MarketOverview';
import { QuickStats } from '../components/home/QuickStats';
import { CandleChart } from '../components/home/CandleChart';
import { Watchlist } from '../components/home/Watchlist';
import {
  StrategyLabCard, StrategyRegistryCard, HypothesisCard, LearningLoopCard, TradeAutopsyCard, RiskCentreCard,
} from '../components/home/BottomRow';

const SCANNER_ENTRIES: { key: ScannerCategory; title: string; desc: string; icon: typeof Bitcoin }[] = [
  { key: 'crypto', title: 'Crypto', desc: 'BTC, ETH, SOL spot & perpetuals', icon: Bitcoin },
  { key: 'indices', title: 'Indian Indices', desc: 'Nifty 50, Bank Nifty + option chain', icon: LineChart },
  { key: 'fno', title: 'F&O Stocks', desc: 'NSE equity futures & options', icon: CandlestickChart },
];

function countFor(key: ScannerCategory) {
  if (key === 'crypto') return UNIVERSE.filter((i) => i.assetClass === 'crypto').length;
  if (key === 'indices') return UNIVERSE.filter((i) => i.assetClass === 'index').length;
  return UNIVERSE.filter((i) => i.assetClass === 'equity').length;
}

export function HomeView() {
  const setView = useStore((s) => s.setView);
  const setScannerCategory = useStore((s) => s.setScannerCategory);
  const setBacktestTab = useStore((s) => s.setBacktestTab);
  const setAutopsyTab = useStore((s) => s.setAutopsyTab);
  const snapshot = useStore((s) => s.snapshot);

  const openScanner = (category: ScannerCategory) => {
    setScannerCategory(category);
    setView('scanner');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[1.15rem] font-bold">Good to see you, Abhishek</h1>
          <p className="text-[0.72rem] dim mt-0.5">
            Aaj ka market snapshot — {snapshot?.focusSymbol.replace('_PERP', '')} pe focus hai
          </p>
        </div>
        <span className="chip">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] pulse-dot" />
          Demo feed live · all values simulated
        </span>
      </div>

      {/* Flow 1 — Home → Market Scanner category picker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SCANNER_ENTRIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.key}
              onClick={() => openScanner(entry.key)}
              className="card card-hover p-4 text-left flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--accent-soft)', border: '1px solid rgba(58,168,232,0.35)' }}>
                <Icon size={19} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[0.86rem] flex items-center gap-2">
                  {entry.title}
                  <span className="chip !text-[0.56rem] !py-0.5">{countFor(entry.key)} instruments</span>
                </p>
                <p className="text-[0.64rem] dim mt-0.5 truncate">{entry.desc}</p>
              </div>
              <ArrowRight size={16} className="dim shrink-0" />
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-7">
          <MarketOverview />
        </div>
        <div className="xl:col-span-5">
          <QuickStats />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 min-h-[480px]">
          <CandleChart />
        </div>
        <div className="xl:col-span-4 min-h-[480px]">
          <Watchlist />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StrategyLabCard onOpen={() => { useStore.getState().setSelectedPodId(null); setView('lab'); }} />
        <StrategyRegistryCard onOpen={() => { useStore.getState().setLabTab('registry'); setView('lab'); }} />
        <HypothesisCard onOpen={() => { setBacktestTab('hypothesis'); setView('backtest'); }} />
        <LearningLoopCard onOpen={() => { setAutopsyTab('learning'); setView('autopsy'); }} />
        <TradeAutopsyCard onOpen={() => { setAutopsyTab('postmortem'); setView('autopsy'); }} />
        <RiskCentreCard onOpen={() => setView('risk')} />
      </div>
    </div>
  );
}
