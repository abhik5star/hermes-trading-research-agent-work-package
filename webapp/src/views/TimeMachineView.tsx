import { motion } from 'framer-motion';
import { Sparkles, GitBranch, ShieldAlert, TrendingUp } from 'lucide-react';
import { useStore } from '../state/store';
import { NeuralChart } from '../components/chart/NeuralChart';
import { Panel, Chip, ProgressRing, Bar } from '../components/ui/Primitives';

const PATH_STYLE = {
  A: { color: '#2dffb0', name: 'Primary Bullish Case' },
  B: { color: '#ffd84d', name: 'Sideways Consolidation' },
  C: { color: '#ff5470', name: 'Invalidated / Bearish Case' },
} as const;

export function TimeMachineView() {
  const snapshot = useStore((s) => s.snapshot);
  if (!snapshot) return null;
  const mc = snapshot.monteCarlo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold heading-accent flex items-center gap-2">
            <Sparkles size={19} className="neon-text" /> Cognitive AI Time Machine
          </h2>
          <p className="text-xs dim mt-1">
            Hyper-fast local simulation · three highest-probability future paths projected before every autonomous trade
          </p>
        </div>
        <Chip tone="cyan" className="breathe"><GitBranch size={11} /> holographic simulation matrix live</Chip>
      </div>

      <NeuralChart tall />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {snapshot.paths.map((p, i) => {
          const style = PATH_STYLE[p.id];
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-3xl p-5 relative overflow-hidden"
              style={{ borderTop: `2px solid ${style.color}` }}
            >
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-3xl" style={{ background: `${style.color}22` }} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ProgressRing value={p.probability / 100} size={68} stroke={6} color={style.color}>
                    <span className="text-xs font-mono font-semibold" style={{ color: style.color }}>
                      {p.probability.toFixed(0)}%
                    </span>
                  </ProgressRing>
                  <div>
                    <p className="text-sm font-semibold">Path {p.id}</p>
                    <p className="text-[0.68rem] dim">{style.name}</p>
                  </div>
                </div>
                {p.id === 'A' && <TrendingUp size={16} style={{ color: style.color }} />}
                {p.id === 'C' && <ShieldAlert size={16} style={{ color: style.color }} />}
              </div>
              <p className="text-xs dim leading-relaxed mt-4 min-h-[48px]">{p.catalyst}</p>
              <div className="mt-3">
                <Bar value={p.probability} max={100} color={style.color} />
              </div>
              <p className="text-[0.6rem] dim mt-2">live neural confidence · updates every simulation tick</p>
            </motion.div>
          );
        })}
      </div>

      {mc && (
        <Panel
          title="3D Monte Carlo Neural Tree — 10,000 randomised paths"
          subtitle="Quantile bands + sampled neon filaments · switch the chart layer to view"
          right={<Chip tone="violet">{(mc.probUp * 100).toFixed(1)}% paths finish above spot</Chip>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Simulated paths" value="10,000" />
            <Stat label="P(up) terminal" value={`${(mc.probUp * 100).toFixed(1)}%`} tone={mc.probUp >= 0.5 ? 'green' : 'red'} />
            <Stat label="Median terminal" value={mc.expected.toFixed(2)} />
            <Stat label="VaR 95 (5% worst)" value={`${(mc.var95 * 100).toFixed(2)}%`} tone="red" />
          </div>
        </Panel>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
      <p className="hud-label !text-[0.56rem]">{label}</p>
      <p className={`text-lg font-mono mt-1 ${tone === 'green' ? 'text-neon-green' : tone === 'red' ? 'text-neon-red' : ''}`}>{value}</p>
    </div>
  );
}
