import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../state/store';
import { Panel, MorphNumber, Chip } from '../ui/Primitives';
import { compactInr, cn } from '../../utils/cn';

export function PositionsList() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;

  return (
    <Panel
      title="Autonomous Positions"
      subtitle="Iceberg-sliced entries · live Chandelier trail"
      right={<Chip tone="cyan">{snapshot.positions.length} open</Chip>}
    >
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {snapshot.positions.length === 0 && (
            <p className="text-xs dim text-center py-8">No open exposure — brain is waiting for A-grade confluence.</p>
          )}
          {snapshot.positions.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              className="rounded-2xl bg-white/[0.04] border border-white/10 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[0.66rem] font-bold px-2 py-0.5 rounded-lg tracking-wider"
                    style={{
                      color: p.side === 'BUY' ? '#2dffb0' : '#ff5470',
                      background: `${p.side === 'BUY' ? '#2dffb0' : '#ff5470'}18`,
                    }}
                  >
                    {p.side}
                  </span>
                  <span className="text-xs font-medium">{p.symbol}</span>
                </div>
                <MorphNumber
                  value={p.pnl}
                  format={(n) => compactInr(n)}
                  className={cn('text-sm font-mono font-semibold', p.pnl >= 0 ? 'text-neon-green' : 'text-neon-red')}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[0.64rem] dim">
                <span>qty <b className="text-white/100 font-mono">{p.qty}</b></span>
                <span>entry <b className="text-white/100 font-mono">{p.entry.toFixed(2)}</b></span>
                <span>stop <b className="text-neon-red/90 font-mono">{p.stop.toFixed(2)}</b></span>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[0.6rem] dim">{p.strategy}</span>
                {p.hedge && <Chip tone="steel">OTM hedge armed</Chip>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
}
