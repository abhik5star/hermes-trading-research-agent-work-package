import { useStore } from '../state/store';
import { MarketOverview } from '../components/home/MarketOverview';
import { QuickStats } from '../components/home/QuickStats';
import { CandleChart } from '../components/home/CandleChart';
import { Watchlist } from '../components/home/Watchlist';
import {
  StrategyLabCard, HypothesisCard, LearningLoopCard, TradeAutopsyCard, RiskCentreCard,
} from '../components/home/BottomRow';

export function HomeView() {
  const setView = useStore((s) => s.setView);
  const snapshot = useStore((s) => s.snapshot);

  return (
    <div className="space-y-4">
      {/* plain page heading */}
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
        <StrategyLabCard onOpen={() => setView('lab')} />
        <HypothesisCard onOpen={() => setView('backtest')} />
        <LearningLoopCard onOpen={() => setView('autopsy')} />
        <TradeAutopsyCard onOpen={() => setView('autopsy')} />
        <RiskCentreCard onOpen={() => setView('risk')} />
      </div>
    </div>
  );
}
