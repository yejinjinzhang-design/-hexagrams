import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        "ink-dark": "#050816",
        "ink-muted": "#1a1b26",
        "ink-accent": "#e0b36b",
        "ink-accent-soft": "#f4e3c3"
      },
      boxShadow: {
        "soft-glow": "0 0 30px rgba(224, 179, 107, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;

