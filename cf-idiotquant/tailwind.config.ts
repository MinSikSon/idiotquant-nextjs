const config = {
  darkMode: ["class"], // class 기반으로 제어
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",

    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [require('@tailwindcss/typography')],

  mode: 'jit',
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        marquee: "marquee 12s linear infinite",
        marquee2: "marquee2 12s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        marquee2: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0%)" },
        },
      },
      fontFamily: {
        mono: ["Noto Sans, Inter, Pretendard"],
        // mono: ["Cascadia Code", "Fira Code", "Courier New", "monospace"],
        // mono: ['D2Coding', 'Noto Sans Mono', 'IBM Plex Mono', 'monospace'],
        // mono: ['Noto Sans Mono', 'D2Coding', 'IBM Plex Mono', 'monospace'],
        // mono: ['Courier New', 'Courier', 'monospace'],
        // mono: ['Courier New', 'Courier', 'monospace', 'Nanum Gothic Coding', 'Source Code Pro'],  // 한글을 고려한 고정폭 폰트 추가
        serif: ["Times New Roman", "Georgia", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
};
export default config;
