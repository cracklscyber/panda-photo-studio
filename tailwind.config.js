/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        panda: {
          light: '#f5f5f5',
          dark: '#1a1a1a',
          accent: '#4ade80',
        },
      },
    },
  },
  plugins: [],
}
