// 90년대 사무실 — **창과 베벨.**
//
// 참고한 것은 90년대 한국 PC 통신·주식 프로그램의 화면이다. 회색 3D 패널, 남색 제목
// 표시줄, 그 안에 박힌 검은 CRT 화면, 그 위를 굴러가는 형광 초록·빨강 숫자.
//
// ── 왜 이 껍데기인가 ────────────────────────────────────────────
// 이 게임은 1997년 증권사 객장이다. 그런데 화면은 요즘 앱처럼 생긴 짙은 청록 터미널
// 이었다 — 시대가 화면에 없었다. 창과 베벨은 장식이 아니라 **연도를 말하는 장치**다.
//
// ── 규칙 셋 ────────────────────────────────────────────────────
//   1. 면은 은회색 하나(`C.panel`). 밝은 모서리는 위·왼쪽, 어두운 모서리는 아래·오른쪽.
//      **이 방향이 뒤집히면 튀어나온 것이 들어간 것이 된다** — 눌린 표시가 그것이다.
//   2. 값을 읽는 자리는 **검은 화면**(`crt`)이다. 회색 면 위에 숫자를 얹지 않는다.
//      숫자는 모니터 안에 있고 모니터는 책상 위에 있다.
//   3. 제목 표시줄은 **남색**이고 글자는 흰색이다. 창 하나가 한 가지만 말한다.
//
// ── 색은 여기서 정하지 않는다 ──────────────────────────────────
// 이 파일에는 팔레트가 없다. 전부 `ui/theme.ts` 의 `C`·`S`·`BTN` 에서 온다 — 한때
// 여기에 껍데기 전용 색표를 따로 뒀는데, 그러면 같은 은회색이 두 이름으로 두 군데
// 있게 되고 어느 날 한쪽만 바뀐다. 이 파일이 아는 것은 **모양**뿐이다.
//
// 여기 있는 것은 전부 **그리기만 한다** — 부르는 쪽이 받은 것을 `keep()` 에 넣는다.

import Phaser from "phaser";
import { BTN, C, FS, S, TITLE_H, fontOf, mkText, type Band, type BtnSkin } from "./theme";

export { TITLE_H };
/** 베벨의 두께. 2px 이 그 시절의 값이다 — 1px 은 얇아서 3D 로 안 보인다. */
const B = 2;
/**
 * 제목 표시줄 그러데이션의 한 칸.
 *
 * 여덟 칸으로 냈더니 **여덟 개의 띠**가 보였다 — 그러데이션이 아니라 색을 이어 붙인
 * 것으로 읽힌다. 2px 이면 그 시절 화면의 결과 비슷하면서 띠가 안 보인다.
 */
const STEP = 2;

/**
 * 3D 베벨 상자 하나.
 *
 * @param sunken 들어간 것으로 그린다(홈·눌린 버튼·못 누르는 버튼). 모서리가 뒤집힌다.
 */
export function bevel(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number,
    opts: { face?: number; sunken?: boolean } = {},
): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    const face = opts.face ?? C.panel;
    const tl = opts.sunken ? C.line : C.lit;
    const br = opts.sunken ? C.lit : C.line;

    g.fillStyle(face, 1).fillRect(x, y, w, h);
    // 위·왼쪽
    g.fillStyle(tl, 1).fillRect(x, y, w, B).fillRect(x, y, B, h);
    // 아래·오른쪽
    g.fillStyle(br, 1).fillRect(x, y + h - B, w, B).fillRect(x + w - B, y, B, h);
    return g;
}

/** 창 안의 **검은 화면.** 값을 읽는 자리는 전부 이 안에 있다. */
export function crt(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number,
): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    g.fillStyle(C.screen, 1).fillRect(x, y, w, h);
    // 안쪽으로 파인 테두리 — 모니터가 패널에 박혀 있는 느낌.
    g.fillStyle(C.line, 1).fillRect(x, y, w, 1).fillRect(x, y, 1, h);
    g.fillStyle(C.lit, 1).fillRect(x, y + h - 1, w, 1).fillRect(x + w - 1, y, 1, h);
    return g;
}

export interface WinFrame {
    /** 그려 낸 것들. 부르는 쪽이 전부 `keep()` 에 넣는다. */
    parts: Phaser.GameObjects.GameObject[];
    /** 제목 표시줄 아래의 **속살.** 내용은 여기 안에만 그린다. */
    body: Band;
    /** 제목 표시줄. */
    bar: Band;
}

/**
 * 창 하나 — 베벨 + 남색 제목 표시줄.
 *
 * **제목 표시줄에 `_ □ ×` 를 그리지 않는다.** 그 시절 화면에는 있었지만 눌러도 아무
 * 일이 없는 버튼을 셋이나 세우는 셈이다. 이 게임에서 창은 사람이 연 것이 아니라 화면이
 * 세운 것이라, 닫을 수도 최소화할 수도 없다.
 *
 * @param note 제목 표시줄 오른쪽에 붙는 한마디. 그 시절 프로그램이 파일 이름이나 접속
 *   상태를 여기 적었다. 이 게임에서는 계좌와 근거가 든다 — 늘 보여야 하지만 **판을
 *   하나 더 세울 값어치는 없는** 것들이다.
 */
export function winFrame(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number,
    title: string, note?: { text: string; color?: string },
): WinFrame {
    const parts: Phaser.GameObjects.GameObject[] = [];
    parts.push(bevel(scene, x, y, w, h));

    const barX = x + B + 1;
    const barY = y + B + 1;
    const barW = w - B * 2 - 2;
    const g = scene.add.graphics();
    g.fillStyle(C.bar, 1).fillRect(barX, barY, barW, TITLE_H);
    // 왼쪽에서 오른쪽으로 옅어지는 그러데이션 — 그 시절 제목 표시줄이 그랬다.
    // **계단으로 낸다.** 한 번에 반만 밝게 칠하면 한가운데에 뚜렷한 경계가 서서
    // 그러데이션이 아니라 두 색을 이어 붙인 것으로 보인다 — 실제로 그랬다.
    const lit = Math.round(barW * 0.62);
    for (let dx = 0; dx < lit; dx += STEP) {
        g.fillStyle(C.barLit, 0.55 * (1 - dx / lit)).fillRect(barX + dx, barY, STEP, TITLE_H);
    }
    parts.push(g);

    const f = fontOf(scene);
    const cy = barY + TITLE_H / 2;
    const titleT = mkText(scene, barX + 6, cy, title, {
        fontFamily: f, fontSize: `${FS.xs}px`, color: S.barInk,
    }).setOrigin(0, 0.5);
    parts.push(titleT);

    if (note) {
        // **제목을 밀어내지 않게 남는 폭 안에서만 적는다.** 제목이 잘리면 그 창이
        // 무엇인지가 없어지는데, 오른쪽 한마디는 없어도 창은 창이다.
        const room = barW - 12 - titleT.displayWidth - 8;
        const t = mkText(scene, barX + barW - 6, cy, note.text, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: note.color ?? S.barInk,
        }).setOrigin(1, 0.5);
        if (t.displayWidth > room) t.destroy(); else parts.push(t);
    }

    const top = barY + TITLE_H + 2;
    return {
        parts,
        body: { x: x + B + 2, y: top, w: w - B * 2 - 4, h: Math.max(0, y + h - B - 2 - top) },
        bar: { x: barX, y: barY, w: barW, h: TITLE_H },
    };
}

/**
 * 90년대 버튼 하나의 **면.** 글자는 부르는 쪽이 얹는다.
 *
 * 상태 셋의 생김새는 `BTN`(`ui/theme.ts`) 이 정하고 여기는 그대로 그린다 — 어느 쪽이
 * 「지금 눌러야 하는 것」인지는 화면 전체의 문제라 한 곳에서만 정해야 한다.
 */
export function btnFace(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number, skin: BtnSkin,
): Phaser.GameObjects.Graphics[] {
    const out: Phaser.GameObjects.Graphics[] = [];
    if (skin.ring) {
        // 기본 단추의 검은 테 한 겹. 그 시절 대화상자가 이것 하나로 「이게 기본이다」를
        // 말했다 — 색으로 소리치지 않고.
        const ring = scene.add.graphics();
        ring.lineStyle(1, C.edge, 1).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        out.push(ring);
        out.push(bevel(scene, x + 2, y + 2, w - 4, h - 4, { face: skin.face }));
    } else {
        out.push(bevel(scene, x, y, w, h, { face: skin.face, sunken: skin.sunken }));
    }
    return out;
}

/** 못 누르는 버튼도 상태에 맞는 껍데기를 쓰게. */
export function skinOf(on: boolean, primary: boolean): BtnSkin {
    return !on ? BTN.off : primary ? BTN.primary : BTN.normal;
}

/* ── 주사위 ────────────────────────────────────────────────────
   판정을 눈으로 보여 주는 자리(`core/check.ts`). 숫자만 적어도 규칙은 돌아가지만,
   **굴렸다는 사실이 화면에 없으면 실패가 그냥 「안 됐다」로 읽힌다** — 무엇이 정했는지
   모르니 억울하기만 하고 다음에 무엇을 바꿔야 할지가 안 남는다.

   그래서 눈을 그린다. 한 칸은 작지만 1~6 이 한눈에 갈린다. */

/**
 * 주사위 한 알의 한 변.
 *
 * **19 다.** 처음에 15 로 뒀더니 눈이 뭉개져 5 와 6 이 안 갈렸다 — 지름 4px 짜리 점을
 * 5px 간격에 놓으면 서로 붙어 사선 하나로 보인다. 눈 셋이 한 줄에 서려면
 * `3(여백) + 3 + 2 + 3 + 2 + 3 + 3(여백) = 19` 가 필요하다.
 */
export const DIE = 19;

/** 눈 하나의 한 변. **동그라미가 아니라 네모다** — 이 크기에서는 네모가 훨씬 또렷하다. */
const PIP = 3;
/** 면의 가장자리 여백. */
const PIP_EDGE = 3;

/** 눈의 자리 — 3×3 격자의 어느 칸에 점이 찍히는가. */
const PIPS: Record<number, ReadonlyArray<readonly [number, number]>> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

/**
 * 주사위 한 알. **흰 면에 검은 눈** — 그 시절 화면에서도 주사위는 주사위였다.
 *
 * @param value 1~6. 범위를 벗어나면 빈 면을 그린다(고장을 숨기지 않는다).
 */
export function die(
    scene: Phaser.Scene, x: number, y: number, value: number, size = DIE,
): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    // 튀어나온 단추와 같은 3D 테 — 이 화면의 모든 면이 그렇게 생겼다.
    g.fillStyle(0xf2f4f6, 1).fillRect(x, y, size, size);
    g.fillStyle(C.lit, 1).fillRect(x, y, size, B).fillRect(x, y, B, size);
    g.fillStyle(C.line, 1).fillRect(x, y + size - B, size, B).fillRect(x + size - B, y, B, size);

    // 자리는 면 크기를 따라간다 — 다른 크기로 그려도 눈이 안 뭉친다.
    const edge = Math.max(2, Math.round((size * PIP_EDGE) / DIE));
    const pip = Math.max(2, Math.round((size * PIP) / DIE));
    const step = (size - edge * 2 - pip) / 2;
    g.fillStyle(0x1b1f22, 1);
    for (const [cx, cy] of PIPS[value] ?? []) {
        g.fillRect(Math.round(x + edge + cx * step), Math.round(y + edge + cy * step), pip, pip);
    }
    return g;
}
