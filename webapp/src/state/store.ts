import { create } from 'zustand';
import { brain, type BrainSnapshot } from '../engine/brain';
import type { AppMode } from '../engine/types';
import { FOCUS_SYMBOLS } from '../engine/instruments';

export type ViewKey =
  | 'home'
  | 'scanner'
  | 'lab'
  | 'backtest'
  | 'autopsy'
  | 'risk'
  | 'settings';
export type FontScale = 'sm' | 'md' | 'lg';
export type ScannerCategory = 'crypto' | 'indices' | 'fno';
export type BacktestTab = 'hypothesis' | 'flash';
export type AutopsyTab = 'postmortem' | 'learning';
export type MiriMode = 'text' | 'voice';

interface UIState {
  snapshot: BrainSnapshot | null;
  ready: boolean;
  view: ViewKey;
  fontScale: FontScale;
  bellOpen: boolean;
  beginnerMode: boolean;
  modeMenuOpen: boolean;
  timeframe: string;
  // ── Clickable-flow state ──────────────────────────────────────────────
  scannerCategory: ScannerCategory;
  focusHistory: string[];
  selectedPodId: string | null;
  backtestTab: BacktestTab;
  hypothesisQuery: string;
  autopsyTab: AutopsyTab;
  selectedPostMortemId: string | null;
  miriOpen: boolean;
  miriMode: MiriMode;
  // ── Actions ───────────────────────────────────────────────────────────
  setView: (v: ViewKey) => void;
  setFontScale: (f: FontScale) => void;
  toggleBell: (open?: boolean) => void;
  setBeginnerMode: (v: boolean) => void;
  setModeMenuOpen: (v: boolean) => void;
  setTimeframe: (t: string) => void;
  setMode: (m: AppMode) => void;
  setScannerCategory: (c: ScannerCategory) => void;
  selectFocus: (symbol: string) => void;
  openChart: (symbol: string, timeframe?: string) => void;
  setSelectedPodId: (id: string | null) => void;
  setBacktestTab: (t: BacktestTab) => void;
  setHypothesisQuery: (q: string) => void;
  setAutopsyTab: (t: AutopsyTab) => void;
  setSelectedPostMortemId: (id: string | null) => void;
  setMiriOpen: (open: boolean) => void;
  setMiriMode: (m: MiriMode) => void;
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
  scannerCategory: 'indices',
  focusHistory: [...FOCUS_SYMBOLS],
  selectedPodId: null,
  backtestTab: 'flash',
  hypothesisQuery: '',
  autopsyTab: 'postmortem',
  selectedPostMortemId: null,
  miriOpen: false,
  miriMode: 'text',

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
  setScannerCategory: (c) => set({ scannerCategory: c }),
  selectFocus: (symbol) => {
    brain.setFocus(symbol);
    set((s) => ({
      focusHistory: s.focusHistory.includes(symbol)
        ? s.focusHistory
        : [...s.focusHistory, symbol].slice(-8),
    }));
  },
  openChart: (symbol, timeframe) => {
    brain.setFocus(symbol);
    set((s) => ({
      focusHistory: s.focusHistory.includes(symbol)
        ? s.focusHistory
        : [...s.focusHistory, symbol].slice(-8),
      timeframe: timeframe ?? s.timeframe,
      view: 'home',
      selectedPodId: null,
    }));
  },
  setSelectedPodId: (id) => set({ selectedPodId: id }),
  setBacktestTab: (t) => set({ backtestTab: t }),
  setHypothesisQuery: (q) => set({ hypothesisQuery: q }),
  setAutopsyTab: (t) => set({ autopsyTab: t }),
  setSelectedPostMortemId: (id) => set({ selectedPostMortemId: id }),
  setMiriOpen: (open) => set({ miriOpen: open }),
  setMiriMode: (m) => set({ miriMode: m }),
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
