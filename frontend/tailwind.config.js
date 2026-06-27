/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#131B2E',
        surface: '#1C2640',
        card: '#F5F0E8',
        'card-alt': '#EAE4D8',
        'card-border': '#CBBFA8',
        accent: {
          DEFAULT: '#B5651D',
          light: '#C9773A',
          dark: '#8C4D15',
          faint: 'rgba(181,101,29,0.10)',
        },
        ink: {
          DEFAULT: '#1E2A3A',
          muted: '#5A6B7B',
          faint: '#8A98A8',
        },
        text: {
          DEFAULT: '#DDD6CC',
          muted: '#8A95B5',
          faint: '#4D5978',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.20)',
        'accent-sm': '0 0 0 3px rgba(181,101,29,0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
