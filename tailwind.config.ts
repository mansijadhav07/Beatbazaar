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
        ink: {
          DEFAULT: "var(--ink)",
          dark: "var(--ink-dark)",
          light: "var(--ink-light)",
        },
        steel: {
          DEFAULT: "var(--steel)",
          dark: "var(--steel-dark)",
          light: "var(--steel-light)",
        },
        brass: {
          DEFAULT: "var(--brass)",
          dark: "var(--brass-dark)",
          light: "var(--brass-light)",
        },
        mist: {
          DEFAULT: "var(--mist)",
          light: "var(--mist-light)",
          dark: "var(--mist-dark)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
          subtle: "var(--surface-subtle)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        status: {
          success: "var(--status-success)",
          "success-bg": "var(--status-success-bg)",
          warning: "var(--status-warning)",
          "warning-bg": "var(--status-warning-bg)",
          danger: "var(--status-danger)",
          "danger-bg": "var(--status-danger-bg)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      spacing: {
        4.5: "1.125rem",
        11: "2.75rem", // 44px touch target
      },
      maxWidth: {
        container: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;

