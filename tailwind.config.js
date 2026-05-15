/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3C3CEF',
          dark: '#2E2ED4',
          light: '#5A5AF5',
          bg: '#EDEDFD',
        },
        accent: {
          orange: '#F5A623',
          blue: '#3C3CEF',
        },
        page: '#F5F6FA',
        sidebar: '#FFFFFF',
        't-primary': '#1E293B',
        't-secondary': '#64748B',
        't-muted': '#94A3B8',
        't-light': '#CBD5E1',
        border: {
          DEFAULT: '#E2E8F0',
          medium: '#CBD5E1',
        },
        success: { DEFAULT: '#10B981', bg: '#D1FAE5' },
        warning: { DEFAULT: '#F59E0B', bg: '#FEF3C7' },
        error: { DEFAULT: '#EF4444', bg: '#FEE2E2' },
        info: { DEFAULT: '#3B82F6', bg: '#DBEAFE' },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      spacing: {
        'sidebar': '250px',
        'header': '72px',
      },
      borderRadius: {
        'none': '0px',
        'sm': '0px',
        'DEFAULT': '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'card': '0px',
        'full': '9999px',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      animation: {
        'slide-up':    'slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'scale-in':    'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-in':     'fadeIn 0.5s ease both 0.3s',
        'check':       'drawCheck 0.4s ease both 0.5s',
        'dash':        'dashIn 1.2s ease-out both',
        'spin-slow':   'spin 2s linear infinite',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { transform: 'scale(0)', opacity: '0' },
          to:   { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        drawCheck: {
          from: { strokeDasharray: '0 30', opacity: '0' },
          to:   { strokeDasharray: '30 0', opacity: '1' },
        },
        dashIn: {
          from: { strokeDashoffset: '276' },
          to:   { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [
    // Global focus-visible ring — applied automatically to any element with
    // focus-visible:ring-* via Tailwind, but this ensures base ring is visible.
    function({ addBase, theme }) {
      addBase({
        '*:focus-visible': {
          outline: 'none',
          boxShadow: `0 0 0 2px ${theme('colors.brand.DEFAULT')}, 0 0 0 4px white`,
        },
      });
    },
  ],
}
