/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soil: "#2B2318",
        soil2: "#3D3324",
        biogas: "#4C7A50",
        biogasDeep: "#345838",
        harvest: "#C69214",
        parchment: "#F1EBDA",
        parchment2: "#E7DFC8",
        ash: "#726A57",
        clayLine: "#D8CDAE",
        danger: "#A34432",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Work Sans", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
