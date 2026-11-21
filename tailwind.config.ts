import type { Config } from 'tailwindcss';

// Colour tokens sampled from the Sirion reference screenshots (BUILD_SPEC §4A).
const config: Config = {
  // Preflight is scoped so it cannot reach the Fluent-rendered Microsoft mocks.
  corePlugins: { preflight: false },
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './content/**/*.md',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          900: '#0C5E69',
          700: '#0F6671',
          title: '#1E5A57',
        },
        periwinkle: '#828BFC',
        mint: '#B1D0CA',
        indigo: '#4364B2',
        lime: '#E0E767',
        amber: {
          fg: '#B45309',
          bg: '#FEF3C7',
        },
        page: '#F6F6F6',
        card: '#FFFFFF',
        line: '#E6EBEB',
        ink: '#1F2A2E',
        muted: '#7D9093',
        danger: '#C2410C',
        // Walkthrough guide only: never used for product states (green = agreed, teal = Sirion, blue = Microsoft).
        guide: {
          50: '#EEF2FF',
          200: '#C7D2FE',
          600: '#4F46E5',
          700: '#4338CA',
        },
        outlook: '#0F6CBD',
        word: '#185ABD',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 42, 46, 0.04), 0 1px 3px rgba(31, 42, 46, 0.03)',
        drawer: '-8px 0 24px rgba(31, 42, 46, 0.08)',
        pop: '0 4px 16px rgba(31, 42, 46, 0.12)',
      },
      fontSize: {
        kpi: ['56px', { lineHeight: '1.05', fontWeight: '300' }],
      },
    },
  },
  plugins: [],
};

export default config;
