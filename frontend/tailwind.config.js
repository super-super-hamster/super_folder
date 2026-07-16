const { heroui } = require('@heroui/theme');

module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI"', '"Microsoft YaHei UI"', '"Microsoft YaHei"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#272923',
        },
        sf: {
          desk: '#FFFFFF',
          page: '#FFFCF1',
          panel: '#FBF2D8',
          item: '#F8EECB',
          'item-hover': '#FDF4D4',
          selected: '#FFF1BD',
          input: '#FAF0D0',
          'input-hover': '#F3E5BC',
          border: '#E4DAC0',
          text: '#272923',
          'text-secondary': '#686B64',
          'text-muted': '#8A8D84',
          accent: '#416B57',
          danger: '#DB2626',
        }
      },
      boxShadow: {
        sm: '1px 3px 4px rgba(0, 0, 0, 0.20)',
        md: '1px 4px 8px rgba(0, 0, 0, 0.16)',
        lg: '0 6px 16px rgba(0, 0, 0, 0.1)',
        xl: '0 8px 20px rgba(0, 0, 0, 0.12)',
        '2xl': '1px 12px 28px rgba(0, 0, 0, 0.15)',
        panel: '1px 2px 2px rgba(45, 42, 35, 0.10), 3px 5px 12px rgba(45, 42, 35, 0.06)',
        'paper-hover': '1px 2px 3px rgba(45, 42, 35, 0.12), 4px 7px 14px rgba(45, 42, 35, 0.08)',
        raised: '2px 4px 8px rgba(45, 42, 35, 0.12), 8px 16px 32px rgba(45, 42, 35, 0.14)',
        modal: '3px 8px 18px rgba(45, 42, 35, 0.13), 14px 28px 64px rgba(45, 42, 35, 0.18)',
      },
      zIndex: {
        base: '0',
        panel: '10',
        dropdown: '40',
        modal: '50',
        popover: '60',
        context: '70',
        tooltip: '80',
      }
    },
  },
  darkMode: 'class',
  plugins: [
    heroui(),
    require('@tailwindcss/typography'),
  ],
};
