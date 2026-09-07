// 손패 세 장 — 화면 아래쪽 가로 탭 박스.
//
// 카드가 무엇을 하는지는 여기서 모른다. 눌린 **장**의 uid 를 위로 올려 줄 뿐이고, 효과는
// RoguelikeManager 가 정한다 — 그래서 카드를 하나 더 만들 때 이 파일을 안 고친다.
//
// id 가 아니라 uid 로 짚는 이유: 덱에 같은 카드가 여러 장 들어간다. 같은 카드가 두 장
// 잡히는 일이 흔해서 id 로 짚으면 두 장이 함께 눌린 것처럼 보인다.
//
// ── 한 번 누르기 ────────────────────────────────────────────────
//
//   [탭] → 사용
//
// 예전에는 두 번이었다. 첫 탭이 효과 설명을 펼치고 두 번째 탭이 카드를 냈다 — 카드 칸이
// 세로 70~120px 뿐이라 효과 설명을 칸 안에 넣을 수 없었고, 모르는 채 누르는 것보다
// 펼쳐서 읽히는 편이 낫다고 봤기 때문이다.
//
// 그 읽는 자리는 **카드 도감**(/game/cards)이 대신한다. 효과·언제 쓰나·얻는 법이 다 있고,
// 게임 화면 아래 링크가 그리로 간다. 손패에서 매번 펼쳐 읽는 것은 판이 굴러가는 동안에는
// 손이 한 번 더 가는 일이었다.
//
// 대신 **한 번의 탭이 그 턴의 카드를 정한다.** 되돌릴 수 없다. 그래서 칸에 남는 정보가
// 중요하다 — 이름은 항상, 한 줄 요약은 칸이 허락하는 만큼 보인다.

import Phaser from "phaser";
import type { StrategyCard } from "@/lib/game/core/types";
import { C, S, FS, LANE, fontOf, mkText, pressable } from "@/lib/game/ui/theme";

/** 지금 아무 일도 못 하는 카드인가. 씬이 계좌를 보고 답한다. */
export type IdleCheck = (card: StrategyCard) => boolean;

export interface CardHandOpts {
    x: number;
    y: number;
    width: number;
    height: number;
    /** 카드를 눌렀을 때. 이미 한 장을 고른 뒤에는 안 불린다. */
    onPick: (uid: string) => void;
}

interface CardView {
    root: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
    tag: Phaser.GameObjects.Text;
    card: StrategyCard;
    /** 지금은 아무 일도 못 하는 카드. 눌리기는 하되 흐리게 둔다. */
    idle: boolean;
}

const GAP = 8;

/**
 * 카드에 붙는 이름. 상황카드는 강화되지 않으므로 손댈 것이 없다.
 *
 * 예전에는 코어가 `예고 시황 +2` 처럼 강화 꼬리를 붙여 줘서 여기서 떼야 했다.
 * 강화가 사라지면서 그 처리도 같이 없어졌다.
 */
function baseName(card: StrategyCard): string {
    return card.name;
}

export class CardHandContainer extends Phaser.GameObjects.Container {
    // Container 가 이미 w·h 를 쓴다 — 겹치면 부모의 것을 덮어쓴다.
    private readonly boxW: number;
    private readonly boxH: number;
    private readonly onPick: (uid: string) => void;

    private views: CardView[] = [];
    /** 손패가 비었을 때 그 자리에 남는 안내. 빈 칸만 두면 화면이 깨진 것처럼 보인다. */
    private empty: Phaser.GameObjects.Text | null = null;
    /** 이번 턴에 이미 골랐는가. 골랐으면 나머지는 안 눌린다. */
    private locked = false;

    constructor(scene: Phaser.Scene, o: CardHandOpts) {
        super(scene, o.x, o.y);
        this.boxW = o.width;
        this.boxH = o.height;
        this.onPick = o.onPick;
        scene.add.existing(this);
    }

    /**
     * 새 손패를 깐다. 지난 턴 카드는 여기서 사라진다.
     *
     * @param isIdle 지금 아무 일도 못 하는 카드를 가려낸다. 수수료 면제를 현금만 쥔 채
     *               쓰면 그 턴이 통째로 버려지는데, 눌러 보고 나서야 아는 것보다
     *               흐리게라도 미리 보이는 편이 낫다.
     */
    setHand(cards: StrategyCard[], isIdle?: IdleCheck): void {
        for (const v of this.views) v.root.destroy(true);
        this.views = [];
        this.empty?.destroy();
        this.empty = null;
        this.locked = false;

        if (cards.length === 0) {
            // 파쇄기가 손패를 통째로 태웠을 때만 여기로 온다.
            this.empty = mkText(this.scene, this.boxW / 2, this.boxH / 2, "이번 턴은 카드 없이", {
                fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.inkDim,
            }).setOrigin(0.5);
            this.add(this.empty);
            return;
        }

        const cw = this.cellW(cards.length);

        cards.forEach((card, i) => {
            const lane = LANE[card.lane];
            const idle = isIdle?.(card) ?? false;
            const root = this.scene.add.container(i * (cw + GAP), 0);
            const bg = this.scene.add.graphics();

            // 갈래 표시는 맨 위 한 줄. 색만으로는 밝은 화면에서 잘 안 갈린다.
            const tag = mkText(this.scene, cw / 2, 5, lane.tag, {
                fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: lane.ink,
            }).setOrigin(0.5, 0);

            // 근거 표시 — **오른쪽 위 금색 점.**
            //
            // 이 카드를 내면 이번 턴 매수에 근거가 붙는다는 뜻이다. 그게 이 게임에서
            // 제일 중요한 한 가지라, 글자를 읽기 전에 색과 자리로 먼저 와야 한다.
            // 「내부자 제보」는 정보 카드인데도 이 점이 없다 — 알아본 것이 아니라
            // 얻어들은 것이라서 고객은 받아들여도 신뢰가 안 오른다.
            const badge: Phaser.GameObjects.GameObject[] = [];
            if (card.isThesis) {
                const g = this.scene.add.graphics();
                g.fillStyle(C.gold, 1).fillRect(cw - 12, 5, 6, 6);
                badge.push(g);
            }

            const name = mkText(this.scene, cw / 2, tag.y + tag.displayHeight + 3, baseName(card), {
                fontFamily: fontOf(this.scene), fontSize: `${FS.sm}px`, color: S.ink,
                align: "center", wordWrap: { width: cw - 12 },
            }).setOrigin(0.5, 0);

            // 설명은 이름이 **실제로 차지한 높이** 아래에서 시작한다. 고정값을 쓰면 칸이
            // 좁아 이름이 두 줄이 되는 순간(가로 배치가 그렇다) 설명 위에 겹쳐 찍힌다.
            const desc = mkText(this.scene, cw / 2, name.y + name.displayHeight + 3, card.shortDescription, {
                fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.inkDim,
                align: "center", wordWrap: { width: cw - 14 }, lineSpacing: 2,
            }).setOrigin(0.5, 0);

            // 칸을 넘으면 요약을 접는다. 낮은 화면에서는 칸이 60px 남짓이라, 이름이 두
            // 줄이 되는 순간(좁은 칸에서 늘 그렇다) 요약이 테두리 밖 버튼 위에 찍혔다.
            // 겹쳐 찍히는 것보다는 낫지만, 이 경우 이름만 보고 눌러야 한다 — 무슨
            // 카드인지는 도감에서 읽고 온다는 전제다.
            if (desc.y + desc.displayHeight > this.boxH - 4) desc.setVisible(false);

            const view: CardView = { root, bg, name, desc, tag, card, idle };

            // 탭 한 번이 곧 사용이다. locked 는 이번 턴에 이미 한 장을 낸 경우다.
            // **되돌릴 수 없는 한 번**이라 눌린 표시가 특히 중요하다 — 눌린 채 손을
            // 밖으로 빼면 실행하지 않고 되돌린다.
            const { zone, shade } = pressable(
                this.scene, 0, 0, cw, this.boxH, [bg, tag, ...badge, name, desc],
                () => { this.lockTo(card.uid); this.onPick(card.uid); },
                () => !this.locked,
            );

            // bg 가 맨 아래. 딱지는 그 위, 그늘과 입력 zone 은 맨 위여야 한다.
            root.add([bg, tag, ...badge, name, desc, shade, zone]);
            this.add(root);

            this.views.push(view);
            this.paint(view, cw, "idle");
        });
    }

    private cellW(n: number): number {
        return Math.floor((this.boxW - GAP * (Math.max(1, n) - 1)) / Math.max(1, n));
    }

    /* ── 고름 ───────────────────────────────────────────── */

    /** 한 장을 고르면 나머지는 흐려지고 더 이상 안 눌린다. */
    private lockTo(uid: string) {
        this.locked = true;
        const cw = this.cellW(this.views.length);
        for (const v of this.views) {
            this.paint(v, cw, v.card.uid === uid ? "picked" : "dimmed");
        }
    }

    /** 밖에서(회전으로 다시 그릴 때 등) 고른 장을 화면에 맞춰 둘 수 있게 열어 둔다. */
    lock(uid: string): void {
        this.lockTo(uid);
    }

    private paint(v: CardView, cw: number, state: "idle" | "picked" | "dimmed") {
        const g = v.bg;
        g.clear();

        const lane = LANE[v.card.lane];
        const face = state === "picked" ? C.panelHi : C.panel;
        const edge = state === "picked" ? lane.color : C.line;

        g.fillStyle(face, 1).fillRect(0, 0, cw, this.boxH);
        g.lineStyle(state === "picked" ? 2 : 1, edge, 1);
        g.strokeRect(1, 1, cw - 2, this.boxH - 2);

        // 갈래 띠 — 접혀 있어도 무슨 갈래인지가 색으로 먼저 온다.
        g.fillStyle(lane.color, state === "picked" ? 1 : 0.7).fillRect(2, 2, cw - 4, 3);

        // 흐리게 — 고르지 않은 카드와 "지금 소용없는" 카드를 갈라 둔다.
        //
        // 알파는 콘트라스트를 그대로 깎는다: 7:1 짜리 글자도 0.35 를 곱하면 2:1 이 되어
        // 안 읽힌다. 갈래가 보일 만큼만 낮추고, 글자는 읽히게 둔다.
        v.root.setAlpha(state === "dimmed" ? 0.55 : v.idle ? 0.72 : 1);
        v.name.setColor(state === "picked" ? lane.ink : S.ink);
    }
}
