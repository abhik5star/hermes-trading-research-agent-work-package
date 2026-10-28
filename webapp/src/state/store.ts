import { create } from 'zustand';
import { brain, type BrainSnapshot } from '../engine/brain';
import type { AppMode } from '../engine/types';

export type ViewKey =
  | 'home'
  | 'scanner'
  | 'lab'
  | 'backtest'
  | 'autopsy'
  | 'risk'
  | 'settings';
export type FontScale = 'sm' | 'md' | 'lg';

interface UIState {
  snapshot: BrainSnapshot | null;
  ready: boolean;
  view: ViewKey;
  fontScale: FontScale;
  bellOpen: boolean;
  beginnerMode: boolean;
  modeMenuOpen: boolean;
  timeframe: string;
  setView: (v: ViewKey) => void;
  setFontScale: (f: FontScale) => void;
  toggleBell: (open?: boolean) => void;
  setBeginnerMode: (v: boolean) => void;
  setModeMenuOpen: (v: boolean) => void;
  setTimeframe: (t: string) => void;
  setMode: (m: AppMode) => void;
}

export const useStore = create<UIState>((set) => ({
  snapshot: null,
  ready: false,
  view: 'home',
  fontScale: 'md',
  bellOpen: false,
  beginnerMode: true,
  modeMenuOpen: false,
  timeframe: '5m',

  setView: (v) => set({ view: v }),
  setFontScale: (f) => {
    document.documentElement.dataset.fontScale = f;
    set({ fontScale: f });
  },
  toggleBell: (open) => set((s) => ({ bellOpen: open ?? !s.bellOpen })),
  setBeginnerMode: (v) => set({ beginnerMode: v }),
  setModeMenuOpen: (v) => set({ modeMenuOpen: v }),
  setTimeframe: (t) => set({ timeframe: t }),
  setMode: (m) => brain.setMode(m),
}));

brain.on('commit', (snapshot) => {
  useStore.setState({ snapshot, ready: true });
});

brain.on('theme', (theme) => {
  document.documentElement.dataset.theme = theme.token;
});

brain.on('commit', (snapshot) => {
  if (document.documentElement.dataset.theme !== snapshot.theme.token) {
    document.documentElement.dataset.theme = snapshot.theme.token;
  }
});

export function useBrain() {
  return brain;
}

export { brain };
