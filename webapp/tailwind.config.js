/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        void: {
          950: '#05070d',
          900: '#080b14',
          850: '#0b1020',
          800: '#0f1626',
          700: '#16203a',
          600: '#1e2c4d',
        },
        neon: {
          cyan: '#38e8ff',
          blue: '#4d7dff',
          green: '#2dffb0',
          lime: '#a6ff3d',
          yellow: '#ffd84d',
          amber: '#ffae3b',
          red: '#ff5470',
          violet: '#9d6bff',
          purple: '#c06bff',
          steel: '#6fb3ff',
        },
      },
      boxShadow: {
        glow: '0 0 24px rgba(56,232,255,0.25)',
        'glow-green': '0 0 28px rgba(45,255,176,0.35)',
        'glow-red': '0 0 28px rgba(255,84,112,0.4)',
        'glow-violet': '0 0 28px rgba(157,107,255,0.4)',
        glass: '0 8px 40px rgba(2,6,18,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 14s linear infinite',
        shimmer: 'shimmer 2.6s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
