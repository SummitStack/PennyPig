export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#10b981',
        'secondary': '#10b981',
        'surface': '#0d131f',
        'surface-base': '#161c28',
        'surface-container': '#1a202c',
        'surface-container-high': '#242a37',
        'on-surface': '#f8fafc',
        'on-surface-variant': '#94a3b8',
        'status-success': '#4ade80',
        'status-warning': '#fbbf24',
        'status-error': '#ef4444',
        'border-hairline': '#283245'
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'gutter': '1.5rem'
      },
      fontSize: {
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'headline-sm': ['18px', { lineHeight: '24px', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }]
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        'DEFAULT': '0.125rem',
        'lg': '0.25rem',
        'xl': '0.5rem',
        'full': '0.75rem'
      }
    }
  },
  plugins: []
}
