/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#00ff88',
        'neon-blue': '#00d2ff',
        'neon-amber': '#ffaa00',
        'neon-red': '#ff3131',
      }
    },
  },
  plugins: [],
}
