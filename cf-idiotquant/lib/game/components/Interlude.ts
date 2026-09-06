// 전환 — **장소가 바뀌었다는 것을 화면이 말하는 자리.**
//
// 여태는 `this.place = "office"; this.redraw()` 한 줄이면 다음 프레임에 이미 다른
// 장소였다. 집에서 나가는 것도 공원에서 눈을 감는 것도 화면상으로는 같은 다시 그리기라,
// 흐름이 있다는 것 자체가 안 보였다.
//
// ── 왜 클래스가 아니라 함수인가 ─────────────────────────────────
// `QuoteBoard` 는 스크롤·아코디언 상태를 들고 있어서 수명주기가 필요했다. 이 막은 들고
// 있을 상태가 없다 — 한 번 그리고, 누르면 사라진다. 그래서 **씬의 `redraw()` 가 매번
// 다시 부르는 순수한 그리기 함수**로 둔다. 그러면 화면을 돌렸을 때(=`redraw()`)
// 막도 공짜로 다시 서고, 방금 고친 카메라 배율·띠 예산을 그대로 물려받는다.
//
// ── 아래 장소의 입력을 삼킨다 ───────────────────────────────────
// 마지막에 화면 전체를 덮는 zone 을 놓는다. `redraw()` 끝에서 불리므로 z 순서로 맨 위에
// 서고, 그래서 막이 떠 있는 동안 아래 버튼이 안 눌린다.

import Phaser from "phaser";
import type { Cut } from "@/lib/game/core/interlude";
import { drawArt } from "@/lib/game/ui/art";
import { C, FS, PAD, S, fontOf, mkText } from "@/lib/game/ui/theme";

/** 그림 칸이 세로에서 차지하는 몫. 나머지가 글자 자리다. */
const ART_SHARE = 0.42;
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

    const txt = (x: number, y: number, s: string, size: number, color: string, origin = 0.5) => {
        const t = mkText(scene, x, y, s, { fontFamily: font, fontSize: `${size}px`, color });
        t.setOrigin(origin, 0);
        // **`displayWidth` 다** — mkText 는 글자를 k 배로 굽고 1/k 로 줄여 붙인다.
        const room = w - PAD * 2;
        if (t.displayWidth > room) t.setFontSize(Math.max(10, Math.floor(size * (room / t.displayWidth))));
        return put(t);
    };

    // 바닥 — 불투명이어야 아래 장소가 안 비친다.
    const ground = scene.add.graphics();
    ground.fillStyle(C.bg, 1).fillRect(0, 0, w, h);
    put(ground);

    // 글이 차지할 세로를 먼저 잡는다. 그림은 남는 것을 쓴다 — 짧은 격자에서 글이 먼저다.
    const headH = FS.lg + 12;
    const bodyH = cut.lines.length * (FS.sm + 8);
    const hintH = FS.xs + 20;
    const textH = headH + bodyH + hintH;

    const side = Math.min(
        Math.round(h * ART_SHARE),
        w - PAD * 2,
        Math.max(0, h - textH - 40),
    );
    let y = Math.max(PAD, Math.round((h - (side >= ART_MIN ? side + 18 : 0) - textH) / 2));

    if (side >= ART_MIN) {
        const ax = Math.round((w - side) / 2);
        const art = drawArt(scene, cut.art, ax, y, side, side);
        if (art) {
            for (const o of art) put(o);
        } else {
            // 그림이 없을 때 — 오늘과 같은 자리표시. 시트가 없어도 화면이 안 깨진다.
            const box = scene.add.graphics();
            box.fillStyle(0x0e1618, 1).fillRect(ax, y, side, side);
            box.lineStyle(1, 0x23343a, 1).strokeRect(ax + 0.5, y + 0.5, side - 1, side - 1);
            put(box);
            txt(w / 2, y + side / 2 - FS.xs / 2, "그래픽 자리", FS.xs, "#3b4c50");
        }
        // 테두리는 그림이 있든 없든 — 이 칸이 그림 자리라는 표시다.
        const edge = scene.add.graphics();
        edge.lineStyle(1, C.line, 1).strokeRect(ax + 0.5, y + 0.5, side - 1, side - 1);
        put(edge);
        y += side + 18;
    }

    txt(w / 2, y, cut.head, FS.lg, S.gold);
    y += headH;
    for (const line of cut.lines) {
        txt(w / 2, y, line, FS.sm, S.inkDim);
        y += FS.sm + 8;
    }
    txt(w / 2, Math.min(y + 8, h - PAD - FS.xs), "▸ 계속", FS.xs, "#4e6a70");

    // 맨 위에 놓는 탭 영역. 아래 장소의 버튼을 삼킨다.
    const z = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive();
    z.on("pointerup", onDismiss);
    put(z);

    return made;
}
