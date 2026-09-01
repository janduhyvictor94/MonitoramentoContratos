export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdf9ed',
          100: '#faf0d0',
          200: '#f4dd9c',
          300: '#edc468',
          400: '#e6ae42',
          500: '#d99326',
          600: '#bb721d',
          700: '#94531c',
          800: '#79431f',
          900: '#67381e',
          950: '#3b1d0c',
        },
        ink: {
          50:  '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#3d3d3d',
          900: '#2a2a2a',
          950: '#0f0f0f',
        },
        cream: {
          50:  '#fdfcfa',
          100: '#faf7f2',
          200: '#f3ede2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        luxury: '0.18em',
      },
    },
  },
  plugins: [],
}