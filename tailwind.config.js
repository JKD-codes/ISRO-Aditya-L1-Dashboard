/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#020B18',
          secondary: '#041428',
          tertiary: '#071E3D',
        },
        accent: {
          orange: '#FF6B00',
          amber: '#FFB347',
          green: '#00E5A0',
          red: '#FF3B3B',
        },
        text: {
          primary: '#F0F4FF',
          secondary: '#8FA3C0',
        },
        border: {
          subtle: 'rgba(255,107,0,0.15)',
          emphasis: 'rgba(255,107,0,0.4)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Chakra Petch"', 'sans-serif'],
        telemetry: ['"Rajdhani"', 'sans-serif'],
        header: ['"Exo 2"', 'sans-serif'],
      },
      backgroundImage: {
        'panel-gradient': 'linear-gradient(180deg, rgba(7, 30, 61, 0.4) 0%, rgba(4, 20, 40, 0.8) 100%)',
        'alert-gradient': 'linear-gradient(90deg, rgba(255,59,59,0.15) 0%, rgba(255,59,59,0) 100%)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        }
      },
      animation: {
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
      }
    },
  },
  plugins: [],
}
