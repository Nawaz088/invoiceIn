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
          DEFAULT: '#1E3A5F',
          light: '#2D4A6F',
          dark: '#152A45',
        },
        secondary: '#F8F4F0',
        accent: {
          DEFAULT: '#E07A29',
          light: '#F4A261',
          dark: '#C66A1F',
        },
        success: '#2D8B57',
        warning: '#D4A017',
        danger: '#C94A4A',
        surface: '#FFFFFF',
        'text-primary': '#1A1A2E',
        'text-secondary': '#5C6370',
        'text-muted': '#9CA3AF',
        'border-light': '#E5E7EB',
        'bg-main': '#FAFBFC',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)',
        'modal': '0 8px 32px rgba(0,0,0,0.15)',
        'invoice': '0 4px 20px rgba(30,58,95,0.12), 0 12px 40px rgba(0,0,0,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
