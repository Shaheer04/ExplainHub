/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'github-dark': {
          'bg': '#0d1117',
          'bg-secondary': '#161b22',
          'bg-tertiary': '#21262d',
          'border': '#30363d',
          'text': '#c9d1d9',
          'text-secondary': '#8b949e',
          'accent': '#58a6ff',
          'accent-hover': '#1f6feb',
        },
      },
    },
  },
  plugins: [],
}