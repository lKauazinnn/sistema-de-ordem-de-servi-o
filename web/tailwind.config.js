/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d8eaff",
          500: "#0567f5",
          700: "#0049b0",
          900: "#002459"
        }
      }
    }
  },
  plugins: []
};
