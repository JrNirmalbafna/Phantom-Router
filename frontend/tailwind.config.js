/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:        '#060B12',
        surface:   'rgba(255,255,255,0.028)',
        'tx-1':    '#E2E8F0',
        'tx-2':    '#64748B',
        'tx-3':    '#334155',
        'c-teal':  '#38BDF8',
        'c-violet':'#8B5CF6',
        'c-green': '#22C55E',
        'c-amber': '#F59E0B',
        'c-red':   '#F87171',
        'c-blue':  '#60A5FA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
