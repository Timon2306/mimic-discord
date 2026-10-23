import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0d0e12',
        foreground: '#e2e8f0',
        surface: {
          50: '#262836',
          100: '#1d1f2b',
          200: '#151620',
          300: '#101118',
        },
        border: 'rgba(255, 255, 255, 0.07)',
        discord: {
          DEFAULT: '#5865F2',
          hover: '#4752c4',
          light: '#7983f5',
          green: '#57f287',
          yellow: '#fee75c',
          fuchsia: '#eb459e',
          red: '#ed4245',
        },
        accent: {
          blue: '#6366f1',
          slate: '#94a3b8',
          soft: '#38bdf8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
