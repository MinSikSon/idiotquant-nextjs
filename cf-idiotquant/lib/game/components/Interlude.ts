// 전환 — **장소가 바뀌었다는 것을 화면이 말하는 자리.**
//
// 여태는 `this.place = "office"; this.redraw()` 한 줄이면 다음 프레임에 이미 다른
// 장소였다. 집에서 나가는 것도 공원에서 눈을 감는 것도 화면상으로는 같은 다시 그리기라,
// 흐름이 있다는 것 자체가 안 보였다.
//
// ── 왜 대화상자인가 ────────────────────────────────────────────
// 화면이 90년대 윈도우가 되면서 이 막도 그 시절의 물건이 됐다: 책상을 덮고 **대화상자
// 하나가 가운데 선다.** 제목 표시줄에 든 것이 이 전환이 말하는 한마디이고(「1998 결산」),
// 그 아래가 내용이다. 아무 데나 누르면 닫힌다 — 그 시절 대화상자와 다른 점은 이것뿐인데,
// 「확인」 버튼 하나를 세우느니 화면 전체를 누르게 두는 편이 폰에서 낫다.
//
// ── 왜 클래스가 아니라 함수인가 ─────────────────────────────────
// 들고 있을 상태가 없다 — 한 번 그리고, 누르면 사라진다. 그래서 **씬의 `redraw()` 가 매번
// 다시 부르는 순수한 그리기 함수**로 둔다. 그러면 화면을 돌렸을 때(=`redraw()`)
// 막도 공짜로 다시 서고, 방금 고친 카메라 배율·띠 예산을 그대로 물려받는다.
//
// ── 아래 장소의 입력을 삼킨다 ───────────────────────────────────
// 마지막에 화면 전체를 덮는 zone 을 놓는다. `redraw()` 끝에서 불리므로 z 순서로 맨 위에
// 서고, 그래서 막이 떠 있는 동안 아래 버튼이 안 눌린다.

import Phaser from "phaser";
import type { Cut } from "@/lib/game/core/interlude";
import { drawArt } from "@/lib/game/ui/art";
import { C, FS, MIN_FS, PAD, S, fontOf, mkText, setSize } from "@/lib/game/ui/theme";
import { TITLE_H, crt, winFrame } from "@/lib/game/ui/win95";

/** 그림 칸이 세로에서 차지하는 몫. 나머지가 글자 자리다. */
const ART_SHARE = 0.38;
/** 그림 칸의 최소 한 변. 이보다 작아지면 아예 안 그린다 — 알아볼 수 없는 그림은 자리 낭비다. */
const ART_MIN = 84;

/**
 * 막 한 장을 그린다.
 *
 * @returns 그린 것 전부. 부르는 쪽이 자기 목록에 넣어 다음 `redraw()` 때 같이 지운다.
 */
export function drawInterlude(
    scene: Phaser.Scene, cut: Cut, w: number, h: number, onDismiss: () => void,
): Phaser.GameObjects.GameObject[] {
    const made: Phaser.GameObjects.GameObject[] = [];
    const font = fontOf(scene);
    const put = <T extends Phaser.GameObjects.GameObject>(o: T): T => { made.push(o); return o; };

    // 바닥 — 불투명이어야 아래 장소가 안 비친다. 책상 색이라 대화상자가 그 위에 놓인다.
    const ground = scene.add.graphics();
    ground.fillStyle(C.bg, 1).fillRect(0, 0, w, h);
    put(ground);

    // 대화상자의 크기를 **내용에서 거꾸로 잰다.** 화면을 통째로 덮으면 「무엇이 바뀌었다」가
    // 아니라 새 장소처럼 보인다 — 전환은 잠깐 서는 것이라 그만한 크기여야 한다.
    const margin = Math.max(PAD, Math.round(w * 0.05));
    const dw = Math.min(w - margin * 2, 340);
    const dx = Math.round((w - dw) / 2);
    const inW = dw - 12;

    const lineH = FS.sm + 8;
    const bodyH = cut.lines.length * lineH;
    const hintH = FS.xs + 18;
    const chrome = TITLE_H + 6 + 10;

    const side = Math.min(
        Math.round(h * ART_SHARE),
        inW - 8,
        Math.max(0, h - margin * 2 - chrome - bodyH - hintH - 12),
    );
    const withArt = side >= ART_MIN;
    const dh = Math.min(h - margin * 2, chrome + (withArt ? side + 12 : 0) + bodyH + hintH);
    const dy = Math.max(margin, Math.round((h - dh) / 2));

    // **제목 표시줄이 이 전환의 한마디다.** 예전에는 막 한가운데에 큰 금색 글씨로
    // 있었는데, 창이 있는 화면에서는 그 자리가 곧 제목이다.
    const win = winFrame(scene, dx, dy, dw, dh, cut.head);
    for (const o of win.parts) put(o);
    const body = win.body;

    let y = body.y + 5;
    if (withArt) {
        const ax = body.x + Math.round((body.w - side) / 2);
        // 그림은 **모니터 안**이다 — 회색 면에 직접 얹으면 스티커가 된다.
        put(crt(scene, ax, y, side, side));
        const art = drawArt(scene, cut.art, ax + 2, y + 2, side - 4, side - 4);
        if (art) {
            for (const o of art) put(o);
        } else {
            // 그림이 없을 때 — 자리표시. 시트가 없어도 화면이 안 깨진다.
            const t = mkText(scene, ax + side / 2, y + side / 2 - FS.xs / 2, "그래픽 자리", {
                fontFamily: font, fontSize: `${FS.xs}px`, color: S.inkDim,
            }).setOrigin(0.5, 0);
            put(t);
        }
        y += side + 12;
    }

    // 본문은 **회색 면 위**라 검은 글자다.
    for (const line of cut.lines) {
        if (y + FS.sm > body.y + body.h - hintH) break;
        const t = mkText(scene, body.x + body.w / 2, y, line, {
            fontFamily: font, fontSize: `${FS.sm}px`, color: S.faceInk,
        }).setOrigin(0.5, 0);
        // **`displayWidth` 다** — mkText 는 글자를 k 배로 굽고 1/k 로 줄여 붙인다.
        const room = body.w - 16;
        if (t.displayWidth > room) setSize(scene, t, Math.max(MIN_FS, Math.floor(FS.sm * (room / t.displayWidth))));
        put(t);
        y += lineH;
    }

    put(mkText(scene, body.x + body.w / 2, body.y + body.h - FS.xs - 6, "아무 데나 눌러 계속", {
        fontFamily: font, fontSize: `${FS.xs}px`, color: S.faceDim,
    }).setOrigin(0.5, 0));

    // 맨 위에 놓는 탭 영역. 아래 장소의 버튼을 삼킨다.
    const z = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive();
    z.on("pointerup", onDismiss);
    put(z);

    return made;
}
