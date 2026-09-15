import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#101112',
          900: '#17181a',
          800: '#1f2124',
          700: '#2a2d31',
          600: '#383c41',
          500: '#4a4f55',
          400: '#6d737b',
        },
        beige: {
          50: '#f7f2e9',
          100: '#eee4d3',
          200: '#dfcfb5',
          300: '#c9b79b',
          400: '#a9987e',
        },
        ochre: {
          300: '#e6b866',
          400: '#d8a03e',
          500: '#c38726',
          600: '#9d6b1a',
        },
        danger: '#ef8a74',
        // Messenger brand greens, muted to sit calmly on graphite.
        brand: {
          whatsapp: '#7db89a',
          line: '#74b386',
        },
      },
      fontFamily: {
        // Thai glyphs are missing from Oswald and Inter: the browser falls back to Noto Sans Thai per character.
        display: ['var(--font-display)', 'var(--font-thai)', 'Impact', 'sans-serif'],
        sans: ['var(--font-body)', 'var(--font-thai)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
