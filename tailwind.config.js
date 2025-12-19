/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--font-sans)', 'sans-serif'],
        'serif': ['var(--font-serif)', 'serif'],
        'mono': ['var(--font-mono)', 'monospace'],
        'brand': ['var(--font-serif)', 'serif'],
      },
      colors: {
        'arpet': {
          'bg': '#FAFAF9',
          'sidebar': '#F5F5F4',
          'profile': '#9B2C2C',
        },
        'dark': {
          'bg': '#0f172a',
          'surface': '#1e293b',
          'elevated': '#334155',
          'border': '#475569',
          'text': '#e2e8f0',
          'muted': '#94a3b8',
          'input': '#1e293b',
        }
      },
      animation: {
        'slide-down-fade': 'slideDownFade 0.4s ease-out forwards',
        'physics-sway': 'physicsSway 4s ease-in-out infinite',
      },
      keyframes: {
        slideDownFade: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        physicsSway: {
          '0%': { transform: 'rotate(1.5deg)' },
          '50%': { transform: 'rotate(-1.5deg)' },
          '100%': { transform: 'rotate(1.5deg)' },
        }
      }
    },
  },
  plugins: [],
}
