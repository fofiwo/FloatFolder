/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mac: {
          bg: 'var(--mac-bg)',
          surface: 'var(--mac-surface)',
          elevated: 'var(--mac-elevated)',
          hover: 'var(--mac-hover)',
          border: 'var(--mac-border)',
          'border-strong': 'var(--mac-border-strong)',
          accent: 'var(--mac-accent)',
          'accent-hover': 'var(--mac-accent-hover)',
          red: 'var(--mac-red)',
          yellow: 'var(--mac-yellow)',
          green: 'var(--mac-green)',
          text: 'var(--mac-text)',
          'text-secondary': 'var(--mac-text-secondary)',
          'text-tertiary': 'var(--mac-text-tertiary)',
          /** 主题感知的半透明叠加色 */
          'overlay': 'var(--mac-overlay)',
          'overlay-strong': 'var(--mac-overlay-strong)',
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
