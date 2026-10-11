import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CSS variables - actual values injected at runtime from site_settings.theme
        brand: {
          primary: 'var(--brand-primary, #0F4C5C)',
          accent: 'var(--brand-accent, #E36414)',
          50: 'var(--brand-50, #E6F0F2)',
          100: 'var(--brand-100, #C2DCE0)',
          500: 'var(--brand-500, #0F4C5C)',
          600: 'var(--brand-600, #0C3D4A)',
          700: 'var(--brand-700, #092E38)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans, "Inter")', 'system-ui', 'sans-serif'],
        bengali: ['var(--font-bengali, "Noto Sans Bengali")', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
