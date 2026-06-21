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
      }
    },
  },
  darkMode: 'class',
  plugins: [
    heroui(),
    require('@tailwindcss/typography'),
  ],
};
