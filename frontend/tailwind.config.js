const { heroui } = require('@heroui/theme');

module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"JetBrains Mono"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1e3a8a',
        }
      },
      boxShadow: {
        sm: '1px 3px 4px rgba(0, 0, 0, 0.20)',
        md: '1px 4px 8px rgba(0, 0, 0, 0.16)',
        lg: '0 6px 16px rgba(0, 0, 0, 0.1)',
        xl: '0 8px 20px rgba(0, 0, 0, 0.12)',
        '2xl': '1px 12px 28px rgba(0, 0, 0, 0.15)',
        panel: '0 4px 20px rgba(0, 0, 0, 0.05)',
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
