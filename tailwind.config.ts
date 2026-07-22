import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#3e3540",
        pink: "#eb6e98",
        lavender: "#aa91cf",
        mint: "#82c9ad",
        sky: "#81bfe2",
        cream: "#fff5d9",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-jp)", "sans-serif"],
        display: ["var(--font-fredoka)", "var(--font-noto-sans-jp)", "sans-serif"],
      },
      boxShadow: {
        card: "0 16px 42px rgba(98, 66, 88, 0.08)",
        soft: "0 8px 24px rgba(98, 66, 88, 0.07)",
      },
      backgroundImage: {
        dots: "radial-gradient(rgba(235,110,152,0.18) 1.5px, transparent 1.5px)",
      },
    },
  },
  plugins: [],
};

export default config;
