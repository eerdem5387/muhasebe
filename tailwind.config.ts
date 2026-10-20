import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bcd9ff",
          300: "#8ec0ff",
          400: "#599dff",
          500: "#3379f6",
          600: "#1f5ce0",
          700: "#1a48c4",
          800: "#1b3d9e",
          900: "#1c367c",
          950: "#15224b",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#b0b9c9",
          400: "#8491a8",
          500: "#65748d",
          600: "#505c73",
          700: "#414b5e",
          800: "#39404f",
          900: "#323846",
          950: "#21252e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(21, 34, 75, 0.04), 0 8px 24px rgba(21, 34, 75, 0.06)",
        lift: "0 4px 6px rgba(21, 34, 75, 0.04), 0 12px 32px rgba(21, 34, 75, 0.08)",
      },
      backgroundImage: {
        "app-mesh":
          "radial-gradient(ellipse 80% 50% at 0% -20%, rgba(51, 121, 246, 0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(21, 34, 75, 0.06), transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
