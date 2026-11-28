/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border) / calc(<alpha-value> * var(--border-a)))',
        input: 'hsl(var(--input) / calc(<alpha-value> * var(--border-a)))',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: { DEFAULT: 'hsl(var(--primary) / <alpha-value>)', foreground: 'hsl(var(--primary-foreground) / <alpha-value>)' },
        secondary: { DEFAULT: 'hsl(var(--secondary) / calc(<alpha-value> * var(--secondary-a)))', foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)' },
        muted: { DEFAULT: 'hsl(var(--muted) / calc(<alpha-value> * var(--secondary-a)))', foreground: 'hsl(var(--muted-foreground) / <alpha-value>)' },
        accent: { DEFAULT: 'hsl(var(--accent) / <alpha-value>)', foreground: 'hsl(var(--accent-foreground) / <alpha-value>)' },
        card: { DEFAULT: 'hsl(var(--card) / calc(<alpha-value> * var(--card-a)))', foreground: 'hsl(var(--card-foreground) / <alpha-value>)' },
        popover: { DEFAULT: 'hsl(var(--popover) / calc(<alpha-value> * var(--popover-a)))', foreground: 'hsl(var(--popover-foreground) / <alpha-value>)' },
        destructive: { DEFAULT: 'hsl(var(--destructive) / <alpha-value>)', foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)' },
      },
      boxShadow: {
        glass: 'inset 0 1px 0 0 hsl(0 0% 100% / var(--hi-a)), 0 1px 2px hsl(230 50% 3% / .12), 0 18px 50px -24px hsl(230 60% 3% / var(--drop-a))',
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { from: { backgroundPosition: '0% 50%' }, to: { backgroundPosition: '200% 50%' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        aurora: {
          '0%': { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)' },
          '50%': { transform: 'translate3d(6%,-4%,0) scale(1.12) rotate(18deg)' },
          '100%': { transform: 'translate3d(-5%,5%,0) scale(.95) rotate(-12deg)' },
        },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 hsl(var(--primary) / .55)' }, '100%': { boxShadow: '0 0 0 14px hsl(var(--primary) / 0)' } },
      },
      animation: {
        'fade-up': 'fade-up .5s ease both',
        shimmer: 'shimmer 6s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.6s ease-out infinite',
        aurora: 'aurora 22s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
}
