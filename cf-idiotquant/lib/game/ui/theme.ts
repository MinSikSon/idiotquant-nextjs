// 색·치수·글자. 화면에 쓰이는 상수는 전부 여기서만 나온다.
//
// 컴포넌트마다 색을 적어 두면 어느 날 한쪽만 바뀐다. 씬이 셋만 돼도 그렇다.

// 타입만 받는다 — 이 파일이 Phaser 를 실제로 부르면 상수를 읽으려던 자리가 전부
// 브라우저 전용이 된다. `import type` 은 컴파일에서 통째로 지워진다.
import type Phaser from "phaser";

/**
 * 세로일 때의 설계 폭. 그리고 아래 모든 치수가 기준으로 삼는 값이다.
 *
 * 설계 격자를 390x844 로 통째로 못박아 두면 Scale.FIT 이 둘 중 작은 쪽에 맞추느라 화면
 * 전체를 줄인다 — iPhone SE 세로에서 배율이 0.66 까지 떨어져 좌우 119px 이 검은 띠가
 * 됐고, 가로로 돌리면 위아래가 통째로 남았다.
 *
 * 그래서 **짧은 쪽을 고정하고 긴 쪽을 기기에서 받는다**(`designSize`).
 */
export const W = 390;

/** 기준 세로. 크기를 못 잴 때 떨어지는 자리이기도 하다. */
export const H = 844;

const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)));

/**
 * 가로로 눕혔다고 볼 최소 비율.
 *
 * 단순히 "폭 > 세로" 로 가르면 조금 납작한 창(430x300 같은)까지 두 칸으로 쪼개져 손패
 * 세 장이 51px 씩으로 눌린다. 두 칸이 값어치를 하려면 폭이 세로의 1.5배는 돼야 한다.
 */
const LANDSCAPE_RATIO = 1.5;

export interface DesignSize {
    width: number;
    height: number;
    /** 세로 배치인가. 화면이 아니라 **이 격자**의 모양을 말한다. */
    portrait: boolean;
}

/**
 * 기기가 준 칸에서 설계 격자를 낸다. 여기서 나온 값이 곧 FIT 의 기준이라, 이 비율이
 * 칸의 비율과 같으면 여백이 0 이 된다.
 */
export function designSize(hostW: number, hostH: number): DesignSize {
    if (!(hostW > 0) || !(hostH > 0)) return { width: W, height: H, portrait: true };

    if (hostW / hostH < LANDSCAPE_RATIO) {
        // 세로 — 폭을 390 으로 고정한다. 폰 폭은 360~430 에 몰려 있어 배율이 0.92~1.10 이다.
        return { width: W, height: clamp((W * hostH) / hostW, 540, 1100), portrait: true };
    }

    // 가로 — 이번에는 세로가 짧은 쪽이다. 폰을 눕히면 앱 크롬을 뺀 세로가 280px 남짓뿐이라
    // 되도록 1:1 로 그린다(그래야 글씨가 안 줄어든다). 아래위 한계는 띠가 무너지지 않을
    // 최소치와, 큰 화면에서 글씨가 지나치게 커지지 않을 최대치다.
    const height = clamp(hostH, 300, 460);
    // 폭의 아래 한계는 비율의 하한(1.5) × 세로의 하한(300)이다. 그래서 이 값이 걸리는
    // 일은 없고 — 걸리면 격자 비율이 칸과 어긋나 여백이 생긴다 — 순전히 안전망이다.
    return { width: clamp((height * hostW) / hostH, 450, 1400), height, portrait: false };
}

export interface Band { x: number; y: number; w: number; h: number }
export interface Bands {
    portrait: boolean;
    hud: Band;
    chart: Band;
    cards: Band;
    action: Band;
}

/**
 * 격자를 네 자리로 나눈다.
 *
 * **세로**는 위에서 아래로 넷. 원핸드 조작이라 아래로 갈수록 손이 닿아야 하는 것이 온다.
 * HUD 는 글자 줄 높이라 고정이고, 손패와 버튼이 최소치를 먼저 가져간 뒤 **남는 세로는
 * 전부 차트**로 간다.
 *
 * **가로**는 왼쪽·오른쪽 두 칸. 왼쪽에 읽는 것(HUD·차트), 오른쪽에 만지는 것(손패·버튼)을
 * 둔다 — 눕힌 폰은 세로가 280px 뿐이라 넷을 쌓으면 어느 하나도 제 크기가 안 나온다.
 */
export function bandsOf(w: number, h: number): Bands {
    const hud = 100;

    if (w / h < LANDSCAPE_RATIO) {
        const action = clamp(h * 0.23, 148, 194);
        const cards = clamp(h * 0.24, 148, 200);
        const chart = Math.max(136, h - hud - action - cards);
        return {
            portrait: true,
            hud: { x: 0, y: 0, w, h: hud },
            chart: { x: 0, y: hud, w, h: chart },
            cards: { x: 0, y: hud + chart, w, h: cards },
            action: { x: 0, y: hud + chart + cards, w, h: action },
        };
    }

    // 오른쪽 칸에는 카드 셋과 버튼 넷이 나란히 들어간다. 왼쪽에 더 주면 그 여덟 개가
    // 전부 좁아져 이름과 라벨이 잘린다 — 차트는 폭이 조금 줄어도 읽힌다.
    const left = Math.round(w * 0.52);
    const right = w - left;
    // 가로에서는 매매 버튼 넷이 **한 줄**로 간다. 폭은 남고 세로는 모자란 자리다.
    const action = clamp(h * 0.28, 76, 110);
    return {
        portrait: false,
        hud: { x: 0, y: 0, w: left, h: hud },
        chart: { x: 0, y: hud, w: left, h: h - hud },
        cards: { x: left, y: 0, w: right, h: h - action },
        action: { x: left, y: h - action, w: right, h: action },
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
