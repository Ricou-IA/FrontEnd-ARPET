/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Instrument Serif', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      colors: {
        // Palette "Zen" personnalisée
        'arpet': {
          'bg': '#FAFAF9',
          'sidebar': '#F5F5F4',
          'profile': '#9B2C2C',
        }
      },
      animation: {
        'slide-down-fade': 'slideDownFade 0.4s ease-out forwards',
      },
      keyframes: {
        slideDownFade: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
