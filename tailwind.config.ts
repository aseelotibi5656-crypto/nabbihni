import type { Config } from 'tailwindcss';

/**
 * نظام التصميم لمنصة نَبّهني
 * ------------------------------------------------
 * كل الألوان معرّفة كمتغيرات CSS في globals.css حتى يعمل الوضع الليلي
 * بتبديل صنف واحد على <html> بدون إعادة بناء الأنماط.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          soft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
          strong: 'rgb(var(--c-brand-strong) / <alpha-value>)',
          fg: 'rgb(var(--c-brand-fg) / <alpha-value>)',
        },
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        info: 'rgb(var(--c-info) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '"IBM Plex Sans Arabic"',
          '"Noto Sans Arabic"',
          '"Segoe UI"',
          'Tahoma',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
        18: '4.5rem',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.06)',
        card: '0 1px 3px rgb(15 23 42 / 0.05), 0 12px 32px -12px rgb(15 23 42 / 0.12)',
        lift: '0 2px 6px rgb(15 23 42 / 0.06), 0 24px 48px -20px rgb(15 23 42 / 0.22)',
        glow: '0 0 0 1px rgb(var(--c-brand) / 0.2), 0 12px 40px -12px rgb(var(--c-brand) / 0.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-bottom': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(-100%)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(.9)', opacity: '0.7' },
          '80%,100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .35s ease both',
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .2s cubic-bezier(.22,1,.36,1) both',
        'slide-in-bottom': 'slide-in-bottom .28s cubic-bezier(.22,1,.36,1) both',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(.24,.6,.35,1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
