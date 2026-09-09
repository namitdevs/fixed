/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#090d16',
        },
        intel: {
          blue: '#2563eb',
          amber: '#d97706',
          emerald: '#059669',
          red: '#dc2626',
          purple: '#9333ea',
        }
      }
    },
  },
  plugins: [],
}
