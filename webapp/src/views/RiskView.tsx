import { ShieldHalf, ShieldAlert } from 'lucide-react';
import { useStore, brain } from '../state/store';
import { RiskHud } from '../components/panels/RiskHud';
import { GreeksPanel } from '../components/panels/GreeksPanel';
import { FundingLiquidation, ExecutionModule, InsuranceVault, GapForecastPanel } from '../components/panels/DeckPanels';

export function RiskView() {
  const locked = useStore((s) => s.snapshot?.lockdown);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold heading-accent flex items-center gap-2">
            <ShieldHalf size={18} className="text-[var(--accent)]" /> Risk Centre & Institutional Desk
          </h2>
          <p className="text-[0.72rem] dim mt-1">Hard stops, Greeks, TWAP/VWAP execution, liquidation radar, hedge vault aur pre-market forecast — sab ek jagah</p>
        </div>
        <button
          onClick={() => brain.panicSquareOff()}
          className="btn px-4 py-2.5 text-[0.76rem] font-bold flex items-center gap-2"
          style={{ borderColor: 'rgba(255,84,112,0.55)', color: '#ff9daf', background: 'rgba(255,84,112,0.08)' }}
        >
          <ShieldAlert size={15} /> Emergency Square-Off
        </button>
      </div>

      {locked && (
        <div className="card p-4 flex items-center gap-3" style={{ borderColor: 'rgba(255,84,112,0.5)' }}>
          <ShieldAlert className="text-[var(--red)] breathe" size={18} />
          <div className="flex-1">
            <p className="text-[0.82rem] font-bold text-[var(--red)]">2% Daily Drawdown Lockdown Active</p>
            <p className="text-[0.68rem] dim">Autonomous execution frozen — non-essential operations band hain.</p>
          </div>
          <button onClick={() => brain.acknowledgeRiskLock()} className="btn px-4 py-2 text-[0.72rem] font-semibold">Acknowledge & Reset</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <RiskHud />
        <GreeksPanel />
        <FundingLiquidation />
        <ExecutionModule />
        <InsuranceVault />
        <GapForecastPanel />
      </div>
    </div>
  );
}
