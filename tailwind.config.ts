import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
      },
      colors: {
        base:    "#060d1a",
        panel:   "#0d1f35",
        sidebar: "#05090f",
        input:   "#0f2440",
        accent:  "#00d4ff",
        accent2: "#38bdf8",
        accent3: "#0ea5e9",
        "accent-dim": "rgba(0,212,255,0.1)",
        primary:   "#e2f0ff",
        secondary: "#7a9ab8",
        muted:     "#3a5570",
        silver:    "#94a3b8",
        online:    "#22c55e",
      },
      boxShadow: {
        accent:      "0 4px 20px rgba(0,212,255,0.3)",
        "accent-lg": "0 8px 40px rgba(0,212,255,0.4)",
        glass:       "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(0,212,255,0.06)",
        panel:       "0 20px 60px rgba(0,0,0,0.6)",
        claw:        "0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
