/** @type {import('tailwindcss').Config} */

// Colors are CSS variables (space-separated RGB) defined in src/globals.css for
// light and dark themes, so opacity modifiers like `bg-primary/10` keep working.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

const TOKENS = [
  'surface',
  'surface-base',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'border-hairline',
  'outline-variant',
  'on-surface',
  'on-surface-variant',
  'primary',
  'on-primary',
  'secondary',
  'cool-blue',
  'status-success',
  'status-warning',
  'status-error',
]

const colors = Object.fromEntries(TOKENS.map((t) => [t, v(t)]))
// Aliases kept so existing class names keep resolving.
colors['sage-accent'] = v('primary')
colors.error = v('status-error')
colors.background = v('surface')

export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors,
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '0.875rem',
        full: '9999px',
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        gutter: '1.25rem',
        margin: '2rem',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        'body-md': ['var(--font-sans)', 'system-ui', 'sans-serif'],
        'headline-sm': ['var(--font-sans)', 'system-ui', 'sans-serif'],
        'headline-md': ['var(--font-sans)', 'system-ui', 'sans-serif'],
        'headline-lg': ['var(--font-sans)', 'system-ui', 'sans-serif'],
        'label-md': ['var(--font-sans)', 'system-ui', 'sans-serif'],
        'label-sm': ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-sm': ['16px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '26px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-lg': ['24px', { lineHeight: '30px', letterSpacing: '-0.022em', fontWeight: '600' }],
        'headline-xl': ['32px', { lineHeight: '38px', letterSpacing: '-0.028em', fontWeight: '600' }],
      },
      boxShadow: {
        card: '0 1px 0 rgb(0 0 0 / 0.02)',
        pop: '0 16px 40px -12px rgb(0 0 0 / 0.35), 0 2px 8px rgb(0 0 0 / 0.12)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
