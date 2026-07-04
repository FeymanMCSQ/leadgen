import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // 10% — accent (logo green)
          green: '#34A853',
          'green-dark': '#2A8944',
          'green-light': '#E6F4EA',
          // 20% — structure (logo navy, derived from the blue)
          navy: '#0D1B2A',
          'navy-mid': '#162236',
          'navy-light': '#1E3050',
          'navy-border': '#263D68',
          // secondary (logo blue — reserved for hyperlinks)
          blue: '#1A73E8',
          'blue-light': '#E8F0FE',
        },
      },
    },
  },
  plugins: [],
};

export default config;
