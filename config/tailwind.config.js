/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'aurora': 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(37, 99, 235, 0.1), rgba(255, 255, 255, 0))',
      },
    },
  },
  plugins: [],
}
EOF < /dev/null
