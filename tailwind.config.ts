import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        alpine: {
          50: "#f6f7f4",
          100: "#e8eae3",
          200: "#d4d8ca",
          300: "#b5bca6",
          400: "#95a07e",
          500: "#788563",
          600: "#5e6a4d",
          700: "#4a543e",
          800: "#3d4535",
          900: "#353b2f",
        },
        wood: {
          50: "#fdf8f1",
          100: "#f5e6d0",
          200: "#ebd0a8",
          300: "#ddb87c",
          400: "#d0a05a",
          500: "#b8863e",
          600: "#9a6c32",
          700: "#7d562a",
          800: "#644524",
          900: "#503820",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
