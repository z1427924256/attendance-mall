/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // 排除 Arco 自带样式，避免冲突
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--arcoblue-6))',
        success: 'rgb(var(--green-6))',
        warning: 'rgb(var(--orange-6))',
        danger: 'rgb(var(--red-6))',
      },
      maxWidth: {
        h5: '430px',
      },
    },
  },
  plugins: [],
};
