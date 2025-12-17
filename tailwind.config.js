/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // ✅ Activation du dark mode
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
        },
        // Couleurs Dark Mode
        'dark': {
          'bg': '#0f172a',        // Fond principal (slate-900)
          'surface': '#1e293b',   // Fond cartes/sidebar (slate-800)
          'elevated': '#334155',  // Fond élevé (slate-700)
          'border': '#475569',    // Bordures (slate-600)
          'text': '#e2e8f0',      // Texte principal (slate-200)
          'muted': '#94a3b8',     // Texte secondaire (slate-400)
          'input': '#1e293b',     // Fond input (slate-800)
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
