import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#070706",
        ink: "#0c0c0b",
        metal: "#6a6e72",
        steel: "#8a8e92",
        paper: "#e8e4dc",
        mute: "#7a766c",
        amber: "#c4a46a",
        rust: "#8a5a3a",
      },
      fontFamily: {
        mono: ["var(--font-ibm)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        mark: "0.42em",
        wide2: "0.28em",
      },
    },
  },
  plugins: [],
};

export default config;
