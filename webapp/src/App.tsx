import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, brain } from './state/store';
import { TopBar } from './components/nav/TopBar';
import { LeftRail } from './components/nav/LeftRail';
import { CommandView } from './views/CommandView';
import { TimeMachineView } from './views/TimeMachineView';
import { HatcheryView } from './views/HatcheryView';
import { LearningView } from './views/LearningView';
import { DeckView } from './views/DeckView';
import { ZenOverlay } from './components/ZenOverlay';
import { RiskLockdownBanner } from './components/nav/RiskLockdownBanner';
import { StatusFooter } from './components/nav/StatusFooter';
import { ToastStack } from './components/nav/ToastStack';
import { AmbientBackground } from './components/AmbientBackground';
import { BrainCircuit } from 'lucide-react';

/** Wires Zen Guard interaction telemetry (erratic mouse + tab thrashing). */
function BehaviorProbe() {
  useEffect(() => {
    let last = 0;
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - last < 60) return;
      last = now;
      brain.zen.recordMouse(e.clientX, e.clientY);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') brain.zen.recordTabSwitch();
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return null;
}

function AmbientFlash() {
  const token = useStore((s) => s.snapshot?.theme.token);
  const flash = token === 'whale-green' || token === 'whale-red' || token === 'amber' || token === 'panic';
  const color =
    token === 'whale-green' ? 'rgba(45,255,176,0.16)'
    : token === 'whale-red' ? 'rgba(255,84,112,0.18)'
    : token === 'amber' ? 'rgba(255,174,59,0.15)'
    : token === 'panic' ? 'rgba(255,59,87,0.22)'
    : 'transparent';
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-[60]"
      animate={{ opacity: flash ? [0.25, 0.75, 0.35] : 0 }}
      transition={{ duration: 1.1, repeat: flash ? Infinity : 0 }}
      style={{ background: `radial-gradient(circle at 50% 40%, ${color}, transparent 75%)` }}
    />
  );
}

function BootScreen() {
  return (
    <div className="h-screen grid place-items-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl grid place-items-center breathe" style={{ background: 'var(--accent-soft)', border: '1px solid var(--panel-border)' }}>
          <BrainCircuit size={30} className="neon-text" />
        </div>
        <p className="mt-4 shimmer-text font-medium">Waking the neural trading brain…</p>
        <p className="text-xs dim mt-1">connecting simulated yfinance + Binance parity feeds</p>
      </div>
    </div>
  );
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const view = useStore((s) => s.view);
  const bellOpen = useStore((s) => s.bellOpen);

  useEffect(() => {
    if (bellOpen) brain.markAlertsRead();
  }, [bellOpen]);

  if (!ready) return <BootScreen />;

  return (
    <div className="h-screen flex flex-col">
      <BehaviorProbe />
      <AmbientBackground />
      <AmbientFlash />
      <TopBar />

      <div className="flex-1 flex gap-4 px-4 lg:px-6 py-4 min-h-0">
        <LeftRail />
        <main className="flex-1 min-w-0 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              {view === 'command' && <CommandView />}
              {view === 'timemachine' && <TimeMachineView />}
              {view === 'hatchery' && <HatcheryView />}
              {view === 'learning' && <LearningView />}
              {view === 'deck' && <DeckView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <StatusFooter />
      <div className="fixed inset-0 grid-overlay pointer-events-none z-[1]" />
      <ToastStack />
      <RiskLockdownBanner />
      <ZenOverlay />
    </div>
  );
}
