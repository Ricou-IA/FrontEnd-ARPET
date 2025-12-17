/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',  // ✅ AJOUTÉ POUR LE DARK MODE
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'brand': ['Bodoni Moda', 'serif'],
        'serif': ['Instrument Serif', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      colors: {
        'arpet': {
          'bg': '#FAFAF9',
          'sidebar': '#F5F5F4',
          'profile': '#9B2C2C',
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
