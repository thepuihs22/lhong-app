import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#456143",
          50: "#f0f4f0",
          100: "#d9e4d9",
          200: "#b3c9b3",
          300: "#8dae8d",
          400: "#679367",
          500: "#456143",
          600: "#374e35",
          700: "#293b28",
          800: "#1c281b",
          900: "#0e150e",
        },
        secondary: {
          DEFAULT: "#F38121",
          50: "#fef5ed",
          100: "#fde8d3",
          200: "#fbd0a7",
          300: "#f9b77a",
          400: "#f79f4e",
          500: "#F38121",
          600: "#c2671a",
          700: "#914d14",
          800: "#61340d",
          900: "#301a07",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
