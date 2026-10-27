import { ShieldAlert, TrendingDown, Lock } from 'lucide-react';
import { useStore } from '../../state/store';
import { Panel, Bar, MorphNumber } from '../ui/Primitives';
import { MAX_DAILY_DRAWDOWN } from '../../engine/riskEngine';
import { compactInr, cn } from '../../utils/cn';

export function RiskHud() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const { risk } = snapshot;
  const ddUsed = Math.min(1, Math.abs(risk.drawdownPct) / MAX_DAILY_DRAWDOWN);
  const ddColor = risk.locked ? '#ff3b57' : ddUsed > 0.6 ? '#ffae3b' : '#2dffb0';

  return (
    <Panel
      title="Risk Engine HUD"
      subtitle="Hard stops · Chandelier trail · circuit breaker"
      right={risk.locked ? <Lock size={16} className="text-neon-red breathe" /> : undefined}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
            <p className="hud-label !text-[0.56rem] flex items-center gap-1"><ShieldAlert size={10} /> Hard Stop-Loss</p>
            <p className="text-base font-mono mt-1 text-neon-red">{(risk.hardStopPct * 100).toFixed(1)}%</p>
            <p className="text-[0.62rem] dim">per autonomous position</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
            <p className="hud-label !text-[0.56rem] flex items-center gap-1"><TrendingDown size={10} /> Trailing SL</p>
            <p className="text-base font-mono mt-1 neon-text">Chandelier 22·3</p>
            <p className="text-[0.62rem] dim">dynamic ATR exit logic</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="hud-label !text-[0.56rem]">Max Daily Drawdown — lock at −2%</span>
            <MorphNumber value={risk.drawdownPct * 100} format={(n) => `${n.toFixed(2)}%`} className="text-xs font-mono" />
          </div>
          <div className="relative">
            <Bar value={Math.abs(risk.drawdownPct)} max={MAX_DAILY_DRAWDOWN} color={ddColor} className="h-2.5" />
            <span className="absolute top-[-3px] bottom-[-3px] w-px bg-white/50" style={{ left: '100%' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[0.6rem] dim">{risk.locked ? 'CIRCUIT BREAKER TRIPPED' : 'circuit healthy'}</span>
            <span className="text-[0.6rem] dim">loss avoided by trails: {compactInr(risk.totalSaved)}</span>
          </div>
        </div>

        <div className="rounded-2xl p-3 border" style={{ borderColor: `${ddColor}44`, background: `${ddColor}0d` }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Equity</span>
            <MorphNumber value={risk.equity} format={(n) => compactInr(n)} className="text-sm font-semibold" />
          </div>
          <div className={cn('text-[0.66rem] dim mt-1', risk.locked && 'text-neon-red')}>
            {risk.locked ? 'App locked down — non-essential operations frozen' : 'Autonomous sizing fixed at 0.8% equity risk per trade'}
          </div>
        </div>
      </div>
    </Panel>
  );
}
