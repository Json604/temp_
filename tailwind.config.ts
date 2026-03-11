import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-responsive surface palette
        surface: {
          DEFAULT: "var(--bg-base)",
          50: "var(--bg-elevated)",
          100: "var(--bg-elevated)",
          200: "var(--bg-sunken)",
        },
        // Theme-responsive silver text palette
        silver: {
          DEFAULT: "var(--text-primary)",
          50: "var(--text-heading)",
          100: "var(--text-heading)",
          200: "var(--text-primary)",
          300: "var(--text-primary)",
          400: "var(--text-secondary)",
          500: "var(--text-tertiary)",
          600: "var(--text-muted)",
          700: "var(--text-muted)",
          800: "var(--text-muted)",
          900: "var(--text-muted)",
        },
        // Accent — works in both themes
        accent: {
          DEFAULT: "var(--text-grad-accent-start)",
          warm: "#a78bfa",
          cool: "#67e8f9",
        },
        // Risk colours — accessible in both modes
        risk: {
          low: "var(--risk-badge-low-text)",
          moderate: "var(--risk-badge-mod-text)",
          high: "var(--risk-badge-high-text)",
          critical: "var(--risk-badge-crit-text)",
        },
        // Legacy compat for constants
        navy: "#1B3A5C",
        teal: "#0D7377",
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glass-lg': '0 16px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glow': '0 0 24px rgba(125,211,252,0.15)',
        'glow-accent': '0 0 32px rgba(125,211,252,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'step-forward': 'stepForward 0.35s cubic-bezier(0.4,0,0.2,1)',
        'step-back': 'stepBack 0.35s cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        stepForward: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        stepBack: {
          '0%': { opacity: '0', transform: 'translateX(-40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
