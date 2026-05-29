/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        emerald: {
          950: '#022416',
          900: '#042f1f',
          850: '#063f2a',
          800: '#084f35',
          primary: '#10b981',
        },
        yellow: {
          450: '#ffcc00',
          gold: '#fbbf24',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1, filter: 'brightness(1)' },
          '50%': { opacity: .7, filter: 'brightness(1.5)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-emerald': '0 8px 32px 0 rgba(16, 185, 129, 0.2)',
        'glass-gold': '0 8px 32px 0 rgba(251, 191, 36, 0.2)',
        'neon-emerald': '0 0 15px rgba(16, 185, 129, 0.5)',
        'neon-gold': '0 0 15px rgba(251, 191, 36, 0.5)',
      }
    },
  },
  plugins: [],
};
