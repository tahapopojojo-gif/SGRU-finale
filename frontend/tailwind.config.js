/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8edf5',
          100: '#c5d0e6',
          200: '#9fb0d5',
          300: '#7890c4',
          400: '#5a78b8',
          500: '#3d60ab',
          600: '#2a4f99',
          700: '#1a3d7a',
          800: '#0f3460',
          900: '#0a2540',
        },
        accent: {
          50:  '#fdeef1',
          100: '#fad4db',
          200: '#f5a8b5',
          300: '#f07c8f',
          400: '#eb5469',
          500: '#e94560',
          600: '#d13050',
          700: '#b01e3d',
          800: '#8e0e2b',
          900: '#6d001a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card:     '0 2px 8px rgba(0,0,0,0.08)',
        elevated: '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
