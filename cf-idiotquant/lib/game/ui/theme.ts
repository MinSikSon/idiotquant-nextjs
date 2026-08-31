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

/* ── 물리 픽셀 ─────────────────────────────────────────────────── */

/**
 * 설계 격자 1 칸을 물리 픽셀 몇 개로 그릴까.
 *
 * 지금까지는 캔버스 버퍼가 설계 격자 크기(390) 그대로였다. DPR 3 폰에서는 그 390px 짜리
 * 그림이 1170 물리 픽셀로 **늘려진다** — 브라우저가 사이를 보간하니 글자 획이 뭉개지고
 * 선이 번진다. 게임 화면이 뿌옇던 이유가 이것이다.
 *
 * 고치는 길은 하나다: 버퍼를 기기 해상도로 잡고, 카메라를 그만큼 확대해 **좌표는 설계
 * 격자 그대로** 두는 것. 그러면 이 파일 아래의 치수도, 씬의 `b.x`·`b.w` 도 안 바뀐다.
 *
 * 상한이 3인 이유: 그 위는 눈으로 안 갈리는데 채우는 픽셀만 제곱으로 는다(DPR 4 면
 * 16배다). 하한이 1인 이유: 0.75 같은 값을 그대로 받으면 버퍼가 설계보다 작아진다.
 */
const MAX_PX = 3;

export function pixelScale(dpr: number): number {
    return Math.min(MAX_PX, Math.max(1, dpr || 1));
}

/**
 * 이 게임이 실제로 그리는 배율. `config.ts` 가 켤 때 한 번 재서 registry 에 넣어 둔다.
 *
 * 매번 `devicePixelRatio` 를 다시 읽지 않는 이유: 창을 다른 모니터로 끌면 그 값이 바뀌는데,
 * 그러면 이미 만들어 둔 글자와 새로 만드는 글자의 배율이 어긋난다.
 */
export function pxOf(scene: Phaser.Scene): number {
    return (scene.game.registry.get("pixelScale") as number) || 1;
}

type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/** px 단위로 적힌 치수를 배율만큼 키운다. 글자 크기·줄바꿈 폭·줄 간격이 여기 걸린다. */
function upscale(style: TextStyle, k: number): TextStyle {
    const out: TextStyle = { ...style };
    if (typeof style.fontSize === "string") out.fontSize = `${parseFloat(style.fontSize) * k}px`;
    else if (typeof style.fontSize === "number") out.fontSize = style.fontSize * k;
    if (style.wordWrap?.width) out.wordWrap = { ...style.wordWrap, width: style.wordWrap.width * k };
    if (style.lineSpacing) out.lineSpacing = style.lineSpacing * k;
    if (style.fixedWidth) out.fixedWidth = style.fixedWidth * k;
    if (style.fixedHeight) out.fixedHeight = style.fixedHeight * k;
    return out;
}

/**
 * 글자를 **물리 픽셀 해상도로** 만든다. 캔버스에 글자를 얹는 자리는 전부 이 함수를 쓴다.
 *
 * Graphics 는 벡터라 카메라를 확대하면 저절로 선명해지지만, Text 는 글자를 텍스처에 한 번
 * 구워서 붙이는 것이라 구울 때의 크기가 곧 화질이다. 12px 로 구운 것을 3배로 늘리면
 * 12px 짜리 선명함밖에 안 나온다.
 *
 * 그래서 **36px 로 굽고 1/3 로 줄여 붙인다.** 화면에 차지하는 크기는
 * `36 × (1/3) × 확대 3 = 36 물리 픽셀` 로 같은데, 텍스처에는 36px 만큼의 획이 들어 있다.
 *
 * Phaser 3 의 `TextStyle.resolution` 이 하던 일인데, Phaser 4 는 그 필드를 안 받는다.
 *
 * 주의: 줄인 뒤에는 `text.height` 가 텍스처의 높이(배율이 곱해진 값)라, 다음 줄의 자리를
 * 잡을 때는 `displayHeight` 를 봐야 한다.
 */
export function mkText(
    scene: Phaser.Scene, x: number, y: number, text: string, style: TextStyle,
): Phaser.GameObjects.Text {
    const k = pxOf(scene);
    if (k === 1) return scene.add.text(x, y, text, style);
    return scene.add.text(x, y, text, upscale(style, k)).setScale(1 / k);
}

export interface Band { x: number; y: number; w: number; h: number }
export interface Bands {
    portrait: boolean;
    /** 로그 — 무슨 일이 있었는지가 쌓이는 채팅창. */
    log: Band;
    chart: Band;
    /** 운용 상황 — 자산·현금·보유·덱·유물, 그리고 손패. */
    firm: Band;
    action: Band;
}

/**
 * 격자를 네 자리로 나눈다.
 *
 * **세로**는 위에서 아래로 넷: 로그 → 차트 → 운용 상황 → 버튼.
 *
 * 위에서 아래로 "무슨 일이 있었나 → 시장은 어떤가 → 나는 어떤 상태인가 → 무엇을 할까"
 * 로 읽힌다. 원핸드 조작이라 아래로 갈수록 손이 닿아야 하는 것이 오는 것과도 맞는다.
 * 로그·상황·버튼이 최소치를 먼저 가져간 뒤 **남는 세로는 전부 차트**로 간다.
 *
 * **가로**는 왼쪽·오른쪽 두 칸. 왼쪽에 읽는 것(로그·차트), 오른쪽에 만지는 것(상황·버튼)을
 * 둔다 — 눕힌 폰은 세로가 280px 뿐이라 넷을 쌓으면 어느 하나도 제 크기가 안 나온다.
 */
export function bandsOf(w: number, h: number): Bands {
    if (w / h < LANDSCAPE_RATIO) {
        // 아래 세 최소치의 합(410)에 차트의 최소(130)를 더하면 세로의 하한(540)과 딱 맞는다.
        // 하나라도 올리면 가장 작은 화면에서 넷째 칸이 화면 밖으로 밀린다.
        //
        // 로그의 비율(0.17)은 **한 번의 매매가 남기는 줄 수**에서 나왔다. 매도 한 번이
        // 네 줄(체결·실현 손익·현금·수수료)이라, 네 줄만 보이면 매매 한 번에 앞이 통째로
        // 밀려 나간다. 다섯에서 일곱 줄이면 턴의 마디와 함께 읽힌다.
        const logH = clamp(h * 0.17, 92, 150);
        const action = clamp(h * 0.20, 128, 180);
        const firm = clamp(h * 0.29, 190, 268);
        const chart = Math.max(130, h - logH - action - firm);
        return {
            portrait: true,
            log: { x: 0, y: 0, w, h: logH },
            chart: { x: 0, y: logH, w, h: chart },
            firm: { x: 0, y: logH + chart, w, h: firm },
            action: { x: 0, y: logH + chart + firm, w, h: action },
        };
    }

    // 오른쪽 칸에는 카드 셋과 버튼 넷이 나란히 들어간다. 왼쪽에 더 주면 그 여덟 개가
    // 전부 좁아져 이름과 라벨이 잘린다 — 차트는 폭이 조금 줄어도 읽힌다.
    const left = Math.round(w * 0.52);
    const right = w - left;
    // 가로에서는 매매 버튼 넷이 **한 줄**로 간다. 폭은 남고 세로는 모자란 자리다.
    const action = clamp(h * 0.28, 76, 110);
    const logH = clamp(h * 0.28, 84, 116);
    return {
        portrait: false,
        log: { x: 0, y: 0, w: left, h: logH },
        chart: { x: 0, y: logH, w: left, h: h - logH },
        firm: { x: left, y: 0, w: right, h: h - action },
        action: { x: left, y: h - action, w: right, h: action },
    };
}

export const PAD = 10;

/** 숫자(0xRRGGBB)는 Graphics 용, 문자열은 Text 용이다. 같은 값을 두 벌로 둔다. */
export const C = {
    bg: 0x0b0f10,
    panel: 0x141c1e,
    panelHi: 0x222e31,
    line: 0x3d5159,
    screen: 0x070c0d,
    up: 0x5cf08f,     // 양봉 — 네온 그린
    down: 0xff6b4a,   // 음봉 — 레드/오렌지
    ink: 0xe9f2ea,
    inkDim: 0x9aada6,
    gold: 0xe3b34a,
    neon: 0x5cf08f,
    danger: 0xff5ec8,
    steel: 0x6fb6ff,  // 방어 — 차가운 파랑
} as const;

export const S = {
    bg: "#0b0f10",
    panel: "#141c1e",
    line: "#3d5159",
    up: "#5cf08f",
    down: "#ff6b4a",
    ink: "#e9f2ea",
    inkDim: "#9aada6",
    gold: "#e3b34a",
    neon: "#5cf08f",
    danger: "#ff5ec8",
    steel: "#6fb6ff",
} as const;

/**
 * 로그 한 줄의 색.
 *
 * 로그가 한 색이면 스무 줄이 쌓인 뒤에는 그냥 회색 벽이다. **행동의 갈래**를 색으로
 * 갈라 두면 훑는 것만으로 "샀고, 수수료를 냈고, 시장이 내렸다" 가 읽힌다. 줄 왼쪽의
 * 작은 색 조각(`chip`)이 글자색과 같은 뜻이라, 글자를 읽기 전에 색이 먼저 온다.
 */
export const LOG = {
    /** 턴이 열렸다. 로그의 마디 — 흐리게 둔다. */
    turn: { ink: S.inkDim, chip: C.line },
    buy: { ink: S.up, chip: C.up },
    sell: { ink: S.down, chip: C.down },
    /** 현금이 얼마에서 얼마가 되었나. */
    cash: { ink: S.ink, chip: C.ink },
    /** 수수료·거래세 — 낸 것도 안 낸 것도 여기로. */
    fee: { ink: S.gold, chip: C.gold },
    /** 카드를 골랐다. */
    card: { ink: S.neon, chip: C.neon },
    /** 유물을 얻었거나 터졌다. */
    relic: { ink: S.gold, chip: C.gold },
    /** 시장이 움직였다. */
    up: { ink: S.up, chip: C.up },
    down: { ink: S.down, chip: C.down },
    /** 덱이 바뀌었다(합성·해금) — 시장과 안 헷갈리게 파랑. */
    system: { ink: S.steel, chip: C.steel },
    /** 손절 발동·자본잠식 같은 나쁜 소식. */
    warn: { ink: S.danger, chip: C.danger },
} as const;

export type LogKind = keyof typeof LOG;

/**
 * 카드 갈래별 색과 표시.
 *
 * 카드가 열두 장이 되면 이름만으로는 안 갈린다. **무엇을 하는 카드인가**(읽는다·건다·
 * 막는다·저주)를 색과 한 글자 표시로 먼저 말해 두면, 손패 셋을 훑는 데 한 호흡이면 된다.
 */
export const LANE = {
    info: { color: C.neon, ink: S.neon, tag: "정보" },
    act: { color: C.gold, ink: S.gold, tag: "집행" },
    guard: { color: C.steel, ink: S.steel, tag: "방어" },
    curse: { color: C.danger, ink: S.danger, tag: "저주" },
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
 * 이 값은 설계 격자 기준이고 화면에서는 `화면폭 / 390` 이 곱해진다.
 *
 * `xs` 가 이 화면 글자의 대부분이다 — 로그 한 줄, 카드의 한 줄 요약, 라벨. 11px 은
 * 폰에서 읽으라고 두기엔 작았다. 12 로 올리고 `sm` 도 한 칸 따라 올렸다.
 */
export const FS = { xs: 12, sm: 14, md: 16, lg: 21, xl: 29, xxl: 42 } as const;

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
