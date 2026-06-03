import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)"
        },
        edge: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)"
        },
        status: {
          healthy: "var(--status-healthy)",
          warning: "var(--status-warning)",
          critical: "var(--status-critical)",
          offline: "var(--status-offline)",
          activity: "var(--status-activity)",
          metric: "var(--status-metric)"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"]
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }]
      },
      spacing: {
        18: "4.5rem"
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out"
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" }
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
