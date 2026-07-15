/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slow-zoom': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
      },
      animation: {
        'fade-slide-up': 'fade-slide-up 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slow-zoom': 'slow-zoom 22s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
