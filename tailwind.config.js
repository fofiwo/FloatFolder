/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mac: {
          bg: '#1e1e1e',
          surface: '#2a2a2c',
          elevated: '#323234',
          hover: '#3a3a3c',
          border: 'rgba(255,255,255,0.08)',
          'border-strong': 'rgba(255,255,255,0.14)',
          accent: '#0a84ff',
          'accent-hover': '#409cff',
          red: '#ff453a',
          yellow: '#ffd60a',
          green: '#32d74b',
          text: 'rgba(255,255,255,0.88)',
          'text-secondary': 'rgba(255,255,255,0.55)',
          'text-tertiary': 'rgba(255,255,255,0.3)',
        }
      },
      borderRadius: {
        'mac': '10px',
        'mac-lg': '14px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
