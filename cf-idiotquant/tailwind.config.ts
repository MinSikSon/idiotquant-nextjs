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

  /* 작업 중심 UI: 중성 표면, 얇은 구분선, 강조색은 주요 동작에 사용한다.
     컨트롤은 4px, 카드·패널은 8px. 배지·아바타의 rounded-full은 유지한다.
     게임은 자체 화면 루트에서 기존 반경 변수를 사용한다. */

  /* 로딩 자리표시자(animate-pulse 막대)의 색은 하나다:
       bg-neutral-200 dark:bg-surface-dark-elevated
     자리표시자는 보이라고 두는 것이라, 얹히는 카드보다 확실히 진해야 한다.
     예전에는 색 조합이 열한 가지였고 balance/shared.tsx 의 한 스켈레톤 안에서도
     막대마다 색이 갈렸다. 카드 모양 스켈레톤의 **껍데기**는 예외로, 카드 색
     (bg-white dark:bg-surface-dark-card)을 그대로 쓴다 — 그건 자리표시자가
     아니라 카드 자신이다.

     카드 표면도 하나다:
       bg-white dark:bg-surface-dark-card rounded-2xl
       border border-neutral-200 dark:border-border-subtle-dark
     shadow 는 얹지 않는다. 테두리가 이미 카드를 갈라 주고, 50개 카드에 전부
     그림자를 깔면 무엇이 떠 있는 것인지가 사라진다. */
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius-control)",
        xl: "var(--radius-input)",
        "2xl": "var(--radius-panel)",
      },
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

        // 브랜드 채움색과 테마별 글자색을 분리해 흰 버튼 글자의 대비를 유지한다.
        brand: {
          DEFAULT: "#421d24",
          hover: "#5a2a33",
          light: "#eee7fa",
          muted: "#3a3048",
          ink: "rgb(var(--brand-ink) / <alpha-value>)",
          "ink-hover": "rgb(var(--brand-ink-hover) / <alpha-value>)",
          "light-hover": "#d4c7ff",
        },

        // 라이트 모드 표면
        surface: {
          canvas: "#f2f0eb",
          card: "#ffffff",
          muted: "#f4f4f5",
          "muted-hover": "#f7f7f8",
        },

        // 다크 모드 표면 (7단계 계층)
        "surface-dark": {
          canvas: "#1b1819",
          DEFAULT: "#18181b",
          card: "#1c1c20",
          hover: "#252529",
          muted: "#2d2d33",
          // 테두리는 아래 border-subtle.dark 와 같은 값이다. 이름이 둘인 것은
          // 역사적 이유이고, 값이 갈라지면 안 된다 — 아래 주석 참고.
          border: "#35353b",
          elevated: "#52525b",
        },

        // 카드·패널의 테두리는 surface-dark.border와 같은 값을 쓴다.
        "border-subtle": {
          DEFAULT: "#e5e5e5",
          dark: "#35353b",
        },
      },
    },
  },
};
export default config;
