/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          gold: '#f5f5dc',
          'gold-light': '#ffffff',
          black: '#050505',
          dark: '#111111',
          card: '#161616',
          cream: '#f5f5dc',
          grey: '#888888',
        },
        fontFamily: {
          playfair: ['Playfair Display', 'serif'],
          sans: ['DM Sans', 'sans-serif'],
          bebas: ['Bebas Neue', 'sans-serif'],
        }
      },
    },
    plugins: [],
  }