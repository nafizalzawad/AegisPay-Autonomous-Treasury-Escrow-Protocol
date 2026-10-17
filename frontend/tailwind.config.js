/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aegis: {
          950: "#090d16",
          900: "#0f172a",
          850: "#131d35",
          800: "#1e293b",
          700: "#334155",
          accent: "#06b6d4",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#f43f5e",
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
