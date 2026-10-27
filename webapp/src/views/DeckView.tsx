import { ShieldHalf } from 'lucide-react';
import { GreeksPanel } from '../components/panels/GreeksPanel';
import { FundingLiquidation, ExecutionModule, InsuranceVault, GapForecastPanel } from '../components/panels/DeckPanels';

export function DeckView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ShieldHalf size={19} className="neon-text" /> Institutional Execution & Risk Protection Deck
        </h2>
        <p className="text-xs dim mt-1">Greeks pipeline · liquidation radar · TWAP/VWAP desk · black swan vault · gap predictor</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <GreeksPanel />
        <FundingLiquidation />
        <ExecutionModule />
        <InsuranceVault />
      </div>
      <GapForecastPanel />
    </div>
  );
}
