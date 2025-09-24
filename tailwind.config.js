/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'media', // This enables dark mode based on system preference
  theme: {
    extend: {
      // You can extend the theme here if needed
    },
  },
  plugins: [],
} 