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
export type LabTab = 'lab' | 'registry';
export type ThemeToken = 'cinematic' | 'deep-focus' | 'zen' | 'violet' | 'amber' | 'whale-green' | 'whale-red';

export interface ThemeOption {
  token: ThemeToken;
  label: string;
  blurb: string;
  swatch: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  { token: 'cinematic', label: 'Navy (default)', blurb: 'Professional flat dark-navy trading desk', swatch: ['#0d1528', '#3aa8e8', '#1db886'] },
  { token: 'deep-focus', label: 'Deep Focus Grey', blurb: 'Low-glare calm mode for long sessions', swatch: ['#10141e', '#7d9cc9', '#5f7fd0'] },
  { token: 'zen', label: 'Zen Indigo', blurb: 'Cool indigo for relaxed monitoring', swatch: ['#141d3d', '#8f7fe0', '#5f7fd0'] },
  { token: 'violet', label: 'Violet', blurb: 'Violet bias for sideways regimes', swatch: ['#181539', '#9a8ce8', '#1db886'] },
  { token: 'amber', label: 'Amber', blurb: 'Warm amber for cautious sessions', swatch: ['#201a10', '#e0a52f', '#e5536b'] },
  { token: 'whale-green', label: 'Whale Green', blurb: 'Bullish bias', swatch: ['#0e1d17', '#1db886', '#3aa8e8'] },
  { token: 'whale-red', label: 'Whale Red', blurb: 'Bearish bias', swatch: ['#26141c', '#e5536b', '#e0a52f'] },
];
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
  labTab: LabTab;
  themeToken: ThemeToken;
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
  setLabTab: (t: LabTab) => void;
  setThemeToken: (t: ThemeToken) => void;
  setMiriOpen: (open: boolean) => void;
  setMiriMode: (m: MiriMode) => void;
  activateStrategy: (id: string) => void;
  backtestStrategy: (id: string) => Promise<void>;
}

function applyStoredTheme(): void {
  try {
    const raw = localStorage.getItem('hermes-theme') as ThemeToken | null;
    if (raw && THEME_OPTIONS.some((o) => o.token === raw)) {
      document.documentElement.dataset.theme = raw;
      return;
    }
  } catch { /* noop */ }
  document.documentElement.dataset.theme = 'cinematic';
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
  labTab: 'lab',
  themeToken: readStoredTheme(),
  miriOpen: false,
  miriMode: 'text',

  setView: (v) => set({ view: v }),
  setFontScale: (f) => {
    document.documentElement.dataset.fontScale = f;
    set({ fontScale: f });
  },
  toggleBell: (open) => set((s) => {
    const next = open ?? !s.bellOpen;
    // The bell panel and the Miri panel share the same corner — only one can
    // be open at a time so they never overlap.
    return next ? { bellOpen: true, miriOpen: false } : { bellOpen: false };
  }),
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
  setLabTab: (t) => set({ labTab: t }),
  setThemeToken: (t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch { /* noop */ }
    set({ themeToken: t });
  },
  setMiriOpen: (open) => set((s) => (open ? { miriOpen: true, bellOpen: false } : { miriOpen: false })),
  setMiriMode: (m) => set({ miriMode: m }),
  activateStrategy: (id) => brain.activateStrategy(id),
  backtestStrategy: async (id) => {
    await brain.backtestStrategy(id);
  },
}));

brain.on('commit', (snapshot) => {
  useStore.setState({ snapshot, ready: true });
});

// The dashboard colour is a MANUAL setting now — the brain's mood events used
// to repaint the whole theme on every whale/gamma/panic event, which was
// distracting. The mood still shows up on the Miri mascot badge.
const THEME_KEY = 'hermes-theme';

function readStoredTheme(): ThemeToken {
  try {
    const raw = localStorage.getItem(THEME_KEY) as ThemeToken | null;
    if (raw && THEME_OPTIONS.some((o) => o.token === raw)) return raw;
  } catch { /* noop */ }
  return 'cinematic';
}

applyStoredTheme();

export function useBrain() {
  return brain;
}

export { brain };
