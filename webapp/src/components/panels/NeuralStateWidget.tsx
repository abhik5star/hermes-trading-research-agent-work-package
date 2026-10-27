import { motion } from 'framer-motion';
import { Brain, Activity, Pause } from 'lucide-react';
import { useStore } from '../../state/store';
import { Panel, ProgressRing } from '../ui/Primitives';
import { cn } from '../../utils/cn';

export function NeuralStateWidget() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const active = snapshot.neuralStatus === 'Active';
  const actionColor = snapshot.neuralAction === 'BUY' ? '#2dffb0' : snapshot.neuralAction === 'SELL' ? '#ff5470' : '#8fa3bd';

  return (
    <Panel title="Neural State" subtitle="Autonomous execution cortex">
      <div className="flex items-center gap-4">
        <ProgressRing value={snapshot.confidence / 100} color={active ? 'var(--accent)' : '#64748b'} size={96}>
          <div className="text-center">
            <p className="text-lg font-semibold font-mono leading-none">{snapshot.confidence}%</p>
            <p className="text-[0.55rem] dim mt-1 tracking-widest">CONFIDENCE</p>
          </div>
        </ProgressRing>
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full', active ? 'bg-neon-green breathe' : 'bg-slate-500')} />
            <span className="text-sm">{active ? 'Active' : 'Idle'}</span>
            {active ? <Activity size={13} className="text-neon-green" /> : <Pause size={13} className="dim" />}
          </div>
          <motion.div
            key={snapshot.neuralAction}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-xl py-2 text-center font-bold tracking-[0.25em] text-sm"
            style={{ color: actionColor, border: `1px solid ${actionColor}55`, background: `${actionColor}14`, textShadow: `0 0 14px ${actionColor}66` }}
          >
            {snapshot.neuralAction}
          </motion.div>
          <p className="text-[0.66rem] dim flex items-center gap-1.5">
            <Brain size={11} /> Active genome · {snapshot.activeGenome.codename} Gen-{snapshot.activeGenome.generation}
          </p>
        </div>
      </div>
    </Panel>
  );
}
