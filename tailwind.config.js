/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07110c",
        panel: "#0f1c15",
        line: "rgba(255,255,255,0.11)",
        spotify: "#1db954"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(29, 185, 84, 0.18)"
      }
    }
  },
  plugins: []
};
