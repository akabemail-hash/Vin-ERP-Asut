
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}", // Scans all files in current directory and subdirectories
    "!./node_modules/**",      // Exclude node_modules
    "!./dist/**",              // Exclude build output
    "!./dist-electron/**"      // Exclude electron build output
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: '#10b981',
        dark: '#1f2937',
        light: '#f3f4f6'
      }
    }
  },
  plugins: [],
}
