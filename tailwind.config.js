/** @type {import('tailwindcss').Config} */
module.exports = {
  // CORRECTED: Add paths to all files containing Tailwind classes
  content: [
    // Include the root HTML file
    "./index.html",
    // Include all TypeScript/JavaScript/React files in the src/ directory and its subdirectories
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include all files in the stories/ directory and its subdirectories
    "./stories/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}