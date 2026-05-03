import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["Georgia", "serif"],
      },
      colors: {
        deepwater: "#0b3954",
        riverbed: "#1d3b53",
        reed: "#3a5a40",
        sand: "#e3c16f",
        gold: "#d4a24c",
      },
      animation: {
        "float-slow": "float 6s ease-in-out infinite",
        "ripple": "ripple 2s ease-out infinite",
        "tug": "tug 0.4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        ripple: {
          "0%": { transform: "scale(0.4)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        tug: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
