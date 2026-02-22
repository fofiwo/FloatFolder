/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'glass': {
          'bg': 'rgba(30, 30, 40, 0.85)',
          'border': 'rgba(255, 255, 255, 0.1)',
          'hover': 'rgba(255, 255, 255, 0.05)',
          'active': 'rgba(255, 255, 255, 0.08)',
        }
      },
      backdropBlur: {
        'glass': '20px'
      }
    },
  },
  plugins: [],
}
