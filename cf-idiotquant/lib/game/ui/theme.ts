// 색·치수·글자. 화면에 쓰이는 상수는 전부 여기서만 나온다.
//
// 컴포넌트마다 색을 적어 두면 어느 날 한쪽만 바뀐다. 씬이 셋만 돼도 그렇다.

// 타입만 받는다 — 이 파일이 Phaser 를 실제로 부르면 상수를 읽으려던 자리가 전부
// 브라우저 전용이 된다. `import type` 은 컴파일에서 통째로 지워진다.
import type Phaser from "phaser";

/**
 * 설계 **폭**. 이것만 고정이다.
 *
 * 세로까지 844 로 못박아 두면 Scale.FIT 이 둘 중 작은 쪽에 맞추느라, 세로가 짧은 폰에서
 * 화면 전체를 통째로 줄여 버린다 — iPhone SE(375×667)에서는 배율이 0.66 까지 떨어져
 * 좌우 119px 이 검은 띠로 버려지고 글씨도 그만큼 작아졌다.
 *
 * 그래서 폭만 고정하고 **세로는 기기에서 받아 온다**(`heightFor`). 그러면 배율이 언제나
 * 정확히 `화면폭 / 390` 이라 좌우 여백이 0 이고, 글씨는 화면이 넓을수록 커진다.
 */
export const W = 390;

/** 기준 세로. 이 값일 때 아래 띠가 원래 설계대로 나뉜다. */
export const H = 844;

/**
 * 기기 크기에서 설계 세로를 낸다. 폭을 390 으로 맞췄을 때 세로가 얼마가 되는가.
 *
 * 위아래로 지나치게 벌어진 자리(데스크톱의 넓은 칸 등)에서는 띠가 무너지므로 가둬 둔다.
 */
export function heightFor(hostW: number, hostH: number): number {
    if (!(hostW > 0) || !(hostH > 0)) return H;
    // 아래 하한은 bandsOf 의 최소 띠 넷을 더한 값이다. 이보다 낮추면 마지막 띠가 캔버스
    // 밖으로 밀려 버튼이 잘린다. iPhone SE(375×667)가 정확히 이 값에 떨어진다.
    return Math.round(Math.min(1100, Math.max(540, (W * hostH) / hostW)));
}

export interface Band { y: number; h: number }
export interface Bands { hud: Band; chart: Band; cards: Band; action: Band }

/**
 * 화면을 넷으로 나눈 띠. 원핸드 조작이라 **아래로 갈수록 중요한 것**이 온다 —
 * 엄지가 닿는 자리에 버튼이 있어야 한다.
 *
 * HUD 는 글자 줄 높이라 고정이고, 손패와 버튼은 손가락이 닿을 최소치를 먼저 가져간다.
 * **남는 세로는 전부 차트로 간다** — 늘릴 값어치가 있는 것이 거기뿐이다.
 */
export function bandsOf(h: number): Bands {
    const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)));
    const hud = 100;
    const action = clamp(h * 0.23, 148, 194);
    const cards = clamp(h * 0.24, 148, 200);
    const chart = Math.max(136, h - hud - action - cards);
    return {
        hud: { y: 0, h: hud },
        chart: { y: hud, h: chart },
        cards: { y: hud + chart, h: cards },
        action: { y: hud + chart + cards, h: action },
    };
}

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

/** 웹폰트가 아직 안 왔거나 못 읽었을 때 떨어지는 자리. 굵기 없는 고정폭이면 된다. */
export const FONT = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

/**
 * 실제로 그릴 글꼴.
 *
 * next/font 가 만든 패밀리 이름은 빌드마다 바뀌는 해시라 여기 손으로 적을 수 없다.
 * React 껍데기(PhaserGame.tsx)가 DOM 에서 읽어 registry 에 넣어 둔 값을 쓰고, 그게
 * 없으면 위의 시스템 고정폭으로 떨어진다 — 글꼴 하나 때문에 판이 안 켜지면 안 된다.
 */
export function fontOf(scene: Phaser.Scene): string {
    return (scene.game.registry.get("fontFamily") as string) || FONT;
}

/**
 * 글자 크기. 폰에서 읽히는 것이 먼저라 도트 느낌보다 크기를 택했다.
 *
 * 이 값은 설계 격자 기준이고 화면에서는 `화면폭 / 390` 이 곱해진다. 예전에는 그 배율이
 * 0.66~0.87 이라 14px 이 9~12px 로 보였다 — 폰에서 읽을 크기가 아니었다.
 */
export const FS = { xs: 11, sm: 13, md: 16, lg: 21, xl: 29, xxl: 42 } as const;

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
