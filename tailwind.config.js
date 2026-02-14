/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // System colors - matching the original game aesthetic
        weapons: {
          DEFAULT: '#e53e3e', // Brighter red
          light: '#fc8181',
          dark: '#c53030',
        },
        computers: {
          DEFAULT: '#3b82f6', // Blue
          light: '#60a5fa',
          dark: '#2563eb',
        },
        engines: {
          DEFAULT: '#ed8936', // Orange
          light: '#f6ad55',
          dark: '#dd6b20',
        },
        logistics: {
          DEFAULT: '#48bb78', // Green (changed from yellow)
          light: '#68d391',
          dark: '#38a169',
        },
        // Zone colors
        near: {
          DEFAULT: '#48bb78', // Green for near space
          light: '#68d391',
          dark: '#38a169',
        },
        mid: {
          DEFAULT: '#ed8936', // Orange for mid space
          light: '#f6ad55',
          dark: '#dd6b20',
        },
        deep: {
          DEFAULT: '#9f7aea', // Purple for deep space
          light: '#b794f4',
          dark: '#805ad5',
        },
        // Game UI colors
        rust: {
          DEFAULT: '#c05621',
          light: '#dd6b20',
          dark: '#9c4221',
        },
        copper: {
          DEFAULT: '#b7791f',
          light: '#d69e2e',
          dark: '#975a16',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
      },
    },
  },
  plugins: [],
};
