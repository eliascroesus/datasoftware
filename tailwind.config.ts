import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#070b1a",
          soft: "#0b1226",
          raise: "#111a35",
        },
        panel: {
          DEFAULT: "rgba(19,28,56,0.72)",
          border: "rgba(120,140,200,0.14)",
        },
        brand: {
          DEFAULT: "#3d7dff",
          soft: "#6ea8ff",
          glow: "#4f8bff",
        },
        accent: {
          teal: "#2dd4bf",
          violet: "#8b7cff",
          amber: "#fbbf24",
          pink: "#f472b6",
        },
        good: "#34d399",
        bad: "#fb7185",
        muted: "#8a97c2",
        faint: "#5a6892",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 40px -24px rgba(0,0,0,0.8)",
        glow: "0 0 0 1px rgba(77,139,255,0.35), 0 8px 30px -8px rgba(77,139,255,0.35)",
      },
      backgroundImage: {
        "grid-faint":
          "radial-gradient(circle at 1px 1px, rgba(140,160,220,0.08) 1px, transparent 0)",
      },
      borderRadius: {
        xl2: "1.15rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
