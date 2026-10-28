import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, brain } from './state/store';
import { Sidebar, MobileNav } from './components/layout/Sidebar';
import { TickerBar } from './components/layout/TickerBar';
import { StatusBar } from './components/layout/StatusBar';
import { HomeView } from './views/HomeView';
import { ScannerView } from './views/ScannerView';
import { LabView } from './views/LabView';
import { BacktestView } from './views/BacktestView';
import { AutopsyView } from './views/AutopsyView';
import { RiskView } from './views/RiskView';
import { SettingsView } from './views/SettingsView';
import { ZenOverlay } from './components/ZenOverlay';
import { RiskLockdownBanner } from './components/nav/RiskLockdownBanner';
import { ToastStack } from './components/nav/ToastStack';
import { BrainCircuit } from 'lucide-react';

/** Zen Guard interaction telemetry — erratic mouse + tab thrashing. */
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

function BootScreen() {
  return (
    <div className="h-screen grid place-items-center">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl grid place-items-center breathe" style={{ background: 'var(--accent-soft)', border: '1px solid var(--panel-border)' }}>
          <BrainCircuit size={28} className="text-[var(--accent)]" />
        </div>
        <p className="mt-4 shimmer-text font-semibold text-[0.9rem]">Neural brain ko wake kar rahe hain…</p>
        <p className="text-[0.7rem] dim mt-1">demo market feeds connect ho rahe hain</p>
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
    <div className="h-screen flex gap-3 p-3 overflow-hidden">
      <BehaviorProbe />

      {/* Left navigation rail */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <MobileNav />
        <TickerBar />

        <main className="flex-1 overflow-y-auto pr-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {view === 'home' && <HomeView />}
              {view === 'scanner' && <ScannerView />}
              {view === 'lab' && <LabView />}
              {view === 'backtest' && <BacktestView />}
              {view === 'autopsy' && <AutopsyView />}
              {view === 'risk' && <RiskView />}
              {view === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </main>

        <StatusBar />
      </div>

      {/* Global overlays */}
      <ToastStack />
      <RiskLockdownBanner />
      <ZenOverlay />
    </div>
  );
}
