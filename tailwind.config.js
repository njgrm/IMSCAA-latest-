const flowbite = require("flowbite-react/tailwind");

module.exports = {
  content: [
    "./index.html", 
    "./src/**/*.{js,ts,jsx,tsx}",
    flowbite.content(),
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ffffff !important' , // White (for light UI backgrounds)
          100: '#dcfce7 !important', // Very light green
          200: '#bbf7d0 !important', // Light green
          300: '#86efac !important', // Mid-light green
          400: '#3FBF7F !important', // Your light green
          500: '#238354 !important', // Your original green (main color)
          600: '#2E9B63 !important', // Your mid green
          700: '#1d6b45 !important', // Darker green
          800: '#145232 !important', // Even darker green
          900: '#0e3a23 !important', // Very dark green
          950: '#072112 !important', // Darkest green
        },
        secondary: {
          50: '#fffbf5 !important', // Lightest orange/almost white
          100: '#fff1e0 !important', // Very light orange
          200: '#ffe0bb !important', // Light orange
          300: '#ffca8e !important', // Mid-light orange
          400: '#ff9a4d !important', // Light orange
          500: '#f45d05 !important', // Your specified orange (main color)
          600: '#d14e04 !important', // Slightly darker orange
          700: '#a93e03 !important', // Darker orange
          800: '#7e2f02 !important', // Very dark orange
          900: '#591f02 !important', // Extremely dark orange
          950: '#331001 !important', // Darkest orange/almost black
        },
      },
      fontFamily: {
        // Example: using Inter as your default sans-serif font
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui'],
        // Alternatively, you can add other stacks:
        // roboto: ['Roboto', 'sans-serif'],
        // open: ['"Open Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [
    flowbite.plugin(),
  ],
};
