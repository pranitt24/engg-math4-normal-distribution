/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neonPurple: '#a855f7',
        darkBg: '#121212',
        cardBg: '#1e1e1e'
      }
    },
  },
  plugins: [],
}