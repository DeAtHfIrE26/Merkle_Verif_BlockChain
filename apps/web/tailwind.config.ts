import type { Config } from 'tailwindcss';

/**
 * Design tokens.
 *
 * Semantic colour is load-bearing in this app: emerald means a proof or
 * signature verified, rose means it did not. The brand accent is therefore
 * deliberately neither — it is violet, so an interactive element can never be
 * mistaken for a verification result.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0B0D', // page
          900: '#101216', // raised surface
          850: '#15181E', // card
          800: '#1C2028', // hover
          700: '#262B35', // border
          600: '#363D4A', // strong border
          500: '#5A6274', // muted icon
          400: '#8891A3', // muted text
          300: '#B6BDCA', // secondary text
          200: '#D9DEE7',
          100: '#F0F3F8', // primary text
        },
        brand: {
          muted: '#2A2450',
          border: '#4A3FA8',
          DEFAULT: '#7C6BF5',
          bright: '#9E92FF',
          text: '#C4BCFF',
        },
        valid: {
          muted: '#0C2A22',
          border: '#1A6B53',
          DEFAULT: '#2DD4A7',
          text: '#7DEBCB',
        },
        invalid: {
          muted: '#2E1218',
          border: '#9B2C43',
          DEFAULT: '#F4527A',
          text: '#FFA3B8',
        },
        warn: {
          muted: '#2C2310',
          border: '#8A6A1F',
          DEFAULT: '#E5B34A',
          text: '#F5D89A',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Modular scale, ratio ~1.25, with line-heights tuned per step.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.625rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.375rem', { lineHeight: '1.875rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
        '3xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
        '4xl': ['3rem', { lineHeight: '3.25rem', letterSpacing: '-0.03em' }],
        '5xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.035em' }],
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem' },
      maxWidth: { content: '76rem' },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-up': 'fade-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
