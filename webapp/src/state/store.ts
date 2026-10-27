import { create } from 'zustand';
import { brain, type BrainSnapshot } from '../engine/brain';
import type { AppMode } from '../engine/types';

export type ViewKey = 'command' | 'timemachine' | 'hatchery' | 'learning' | 'deck';
export type FontScale = 'sm' | 'md' | 'lg';

interface UIState {
  snapshot: BrainSnapshot | null;
  ready: boolean;
  view: ViewKey;
  fontScale: FontScale;
  bellOpen: boolean;
  chatOpen: boolean;
  panicArmed: boolean;
  chartLayer: 'normal' | 'wormhole' | 'montecarlo';
  setView: (v: ViewKey) => void;
  setFontScale: (f: FontScale) => void;
  toggleBell: (open?: boolean) => void;
  toggleChat: (open?: boolean) => void;
  setPanicArmed: (v: boolean) => void;
  setChartLayer: (l: UIState['chartLayer']) => void;
  setMode: (m: AppMode) => void;
}

export const useStore = create<UIState>((set, get) => ({
  snapshot: null,
  ready: false,
  view: 'command',
  fontScale: 'md',
  bellOpen: false,
  chatOpen: false,
  panicArmed: false,
  chartLayer: 'normal',

  setView: (v) => set({ view: v }),
  setFontScale: (f) => {
    document.documentElement.dataset.fontScale = f;
    set({ fontScale: f });
  },
  toggleBell: (open) => set((s) => ({ bellOpen: open ?? !s.bellOpen })),
  toggleChat: (open) => set((s) => ({ chatOpen: open ?? !s.chatOpen })),
  setPanicArmed: (v) => set({ panicArmed: v }),
  setChartLayer: (l) => set({ chartLayer: l }),
  setMode: (m) => {
    brain.setMode(m);
    if (m === 'timemachine') set({ view: 'timemachine', chartLayer: 'normal' });
  },
}));

// Push brain commits into React at the brain's throttled frame rate.
brain.on('commit', (snapshot) => {
  useStore.setState({ snapshot, ready: true });
});

// Reflect the brain's theme token on <html> for the CSS variable system.
brain.on('theme', (theme) => {
  document.documentElement.dataset.theme = theme.token;
});

// Keep theme attribute in sync on every commit (theme decays inside the brain).
brain.on('commit', (snapshot) => {
  if (document.documentElement.dataset.theme !== snapshot.theme.token) {
    document.documentElement.dataset.theme = snapshot.theme.token;
  }
});

export function useBrain() {
  return brain;
}

export { brain };
