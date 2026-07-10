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
        // Monochrome, fully opaque surfaces — no glass/transparency.
        bg: {
          DEFAULT: "#09090b",
          soft: "#0d0d0f",
          raise: "#18181b",
        },
        panel: {
          DEFAULT: "#131316",
          border: "#27272a",
        },
        // "brand" now reads as neutral light gray so existing utility classes
        // stay monochrome.
        brand: {
          DEFAULT: "#a1a1aa",
          soft: "#e4e4e7",
          glow: "#3f3f46",
        },
        accent: {
          teal: "#d4d4d8",
          violet: "#a1a1aa",
          amber: "#fafafa",
          pink: "#c4c4c7",
        },
        good: "#e4e4e7",
        bad: "#a1a1aa",
        muted: "#a1a1aa",
        faint: "#6b6b73",
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
