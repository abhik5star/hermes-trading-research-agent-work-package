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
        // Flat professional dark-navy series (legacy class names kept stable)
        void: {
          950: '#0a1020',
          900: '#0d1528',
          850: '#111c36',
          800: '#121d38',
          700: '#172444',
          600: '#1e2f55',
        },
        neon: {
          cyan: '#3aa8e8',
          blue: '#5b8def',
          green: '#1db886',
          lime: '#7bc96f',
          yellow: '#d8bd55',
          amber: '#e0a52f',
          red: '#e5536b',
          violet: '#8f7fe0',
          purple: '#a78bfa',
          steel: '#7aa7d9',
        },
      },
      boxShadow: {
        // restrained, neutral shadows only
        glow: '0 2px 10px rgba(3,7,18,0.25)',
        'glow-green': '0 2px 10px rgba(3,7,18,0.25)',
        'glow-red': '0 2px 10px rgba(3,7,18,0.25)',
        'glow-violet': '0 2px 10px rgba(3,7,18,0.25)',
        glass: '0 2px 10px rgba(3,7,18,0.25)',
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
