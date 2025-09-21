/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-yellow': '#F3C23A',
        'custom-green': '#DBF0C5',
      },
    },
  },
  plugins: [],
}
