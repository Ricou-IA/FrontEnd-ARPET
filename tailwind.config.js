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
          'bg': '#fafaf9',      // Stone-50 (Was pure white/gray mix)
          'sidebar': '#f5f5f4', // Stone-100
          'accent': '#9B2C2C',  // Original Red/Brown
          'accent-light': '#B91C1C',
        },
        'dark': {
          'bg': '#0c0a09',      // Stone-950 (Warmer dark)
          'surface': '#1c1917', // Stone-900
          'elevated': '#292524', // Stone-800
          'border': '#44403c',  // Stone-700
          'text': '#f5f5f4',    // Stone-100
          'muted': '#a8a29e',   // Stone-400
          'input': '#1c1917',
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
