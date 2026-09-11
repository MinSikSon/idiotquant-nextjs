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

/**
 * 두 칸 배치가 값을 하려면 격자 폭이 최소 이만큼은 돼야 한다.
 *
 * 오른쪽 칸에 카드 셋과 버튼 넷이 나란히 선다. 폭 390 짜리 격자를 둘로 쪼개면 버튼 한
 * 칸이 35px 이라 "ALL-IN" 이 테두리를 넘는다 — 그럴 바에는 좁더라도 쌓는 편이 낫다.
 */
const TWO_COL_MIN_W = 560;

/**
 * 세로로 넷을 쌓기에 넉넉한 격자 세로.
 *
 * 버튼 한 줄(64) + 운용 상황(190) + 차트(110) + 로그 두 줄(34) 의 합이다. 이보다 짧아도
 * **쌓기는 한다** — 아래 `bandsOf` 가 운용 상황을 168 까지 줄여 준다. 다만 그때는 두 칸
 * 배치가 더 나은지 먼저 따져 본다.
 *
 * ── 왜 자르지 않는가 ────────────────────────────────────────────
 * 예전에는 세로 격자의 세로를 540 아래로 안 내려가게 **잘랐다.** 그러면 칸이 그보다
 * 낮을 때 격자 비율이 칸의 비율과 어긋나고, Scale.FIT 은 둘 중 작은 쪽에 맞추느라
 * 화면을 줄인다 — 390x338 짜리 칸에서 캔버스가 244 폭으로 줄고 좌우에 73px 씩 검은
 * 띠가 남았다. 자르는 대신 **배치를 바꾸는** 것이 답이다.
 */
const STACK_MIN = 398;

/**
 * 배너 — **두 줄이다.** 위가 제목과 날짜, 아래가 CRT 한 줄(에너지 · 빚).
 *
 * 예전에는 한 줄 40px 이었고 에너지 막대가 회색 위에 그냥 얹혀 있었다. 값을 읽는 자리는
 * 검은 화면 안이라는 규칙이 서면서 막대와 빚이 CRT 한 줄로 들어갔고, 그만큼 커졌다.
 */
const STRIP_H = 52;
/** 여기까지 줄면 CRT 줄을 접고 제목 한 줄만 남는다. */
const STRIP_MIN = 40;
/**
 * 로그가 마지막까지 지키는 한 줄. 여기에 고객 한 줄과 **창 껍데기**가 얹히므로 실제
 * 바닥은 이보다 크다.
 */
const LOG_MIN = 40;
/**
 * 고객 자리 — 누가 앞에 앉았나. 로그 띠의 머리로 들어간다.
 *
 * **두 줄이다.** 이름과 한마디를 한 줄에 붙이면 폭 390 에서 몇 픽셀이 모자라 한마디가
 * 통째로 빠진다 — 그런데 고객을 사람으로 만드는 것이 바로 그 한마디다.
 */
export const CLIENT_ROW = 40;
/**
 * 로그가 가져가는 위 한계.
 *
 * 종목 목록이 화면의 **본체**가 되면서 로그는 조연이 됐다. 안 막아 두면 긴 폰에서
 * 로그가 남는 세로를 다 먹고 목록이 세 줄에 머문다 — 무엇을 고를지가 화면의 일인데.
 *
 * **132 였는데 기록이 두 줄밖에 안 섰다.** 껍데기 29 와 고객 두 줄 40 을 빼면 검은 화면이
 * 63 이고, 줄 하나가 17 이라 두 줄이다. 긴 기록을 자르지 않고 접기 시작한 뒤로는(`wrapCells`)
 * 한 기록이 그 두 줄을 통째로 먹어서, 상장 한 줄이 뜨면 매매 기록이 밀려 나갔다.
 * 네 줄까지 서게 24 를 더 준다 — 이 24 는 남는 세로에서 나오므로 **짧은 격자는 그대로다**
 * (짧으면 `left` 가 이 몫에 닿기 전에 바닥난다).
 */
const LOG_MAX = 156;
/**
 * 고른 종목 판의 바닥값 — **창 껍데기 + 판이 반드시 세우는 넷.**
 *
 * 29(껍데기 — `WIN_CHROME`) + 155(`StockSheet.SHEET_MIN`: 머리·판정·알아본다·체결)。
 *
 * **목록이 여기서 빠졌다.** 예전에는 이 띠가 목록과 판을 나눠 썼는데, 폰에서는 판이
 * 세로의 절반을 먹어 목록에 두세 줄밖에 안 남았다 — 아홉 종목을 견줄 수가 없었다.
 * 목록은 화면 하나를 통째로 쓰는 자리로 나갔다(`components/StockList.ts`).
 */
const MARKET_MIN = 190;

/**
 * 제목 표시줄의 높이. 글자 한 줄과 여백. 그리는 것은 `ui/win95.ts` 다.
 *
 * **치수는 Phaser 를 부르는 파일에 두지 않는다** — 그러면 띠 예산을 재는 테스트가
 * 브라우저 없이 못 돈다. 창 껍데기가 몇 픽셀을 먹는지는 `bandsOf` 의 바닥값이 세는
 * 값이라, 예산과 같은 파일에 있어야 둘이 안 어긋난다.
 */
export const TITLE_H = 20;
/** 창 껍데기가 세로로 먹는 값 — 베벨 위아래 + 제목 표시줄 + 속살까지의 여백. */
export const WIN_CHROME = 2 + 1 + TITLE_H + 2 + 2 + 2;

/**
 * 이 격자를 **넷으로 쌓을 것인가, 두 칸으로 쪼갤 것인가.**
 *
 * `designSize` 와 `bandsOf` 가 같은 답을 내야 한다 — 둘이 갈리면 격자는 두 칸인데
 * 그림은 넷으로 쌓여 화면이 통째로 어긋난다. 그래서 판단은 여기 한 곳에만 둔다.
 */
export function isStacked(w: number, h: number): boolean {
    return !(w >= TWO_COL_MIN_W && w / h >= LANDSCAPE_RATIO);
}

/**
 * 버튼 띠의 바닥값. 버튼 48 + 위아래 16.
 *
 * **두 줄 배치는 없앴다.** 회사 화면의 버튼 넷 중 둘은 다른 둘과 같은 일을 해서
 * (둘 다 시세판을 열고, 둘 다 턴을 넘겼다) 이제 어느 화면도 버튼이 둘을 넘지 않는다.
 * 그래서 이 띠는 한 줄이면 되고, 두 줄에 주던 세로는 차트가 가져간다.
 *
 * **이 값은 제목 표시줄이 없을 때의 바닥이다.** 띠가 이만큼뿐이면 버튼만 놓는다 —
 * 아래 `ACTION_FRAMED_MIN` 참고.
 */
const ACTION_ONE_ROW = 64;

/**
 * 버튼 띠에 **제목 표시줄까지 세우려면** 이만큼은 돼야 한다.
 *
 * 이 띠도 창이다 — 다른 판이 전부 「뉴스」·「주식 현황」·「장부」라고 제 이름을 달고
 * 있는데 버튼만 이름 없는 회색 판이면, 그 자리가 무엇을 하는 곳인지 화면이 말하지
 * 않는다. 그래서 여기에도 「할 일」이라는 이름을 단다.
 *
 * 값은 창 껍데기(29) + 위아래 여백(20) + 손가락이 누를 수 있는 버튼(44)이다. 44 는
 * 48 보다 작지만 아직 엄지로 눌리는 크기다 — 짧은 격자에서 이 몇 픽셀 때문에 제목이
 * 통째로 사라지는 것보다 낫다. **여기에 못 미치면 제목을 접고 옛 모습 그대로 간다.**
 */
export const ACTION_FRAMED_MIN = WIN_CHROME + 20 + 44;

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

    // 세로로 넷을 쌓았을 때의 격자 세로.
    const stackedH = (W * hostH) / hostW;

    if (stackedH >= STACK_MIN && isStacked(W, stackedH)) {
        // 세로 — 폭을 390 으로 고정하고 **세로는 칸의 비율 그대로** 받는다.
        return { width: W, height: Math.round(stackedH), portrait: true };
    }

    // 가로(두 칸) — 이번에는 세로가 짧은 쪽이다. 폰을 눕히면 앱 크롬을 뺀 세로가 280px
    // 남짓뿐이라 되도록 1:1 로 그린다(그래야 글씨가 안 줄어든다). 아래 한계는 띠가
    // 무너지지 않을 최소치, 위 한계는 큰 화면에서 글씨가 지나치게 커지지 않을 최대치다 —
    // 격자가 작을수록 FIT 배율이 커지고 글씨도 같이 커진다.
    //
    // **폭은 안 자른다.** 자르면 격자 비율이 칸과 어긋나 좌우에 검은 띠가 남는다.
    const height = clamp(hostH, 300, 560);
    const width = Math.round((height * hostW) / hostH);
    // 폭이 모자라면 두 칸이 값을 못 한다 — 좁더라도 쌓는 편이 낫다.
    return { width, height, portrait: isStacked(width, height) };
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

/**
 * 회사 화면의 자리 넷. **여덟이었다가 넷이 됐다.**
 *
 * 예전에는 여기에 `place`(장소 정사각) · `chips`(종목 칩 줄) · `chart` 가 더 있었다.
 * 세로 격자에 판이 여덟 개가 서고 저마다 테두리를 가져서, 화면을 보면 **무엇이
 * 중요한지가 없었다** — 전부 같은 무게의 상자였다. 셋을 뺀 이유는 각각 이렇다.
 *
 *   장소 정사각  100px 짜리 그림은 무엇인지 안 보였다. 시세판 여는 길은 버튼에 있다.
 *   종목 칩 줄   다섯 칸인데 종목은 아홉이라 늘 빈 칸이 남았고, 전체 목록은 시세판에 있다.
 *   차트         **시세판 안으로 옮겼다.** 종목을 고를 때 보는 것이지, 늘 떠 있을 것이 아니다.
 *
 * 남은 넷은 각각 한 가지만 말한다. 그리고 화면이 90년대 윈도우가 되면서 **가운데 둘은
 * 창이 됐다** — 제목 표시줄이 그 창이 무엇을 말하는지를 적는다.
 *
 *   strip   배너            언제이고 내가 어떤가 — 「IMF」 · 연·반기·턴 · 에너지 · 빚
 *   log     창 「뉴스」      무슨 일이 있었나 — 고객 한 줄 + 1인칭 기록
 *   market  창 「주식 현황」  **무엇을 고를까** — 종목 목록 + 고른 종목 판
 *   action  버튼            무엇을 할까 — 「하루를 넘긴다」
 *
 * 창이 둘뿐인 것은 셈이 아니라 규칙이다. 참고한 그 시절 화면에는 창이 예닐곱씩 떠
 * 있었지만, 그건 사람이 스스로 연 창이다. 이 게임은 화면이 창을 대신 세우므로 **세우는
 * 쪽이 개수를 책임진다** — 판 여덟이 화면을 망가뜨린 것이 그리 오래되지 않았다.
 *
 * `market` 이 화면의 **본체**다. 예전에는 종목 목록이 「시세판」이라는 별도 화면에
 * 있었고 회사 화면에는 손패가 있었다. 그래서 종목을 고르려면 버튼을 눌러 화면을
 * 옮기고 → 줄을 눌러 판을 열고 → 다시 눌러 체결하는 세 단계였고, **애초에 종목을
 * 골라야 하는지조차 화면에 안 적혀 있었다.** 목록이 늘 떠 있으면 그 질문이 사라진다.
 */
export interface Bands {
    portrait: boolean;
    strip: Band;
    log: Band;
    market: Band;
    action: Band;
}

/* ── 넷을 어떻게 나누는가 ──────────────────────────────────────────
   격자 세로는 기기 비율에서 오므로 `STACK_MIN`(398) 까지 짧아질 수 있다. 그래서
   **양보하는 순서**를 정해 둔다. 뒤로 갈수록 먼저 줄어든다:

     버튼 · 종목 목록   안 줄인다 — 없으면 판이 안 굴러간다
     챕터 띠            40 → 28. 에너지와 빚은 늘 보여야 하니 조금만
     로그               74 → 120 사이. 남는 것은 목록이 가져간다

   판이 넷뿐이라 예전처럼 무엇을 통째로 버릴 일이 없다 — 칩 줄을 0 으로 만들고 씬이
   그 사실을 다시 확인하던 분기(`chips.h <= 0`)도 같이 사라졌다. */

export function bandsOf(w: number, h: number): Bands {
    if (isStacked(w, h)) return stackedBands(w, h);
    return splitBands(w, h);
}

function stackedBands(w: number, h: number): Bands {
    // **채우는 순서 = 중요한 순서.** 없으면 판이 안 굴러가는 것부터 제 몫을 가져가고,
    // 남는 만큼만 로그가 자란다. 그래서 격자가 아무리 짧아도 음수가 안 나온다.
    let left = Math.max(0, h);
    const take = (want: number): number => {
        const got = Math.min(Math.max(0, want), left);
        left -= got;
        return got;
    };

    // 0.11 → 0.14. 제목 표시줄이 먹는 29px 만큼 띠를 키운다 — 안 키우면 폰에서
    // 버튼이 43px 로 눌려 제목을 단 대가를 손가락이 치른다.
    //
    // **0.13 이 아니라 0.14 인 이유**: 격자 세로 700(360×646 같은 옛 안드로이드)에서
    // 0.13 은 91px 을 내는데 제목이 서려면 93 이 필요하다. 두 픽셀 때문에 흔한 폰 한
    // 무리가 통째로 이름 없는 회색 판으로 떨어졌다. `test/game-layout.test.ts` 가 이
    // 경계를 붙잡는다.
    const action = take(clamp(h * 0.14, ACTION_ONE_ROW, 112));
    let market = take(MARKET_MIN);
    let strip = take(STRIP_MIN);
    let log = take(LOG_MIN + CLIENT_ROW);
    // 배너의 CRT 줄 — 여기까지 채워져야 에너지와 빚이 검은 화면 안으로 들어간다.
    strip += take(STRIP_H - STRIP_MIN);

    // 로그는 제 크기까지만 자라고, **남는 세로는 전부 목록이 가져간다.**
    log += take(LOG_MAX - (LOG_MIN + CLIENT_ROW));
    market += take(left);

    let y = 0;
    const strip_ = { x: 0, y, w, h: strip }; y += strip;
    const log_ = { x: 0, y, w, h: log }; y += log;
    const market_ = { x: 0, y, w, h: market }; y += market;
    // 한 픽셀도 남거나 넘지 않게 — 합은 언제나 정확히 h 다.
    const action_ = { x: 0, y, w, h: Math.max(0, h - y) };

    return { portrait: true, strip: strip_, log: log_, market: market_, action: action_ };
}

function splitBands(w: number, h: number): Bands {
    // **왼쪽이 목록이다.** 화면의 본체가 넓은 쪽을 가져간다. 오른쪽에 읽는 것(로그)과
    // 「다음 턴」을 쌓는다 — 눕힌 폰은 세로가 300px 남짓이라 넷을 쌓으면 어느 하나도
    // 제 크기가 안 나온다.
    const left = Math.round(w * 0.58);
    const right = w - left;
    const strip = clamp(h * 0.14, STRIP_MIN, STRIP_H);
    // **0.28 이다.** 0.26 은 격자 세로 353(눕힌 폰에서 페이지 크롬을 뺀 실제 칸)에서
    // 92px 을 내는데 제목이 서려면 93 이 필요하다 — 한 픽셀 차이로 접혔다.
    // 뷰포트가 아니라 **캔버스가 실제로 받는 칸**으로 재야 이 경계가 보인다.
    const action = clamp(h * 0.28, ACTION_ONE_ROW, 108);

    return {
        portrait: false,
        strip: { x: 0, y: 0, w, h: strip },
        market: { x: 0, y: strip, w: left, h: h - strip },
        log: { x: left, y: strip, w: right, h: h - strip - action },
        action: { x: left, y: h - action, w: right, h: action },
    };
}

export const PAD = 10;

/* ── 팔레트 — 1997년의 사무실 컴퓨터 ────────────────────────────────
   여기까지 오는 데 한 번 갈아엎었다. 예전 팔레트는 짙은 청록 터미널이었다 — 요즘 앱처럼
   생긴 화면이라 **연도가 화면에 없었다.** 이 게임은 1997년 증권사 객장인데.

   지금은 90년대 한국 PC 통신·주식 프로그램의 화면이다. 은회색 3D 패널, 남색 제목
   표시줄, 그 안에 박힌 검은 CRT, 그 위를 굴러가는 형광 초록·빨강 숫자.

   **바탕이 둘이라 글자색도 둘이다.** 이 팔레트에서 제일 자주 틀리는 자리다:

     회색 면 위   `faceInk` / `faceDim` — **검은 글자다.** 그 시절 윈도우가 그랬다
     검은 화면 위 `ink` / `inkDim` — 밝은 글자. 값을 읽는 자리는 전부 여기다
     남색 위      `barInk` — 흰 글자. 제목 표시줄과 배너

   `ink` 를 회색 면에 얹으면 흰 글자가 은색에 잠기고, `faceInk` 를 CRT 에 얹으면
   검은 글자가 통째로 사라진다. 어느 바탕 위인지를 먼저 보고 고른다. */

/** 숫자(0xRRGGBB)는 Graphics 용, 문자열은 Text 용이다. 같은 값을 두 벌로 둔다. */
export const C = {
    /** 책상 — 창 뒤에 남는 바탕. */
    bg: 0x5a6068,
    /** 창의 면 — 90년대 윈도우의 그 은회색. */
    panel: 0xc3c7cb,
    /** 한 단 밝은 면 — 기본 단추. */
    panelHi: 0xd6dade,
    /** 한 단 어두운 면 — 못 누르는 것과 홈. */
    panelLo: 0x9a9ea3,
    /** 밝은 모서리(위·왼쪽). 뒤집히면 튀어나온 것이 들어간 것이 된다. */
    lit: 0xffffff,
    /** 어두운 모서리(아래·오른쪽). */
    line: 0x6d7276,
    /** 제일 어두운 선 — 바깥 테두리와 기본 단추의 테. */
    edge: 0x3b3f42,
    /** 제목 표시줄. */
    bar: 0x0a246a,
    /** 제목 표시줄의 밝은 쪽 — 그 시절 그러데이션의 흔적. */
    barLit: 0x2b6fd0,
    /** 배너 바탕 — 제목 표시줄보다 짙다. */
    banner: 0x101a44,
    /** 창 안의 검은 화면. **값을 읽는 자리는 전부 이 안이다.** */
    screen: 0x06090a,
    /** CRT 안의 격자선. 회색 면의 모서리(`line`)를 여기 쓰면 검은 화면에서 너무 밝다. */
    grid: 0x1a2a24,
    up: 0x3cff8e,     // 양봉 — 형광 초록
    down: 0xff5a5a,   // 음봉 — 형광 빨강
    ink: 0xd6e6dd,    // **검은 화면 위** 글자
    inkDim: 0x7d8f88,
    gold: 0xffd24a,
    neon: 0x3cff8e,
    danger: 0xff5ec8,
    steel: 0x5fd8ff,
} as const;

export const S = {
    bg: "#5a6068",
    panel: "#c3c7cb",
    line: "#6d7276",
    up: "#3cff8e",
    down: "#ff5a5a",
    /** **검은 화면 위** 글자. 밝다. */
    ink: "#d6e6dd",
    inkDim: "#7d8f88",
    /** **회색 면 위** 글자. 검다. */
    faceInk: "#101418",
    faceDim: "#4a5056",
    /** **남색 위** 글자 — 제목 표시줄과 배너. */
    barInk: "#ffffff",
    /** 배너의 붉은 제목. 그 시절 게임 화면의 제목이 이 색이었다. */
    title: "#ff5a3c",
    gold: "#ffd24a",
    neon: "#3cff8e",
    danger: "#ff5ec8",
    steel: "#5fd8ff",
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
 * 버튼의 상태. **색이 아니라 면의 생김새가 셋을 가른다.**
 *
 * 여태 두 번 고쳤다. 처음에는 밝은 회색 두 가지를 짙은 화면에 얹었고(팔레트 밖의 색이라
 * 화면과 아무 관계가 없었다), 다음에는 면을 다 같게 두고 **초록 테두리**로 주된 것을
 * 가렸다. 그 둘 다 어두운 화면 위에서의 궁리였다.
 *
 * 지금은 화면이 90년대 윈도우고, 그 시절 버튼은 셋을 이렇게 갈랐다.
 *
 *   primary  면이 한 단 밝고 **검은 테를 한 겹 두른다** — 대화상자의 기본 단추
 *   normal   그냥 튀어나온 회색 버튼
 *   off      면이 **가라앉는다**(베벨이 뒤집힌다). 글자가 면에 잠긴다
 *
 * 색으로 소리치지 않는데도 셋이 한눈에 갈린다. 그리고 형광 초록은 CRT 안으로 물러나
 * **값을 읽는 자리에만** 남는다 — 화면에 초록이 하나뿐이라는 규칙이 여기서 지켜진다.
 */
export const BTN = {
    /** **지금 눌러야 하는 것.** 면이 밝고 검은 테가 한 겹 더 있다. */
    primary: { face: C.panelHi, ink: S.faceInk, sub: "#3d4348", ring: true, sunken: false },
    /** **눌러도 되지만 주된 것이 아니다.** 여느 회색 버튼. */
    normal: { face: C.panel, ink: S.faceInk, sub: S.faceDim, ring: false, sunken: false },
    /** **못 누른다.** 면이 가라앉고 글자가 잠긴다. 부제가 왜 못 누르는지를 말한다. */
    off: { face: C.panelLo, ink: "#7d8288", sub: "#8b9096", ring: false, sunken: true },
} as const;

export type BtnSkin = typeof BTN[keyof typeof BTN];

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

/**
 * 글자 하나가 차지하는 **칸.** 한글은 고정폭 글꼴에서도 라틴 문자의 두 배다.
 *
 * 그래서 글자 수로 폭을 세면 한글 줄만 칸을 넘는다 — `IBM Plex Mono` 에서 「하루를
 * 넘긴다」는 일곱 글자인데 라틴 열넷 자리를 먹는다.
 */
const cellOf = (ch: string) => (ch.charCodeAt(0) > 0x1100 ? 2 : 1);

/** 이 글이 몇 칸인가. */
export function cells(s: string): number {
    let n = 0;
    for (const ch of s) n += cellOf(ch);
    return n;
}

/**
 * `room` 칸에 맞춰 **여러 줄로 접는다.** 자르지 않는다 — 부르는 쪽이 줄을 여럿 그린다.
 *
 * ── 왜 자르는 것을 그만뒀나 ──────────────────────────────────
 * 로그는 한 줄이 칸을 넘으면 끝을 「…」로 잘랐다. 「한 줄은 한 줄이어야 줄 수를 셀 수
 * 있고, 그래야 되감기가 줄 단위로 잡힌다」는 이유였는데, **잘린 쪽이 대개 값이었다** —
 * 「현대전자에게 240주를 권했다. 근거는 「반도체…」 처럼, 무엇을 근거로 권했는지가
 * 통째로 사라진다. 로그는 그것을 보라고 있는 자리다.
 *
 * 접어도 줄 수는 여전히 셀 수 있다. 세는 단위가 **기록 하나에서 줄 하나로** 바뀔 뿐이다.
 *
 * 낱말 경계에서 끊는다. 낱말 하나가 한 줄보다 길면(긴 종목명·자릿수 많은 금액) 거기서
 * 끊는다 — 안 그러면 그 줄만 칸을 넘는다.
 */
export function wrapCells(s: string, room: number): string[] {
    if (room < 2) return [s];
    const out: string[] = [];
    let line = "";
    const flush = () => { if (line !== "") { out.push(line.trimEnd()); line = ""; } };

    const words = s.split(" ");
    for (let i = 0; i < words.length; i++) {
        // 공백은 앞 낱말에 달려 온다. 줄 끝으로 밀리면 `trimEnd` 가 걷어 간다.
        let w = i === words.length - 1 ? words[i] : `${words[i]} `;
        if (cells(line) + cells(w) > room) flush();
        while (cells(w) > room) {
            let used = 0;
            let n = 0;
            for (const ch of w) {
                if (used + cellOf(ch) > room) break;
                used += cellOf(ch);
                n += ch.length;
            }
            out.push(w.slice(0, n));
            w = w.slice(n);
        }
        line += w;
    }
    flush();
    return out.length > 0 ? out : [""];
}

/** "+3.20%" 처럼 부호를 붙인다. */
export function pct(v: number): string {
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

/**
 * 금액의 자리 이름. **큰 것부터** 늘어놓는다 — `money` 가 위에서부터 훑는다.
 *
 * 자금이 판을 넘어 이어지므로 잘 굴리면 억을 넘어 조까지 간다. 경은 거의 안 볼 자리지만
 * 한 줄이면 되는 것이라 막아 둔다 — 없으면 `12345678억` 같은 것이 화면에 남는다.
 */
const SCALES = [
    { at: 10_000_000_000_000_000, name: "경" },
    { at: 1_000_000_000_000, name: "조" },
    { at: 100_000_000, name: "억" },
    { at: 10_000, name: "만" },
] as const;

/**
 * 화면 폭에 맞는 짧은 금액 표기. 1,234만 / 1억 2,340만 / 3조 5,000억
 *
 * **윗자리 둘까지만 적는다.** 조 단위에서 만까지 붙이면 "3조 5,000억 1,234만" 이 되어
 * 한 줄이 통째로 숫자가 되는데, 그 아랫자리는 판을 정할 때 아무 값도 안 한다.
 */
export function money(v: number): string {
    const n = Math.round(v);
    const neg = n < 0 ? "-" : "";
    const a = Math.abs(n);

    const i = SCALES.findIndex(s => a >= s.at);
    if (i < 0) return `${neg}${a.toLocaleString()}`;

    const top = SCALES[i]!;
    const next = SCALES[i + 1];
    const head = Math.floor(a / top.at);
    const rest = next ? Math.floor((a % top.at) / next.at) : 0;
    return `${neg}${head.toLocaleString()}${top.name}${rest ? ` ${rest.toLocaleString()}${next!.name}` : ""}`;
}

/**
 * **주가는 줄이지 않는다.** `money` 를 그대로 쓰면 12,081 이 「1만」이 되어, 5,438 짜리
 * 옆에 서면 한쪽만 자리 수가 다르다 — 시세판 한 줄에서 실제로 그랬다(「1만 / 5,438 / 2만」).
 * 주가는 다섯 자리라 다 적어도 칸에 들어가고, 다 적어야 비교가 된다.
 */
export function price(v: number): string {
    return Math.round(v).toLocaleString();
}

/** 오르면 초록, 내리면 주황. 이 게임은 네온 팔레트라 한국 시장색(빨강/파랑)을 안 쓴다. */
export function tone(v: number): string {
    return v > 0 ? S.up : v < 0 ? S.down : S.inkDim;
}

/* ── 눌림 ─────────────────────────────────────────────────────── */

/** 눌린 동안 덮는 그늘의 진하기. */
const PRESS_SHADE = 0.32;
/** 눌린 동안 내려가는 픽셀. 손가락 밑에서 실제로 들어가는 느낌이 난다. */
const PRESS_DROP = 2;

export interface Pressable {
    /** 입력을 받는 판. 컨테이너에 넣을 때는 이것도 같이 넣는다. */
    zone: Phaser.GameObjects.Zone;
    /** 눌린 표시. **버튼 위에 그려져야 하므로 얼굴·글자 뒤에 추가할 것.** */
    shade: Phaser.GameObjects.Graphics;
}

/**
 * 누를 수 있는 자리에 **눌린 표시**를 붙인다.
 *
 * 이 게임은 캔버스라 브라우저가 해 주는 것이 하나도 없다 — `:active` 도 hover 도 없다.
 * 그래서 눌렀는지 안 눌렸는지가 화면에 전혀 안 나타났고, 반응이 없으면 사람은 두 번
 * 누른다. 눌린 동안 **그늘을 덮고 2px 내린다.**
 *
 * 손을 뗄 때가 아니라 **누를 때** 표시가 나야 한다. 그래서 `pointerdown` 에서 켜고,
 * 뗄 때(`pointerup`) 실행한다. 누른 채로 밖으로 빠져나가면 **실행하지 않고 되돌린다** —
 * 잘못 눌렀을 때 빠져나가 취소하는 것은 사람이 기대하는 동작이다.
 *
 * @param move 눌릴 때 같이 내려갈 것들(얼굴·글자). 비우면 그늘만 덮는다 —
 *   칩이나 그림처럼 넓은 면은 내리면 오히려 어색하다.
 * @param canTap 실행 직전에 한 번 더 묻는다. 시세판은 이걸로 "끌었으면 누른 것이
 *   아니다" 를 판정한다.
 */
export function pressable(
    scene: Phaser.Scene,
    x: number, y: number, w: number, h: number,
    move: Phaser.GameObjects.GameObject[],
    onTap: () => void,
    canTap: () => boolean = () => true,
): Pressable {
    const shade = scene.add.graphics();
    shade.fillStyle(0x000000, PRESS_SHADE).fillRect(x, y, w, h);
    shade.setVisible(false);

    let down = false;
    const shift = (dy: number) => {
        for (const o of move) (o as unknown as { y: number }).y += dy;
        shade.y += dy;
    };
    const press = () => {
        if (down) return;
        down = true;
        shade.setVisible(true);
        shift(PRESS_DROP);
    };
    const release = (fire: boolean) => {
        if (!down) return;
        down = false;
        shade.setVisible(false);
        shift(-PRESS_DROP);
        if (fire && canTap()) onTap();
    };

    const zone = scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", press);
    zone.on("pointerup", () => release(true));
    zone.on("pointerout", () => release(false));
    zone.on("pointerupoutside", () => release(false));

    return { zone, shade };
}

/* ── 세로로 쌓는 덩이의 셈 ──────────────────────────────────────
   장부 화면이 덩이(맡은 돈 · 얻은 돈 · 지갑 · 갚을 돈)를 세로로 쌓을 때 쓰는 산수만
   떼어 둔 것이다. Phaser 를 안 부르므로 브라우저 없이 테스트가 된다.

   **왜 떼어 냈나.** 여기서 사이(gap)의 개수를 한 번 잘못 셌다 — 연대기 띠 뒤에도
   사이가 하나 붙는데 그것을 안 세서, 남는 세로를 나눌 때 예산 밖에서 사이가 생기고
   마지막 덩이가 버튼 띠 밑으로 밀려 잘렸다. 덩이가 셋일 때는 여유에 묻혀 있다가
   지갑이 들어와 넷이 되면서 드러났다. **스크린샷으로는 그때그때만 잡히는 고장**이라
   셈을 값으로 만들어 테스트가 붙잡게 한다. */

export const STACK = { ROW: 20, HEAD: 18, INNER: 6, GAP: 9, GAP_MAX: 34 } as const;

/** 덩이 하나가 먹는 세로. 머리줄 + 줄들 + 검은 화면의 안쪽 여백. */
export function blockH(rows: number): number {
    return STACK.HEAD + rows * STACK.ROW + STACK.INNER * 2;
}

/**
 * 덩이 사이가 몇 군데인가. **덩이 사이만이 아니다** — 머리(연대기 띠)가 있으면
 * 그 뒤에도 하나 붙는다.
 */
export function stackGaps(blocks: number, headH: number): number {
    return Math.max(0, blocks - 1) + (headH > 0 ? 1 : 0);
}

/** 이 줄 수로 쌓으면 세로를 얼마나 먹는가(사이는 기본 폭으로 센다). */
export function stackH(rowCounts: readonly number[], headH: number): number {
    const sum = rowCounts.reduce((a, n) => a + blockH(n), 0);
    return sum + STACK.GAP * stackGaps(rowCounts.length, headH) + headH;
}

export interface StackPlan {
    /** 실제로 쓸 사이 폭. 남는 세로를 나눠 가진 값이다. */
    gap: number;
    /** 그 사이 폭으로 쌓았을 때 통째로 먹는 세로. */
    used: number;
    /** 맨 위 덩이가 시작하는 y(칸 위쪽 기준 상대값). */
    top: number;
}

/**
 * 남는 세로를 나눠 가진 뒤의 배치. **`used` 는 절대 `room` 을 넘지 않는다** —
 * 넘으면 마지막 덩이가 화면 밖으로 밀린다.
 */
export function stackPlan(rowCounts: readonly number[], headH: number, room: number): StackPlan {
    const gaps = stackGaps(rowCounts.length, headH);
    const base = stackH(rowCounts, headH);
    const spare = Math.max(0, room - base);
    const gap = STACK.GAP + Math.min(STACK.GAP_MAX, Math.floor(spare / Math.max(1, gaps)));
    const used = base - STACK.GAP * gaps + gap * gaps;
    return { gap, used, top: Math.max(0, Math.floor((room - used) / 2)) };
}

/**
 * 이미 만들어 둔 글자의 크기를 바꾼다. **`setFontSize` 를 직접 부르지 말 것.**
 *
 * ── 왜 이 함수가 있나 ──────────────────────────────────────
 * `mkText` 는 선명하게 그리려고 글자를 `k` 배 크기로 굽고 `1/k` 로 줄여 붙인다. 그래서
 * 나중에 `setFontSize(10)` 을 부르면 구워진 크기가 10 이 되고, 거기에 `1/k` 가 곱해져
 * **화면에는 10/k 로 나온다** — DPR 3 폰에서 3.3px 이다.
 *
 * 칸에 안 들어가는 글자를 줄이는 자리마다 이 일이 벌어지고 있었다. 「10px 아래로는 안
 * 줄인다」는 바닥값이 실제로는 3.3px 을 막지 못했고, 버튼 부제가 옆 칸의 부제보다
 * 눈에 띄게 작게 나왔다 — 폰에서만 그랬고 데스크톱(k=1)에서는 멀쩡했다.
 *
 * @param px 화면에 **실제로 보일** 크기.
 */
export function setSize(scene: Phaser.Scene, t: Phaser.GameObjects.Text, px: number): void {
    t.setFontSize(px * pxOf(scene));
}

/** 글자를 칸에 맞춰 줄일 때의 바닥. 이보다 작으면 읽는 것이 아니라 보이기만 한다. */
export const MIN_FS = 10;
