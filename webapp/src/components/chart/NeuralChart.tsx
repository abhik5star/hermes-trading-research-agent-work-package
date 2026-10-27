import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers3, Network, Box, Sparkles, Eye } from 'lucide-react';
import { useStore } from '../../state/store';
import { feed } from '../../engine/marketFeed';
import { visibleCandles } from './chartMath';
import {
  HoloGrid, PriceStream, ZoneBoxes, GlowHeatmap, VolumeParticles,
  DarkNebula, TimePaths, WormholeLayers, MonteCarloTree, SweepMarkers,
} from './chartObjects';
import { ProgressRing, Chip } from '../ui/Primitives';
import { cn } from '../../utils/cn';

const PATH_META = {
  A: { color: '#2dffb0', label: 'Primary Bullish Case' },
  B: { color: '#ffd84d', label: 'Sideways / Consolidation' },
  C: { color: '#ff5470', label: 'Invalidated / Bearish Case' },
} as const;

function Scene({ layer, timemachine }: { layer: 'normal' | 'wormhole' | 'montecarlo'; timemachine: boolean }) {
  const snapshot = useStore((s) => s.snapshot)!;
  const candles = useMemo(
    () => visibleCandles(feed.getCandles(snapshot.focusSymbol)),
    // re-derive every store frame (heartbeat-driven)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snapshot.focusSymbol, snapshot.heartbeat, snapshot.paths],
  );

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[6, 6, 8]} intensity={1.2} color="#38e8ff" />
      <pointLight position={[-7, -4, 4]} intensity={0.7} color="#9d6bff" />
      <Stars radius={60} depth={40} count={900} factor={2.2} saturation={0.4} fade speed={0.6} />

      {layer === 'wormhole' ? (
        <WormholeLayers snapshot={snapshot} candles={candles} />
      ) : (
        <>
          <HoloGrid />
          <PriceStream candles={candles} snapshot={snapshot} />
          <ZoneBoxes snapshot={snapshot} candles={candles} />
          <GlowHeatmap snapshot={snapshot} candles={candles} />
          <VolumeParticles snapshot={snapshot} candles={candles} />
          <DarkNebula snapshot={snapshot} candles={candles} />
          <SweepMarkers snapshot={snapshot} candles={candles} />
          {layer === 'montecarlo' && <MonteCarloTree snapshot={snapshot} candles={candles} />}
        </>
      )}

      {(timemachine || layer === 'montecarlo') && <TimePaths snapshot={snapshot} candles={candles} />}
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={9}
        maxDistance={24}
        maxPolarAngle={Math.PI * 0.72}
        minPolarAngle={Math.PI * 0.25}
        autoRotate={timemachine}
        autoRotateSpeed={0.55}
      />
    </>
  );
}

export function NeuralChart({ tall = false }: { tall?: boolean }) {
  const snapshot = useStore((s) => s.snapshot);
  const chartLayer = useStore((s) => s.chartLayer);
  const setChartLayer = useStore((s) => s.setChartLayer);
  const setView = useStore((s) => s.setView);
  if (!snapshot) return null;
  const timemachine = snapshot.mode === 'timemachine';

  const layers = [
    { key: 'normal', label: 'SMC Neural Grid', icon: Box },
    { key: 'wormhole', label: 'Wormhole 5M·15M·1H', icon: Layers3 },
    { key: 'montecarlo', label: 'Monte Carlo 10K', icon: Network },
  ] as const;

  return (
    <div className={cn('relative glass rounded-3xl overflow-hidden', tall ? 'h-[640px]' : 'h-[440px]')}>
      {/* HUD top-left */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3">
        <div className="glass rounded-2xl px-3 py-2 flex items-center gap-3">
          <ProgressRing value={snapshot.confluenceScore / 100} size={52} stroke={5}>
            <span className="text-[0.72rem] font-mono font-semibold">{snapshot.confluenceScore}</span>
          </ProgressRing>
          <div>
            <p className="hud-label">Confluence Glow</p>
            <p className="text-xs font-medium mt-0.5">SMC/ICT × hidden stack</p>
          </div>
        </div>
        <Chip tone={snapshot.regime === 'whale-breakout' ? 'green' : snapshot.regime === 'sideways' ? 'violet' : 'cyan'}>
          <span className="w-1.5 h-1.5 rounded-full breathe bg-current" />
          {snapshot.regime.toUpperCase()} REGIME
        </Chip>
      </div>

      {/* HUD top-right: layer switch */}
      <div className="absolute right-4 top-4 z-10 flex gap-1 glass rounded-2xl p-1">
        {layers.map((l) => {
          const Icon = l.icon;
          return (
            <button
              key={l.key}
              onClick={() => setChartLayer(l.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[0.68rem] transition-all',
                chartLayer === l.key ? 'bg-[var(--accent-soft)] text-white' : 'dim hover:text-white',
              )}
            >
              <Icon size={12} />
              <span className="hidden md:inline">{l.label}</span>
            </button>
          );
        })}
      </div>

      {/* SMC event ticker */}
      <div className="absolute left-4 bottom-4 z-10 max-w-[60%]">
        <div className="glass rounded-xl px-3 py-2">
          <p className="hud-label !text-[0.56rem]">Latest structural event</p>
          <p className="text-xs mt-0.5 truncate shimmer-text">{snapshot.lastEvent}</p>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {snapshot.inPremium && <Chip tone="red">ICT Premium Zone</Chip>}
          {snapshot.inDiscount && <Chip tone="green">ICT Discount Zone</Chip>}
          {snapshot.optionSelling && <Chip tone="violet">Theta Harvest Active</Chip>}
          {snapshot.gammaBlast.blast && <Chip tone="amber">⚡ Gamma Blast {snapshot.gammaBlast.strike}</Chip>}
        </div>
      </div>

      {/* Time Machine path catalysts */}
      <AnimatePresence>
        {timemachine && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            className="absolute right-4 bottom-4 z-10 w-[300px] space-y-2"
          >
            {snapshot.paths.map((p) => (
              <div key={p.id} className="glass rounded-2xl p-3" style={{ borderLeft: `2px solid ${PATH_META[p.id].color}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: PATH_META[p.id].color }}>
                    Path {p.id} — {PATH_META[p.id].label}
                  </span>
                  <span className="font-mono text-xs" style={{ color: PATH_META[p.id].color }}>
                    {p.probability.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[0.68rem] dim mt-1 leading-relaxed">{p.catalyst}</p>
              </div>
            ))}
            <button onClick={() => setView('timemachine')} className="btn-ghost w-full py-2 text-xs flex items-center justify-center gap-2">
              <Sparkles size={13} /> Open full Time Machine matrix
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden stack whisper */}
      <div className={cn('absolute right-4 bottom-4 z-10 items-center gap-1.5 text-[0.6rem] dim opacity-70', timemachine ? 'hidden' : 'hidden xl:flex')}>
        <Eye size={11} />
        RSI · CCI · Donchian · Supertrend · Chandelier · CPR · Fib · EMA 20/50/200 processed silently
      </div>

      <Canvas
        camera={{ position: [0, 2.6, 14], fov: 45 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Scene layer={chartLayer} timemachine={timemachine} />
        </Suspense>
      </Canvas>
    </div>
  );
}
