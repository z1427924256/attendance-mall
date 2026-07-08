/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: "#00b578",
        "primary-dark": "#009a66",
        "primary-light": "#e6f9f0",
        warning: "#ff9500",
        "warning-light": "#fff7e6",
        ink: "#1a1a1a",
        muted: "#666666",
        base: "#f5f5f5",
        card: "#ffffff",
      },
      borderRadius: {
        card: "16px",
      },
      spacing: {
        gutter: "16px",
      },
      fontSize: {
        merchant: "22px",
      },
      width: {
        checkin: "170px",
      },
      height: {
        checkin: "170px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Segoe UI",
          "Noto Sans",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
