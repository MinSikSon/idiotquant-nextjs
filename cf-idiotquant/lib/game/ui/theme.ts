// 색·치수·글자. 화면에 쓰이는 상수는 전부 여기서만 나온다.
//
// 컴포넌트마다 색을 적어 두면 어느 날 한쪽만 바뀐다. 씬이 셋만 돼도 그렇다.

/** 설계 해상도 — 폰 세로 화면. 실제 기기에는 Scale.FIT 로 늘어난다. */
export const W = 390;
export const H = 844;

/**
 * 화면을 넷으로 나눈 띠. 원핸드 조작이라 **아래로 갈수록 중요한 것**이 온다 —
 * 엄지가 닿는 자리에 버튼이 있어야 한다.
 */
export const BAND = {
    hud: { y: 0, h: 100 },
    chart: { y: 100, h: 350 },
    cards: { y: 450, h: 200 },
    action: { y: 650, h: 194 },
} as const;

export const PAD = 10;

/** 숫자(0xRRGGBB)는 Graphics 용, 문자열은 Text 용이다. 같은 값을 두 벌로 둔다. */
export const C = {
    bg: 0x0b0f10,
    panel: 0x141c1e,
    panelHi: 0x222e31,
    line: 0x2f4046,
    screen: 0x070c0d,
    up: 0x5cf08f,     // 양봉 — 네온 그린
    down: 0xff6b4a,   // 음봉 — 레드/오렌지
    ink: 0xe9f2ea,
    inkDim: 0x7d8f88,
    gold: 0xe3b34a,
    neon: 0x5cf08f,
    danger: 0xff5ec8,
} as const;

export const S = {
    bg: "#0b0f10",
    panel: "#141c1e",
    line: "#2f4046",
    up: "#5cf08f",
    down: "#ff6b4a",
    ink: "#e9f2ea",
    inkDim: "#7d8f88",
    gold: "#e3b34a",
    neon: "#5cf08f",
    danger: "#ff5ec8",
} as const;

/** 도트 느낌을 살리려면 굵기 없는 고정폭이 낫다. 시스템 글꼴만 쓴다(웹폰트 없음). */
export const FONT = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

export const FS = { xs: 10, sm: 12, md: 14, lg: 18, xl: 26, xxl: 40 } as const;

/** "+3.20%" 처럼 부호를 붙인다. */
export function pct(v: number): string {
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

/** 화면 폭에 맞는 짧은 금액 표기. 1,234만 / 1억 2,340만 */
export function money(v: number): string {
    const n = Math.round(v);
    const neg = n < 0 ? "-" : "";
    const a = Math.abs(n);
    if (a >= 100_000_000) {
        const eok = Math.floor(a / 100_000_000);
        const man = Math.floor((a % 100_000_000) / 10_000);
        return `${neg}${eok}억${man ? ` ${man.toLocaleString()}만` : ""}`;
    }
    if (a >= 10_000) return `${neg}${Math.floor(a / 10_000).toLocaleString()}만`;
    return `${neg}${a.toLocaleString()}`;
}

/** 오르면 초록, 내리면 주황. 이 게임은 네온 팔레트라 한국 시장색(빨강/파랑)을 안 쓴다. */
export function tone(v: number): string {
    return v > 0 ? S.up : v < 0 ? S.down : S.inkDim;
}
