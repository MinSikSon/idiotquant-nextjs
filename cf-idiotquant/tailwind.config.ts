const config = {
  darkMode: ["class"], // class 기반으로 제어
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // 전략 배지·활성 칩 색이 lib/constants/strategies.ts 에 문자열로 들어있다.
    // 여기가 빠지면 그 클래스는 생성되지 않아 칩이 흰색으로 렌더된다.
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",

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
        'gradient-xy': 'gradient-xy 3s ease infinite',
        // 홈 히어로의 앱 화면 미리보기 — 아주 느리게 떠오르내린다
        float: 'float 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        marquee2: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0%)" },
        },
        'gradient-xy': {
          '0%, 100%': { 'background-size': '400% 400%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
      },
      fontFamily: {
        sans: ["Pretendard Variable", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
        serif: ["var(--font-serif-latin)", "Lora", "var(--font-serif-kr)", "Noto Serif KR", "Georgia", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // 브랜드 액센트 (시그니처 그린)
        brand: {
          DEFAULT: "#16a34a",
          hover: "#15803d",
          light: "#dcfce7",
          "light-hover": "#86efac",
        },

        // 라이트 모드 표면
        surface: {
          canvas: "#faf9f7",
          card: "#ffffff",
          muted: "#ede8df",
          "muted-hover": "#f5f0e8",
        },

        // 다크 모드 표면 (7단계 계층)
        "surface-dark": {
          canvas: "#1a1915",
          DEFAULT: "#1f1e1b",
          card: "#242320",
          hover: "#2c2b27",
          muted: "#35332e",
          border: "#3a3834",
          elevated: "#4a4641",
        },

        // 테두리
        "border-subtle": {
          DEFAULT: "#e5e5e5",
          dark: "#35332e",
          "dark-strong": "#3a3834",
        },
      },
    },
  },
};
export default config;
