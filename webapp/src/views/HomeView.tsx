import { useStore } from '../state/store';
import { MiriCard } from '../components/home/MiriCard';
import { MarketOverview } from '../components/home/MarketOverview';
import { QuickStats } from '../components/home/QuickStats';
import { CandleChart } from '../components/home/CandleChart';
import { Watchlist } from '../components/home/Watchlist';
import {
  StrategyLabCard, HypothesisCard, LearningLoopCard, TradeAutopsyCard, RiskCentreCard,
} from '../components/home/BottomRow';

export function HomeView() {
  const setView = useStore((s) => s.setView);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-5 min-h-[210px]">
          <MiriCard />
        </div>
        <div className="xl:col-span-4">
          <MarketOverview />
        </div>
        <div className="xl:col-span-3">
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
