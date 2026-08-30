// 손패 세 장 — 화면 아래쪽 가로 탭 박스.
//
// 카드가 무엇을 하는지는 여기서 모른다. 눌린 **장**의 uid 를 위로 올려 줄 뿐이고, 효과는
// RoguelikeManager 가 정한다 — 그래서 카드를 하나 더 만들 때 이 파일을 안 고친다.
//
// id 가 아니라 uid 로 짚는 이유: 덱에 같은 카드가 여러 장 들어간다. 시작 덱만 해도
// 관망 지시가 둘이라 id 로 짚으면 두 장이 함께 눌린 것처럼 보인다.

import Phaser from "phaser";
import type { StrategyCard } from "@/lib/game/core/types";
import { C, S, FS, fontOf } from "@/lib/game/ui/theme";

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
    zone: Phaser.GameObjects.Zone;
    uid: string;
    /** 저주는 다른 색으로 칠한다 — 무엇을 쥐었는지 한눈에 보여야 한다. */
    curse: boolean;
}

const GAP = 8;

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

    /** 새 손패를 깐다. 지난 턴 카드는 여기서 사라진다. */
    setHand(cards: StrategyCard[]): void {
        for (const v of this.views) v.root.destroy(true);
        this.views = [];
        this.empty?.destroy();
        this.empty = null;
        this.locked = false;

        if (cards.length === 0) {
            // 파쇄기가 손패를 통째로 태웠을 때만 여기로 온다.
            this.empty = this.scene.add.text(this.boxW / 2, this.boxH / 2, "이번 턴은 카드 없이", {
                fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.inkDim,
            }).setOrigin(0.5);
            this.add(this.empty);
            return;
        }

        const cw = Math.floor((this.boxW - GAP * (cards.length - 1)) / cards.length);

        cards.forEach((card, i) => {
            const curse = card.kind === "curse";
            const root = this.scene.add.container(i * (cw + GAP), 0);
            const bg = this.scene.add.graphics();

            const name = this.scene.add.text(cw / 2, 6, card.name, {
                fontFamily: fontOf(this.scene), fontSize: `${FS.sm}px`, color: curse ? S.danger : S.ink,
                align: "center", wordWrap: { width: cw - 12 },
            }).setOrigin(0.5, 0);

            // 설명은 이름이 **실제로 차지한 높이** 아래에서 시작한다. 고정값을 쓰면 칸이
            // 좁아 이름이 두 줄이 되는 순간(가로 배치가 그렇다) 설명 위에 겹쳐 찍힌다.
            const desc = this.scene.add.text(cw / 2, name.y + name.height + 4, card.effectDescription, {
                fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.inkDim,
                align: "center", wordWrap: { width: cw - 14 }, lineSpacing: 2,
            }).setOrigin(0.5, 0);

            const zone = this.scene.add.zone(0, 0, cw, this.boxH)
                .setOrigin(0, 0)
                .setInteractive({ useHandCursor: true });

            root.add([bg, name, desc, zone]);
            this.add(root);

            const view: CardView = { root, bg, name, desc, zone, uid: card.uid, curse };
            this.views.push(view);

            this.paint(view, cw, "idle");

            zone.on("pointerdown", () => {
                if (this.locked) return;
                this.paint(view, cw, "picked");
            });
            zone.on("pointerup", () => {
                if (this.locked) return;
                this.lockTo(card.uid, cw);
                this.onPick(card.uid);
            });
            // 누른 채 손가락이 밖으로 나가면 취소다.
            zone.on("pointerout", () => {
                if (!this.locked) this.paint(view, cw, "idle");
            });
        });
    }

    /** 한 장을 고르면 나머지는 흐려지고 더 이상 안 눌린다. */
    private lockTo(uid: string, cw: number) {
        this.locked = true;
        for (const v of this.views) {
            this.paint(v, cw, v.uid === uid ? "picked" : "dimmed");
        }
    }

    /** 밖에서(키보드 등) 고른 경우에도 화면을 맞춰 둘 수 있게 열어 둔다. */
    lock(uid: string): void {
        const n = Math.max(1, this.views.length);
        this.lockTo(uid, Math.floor((this.boxW - GAP * (n - 1)) / n));
    }

    private paint(v: CardView, cw: number, state: "idle" | "picked" | "dimmed") {
        const g = v.bg;
        g.clear();

        // 고른 카드는 네온, 저주는 항상 붉게. 저주를 골라도 저주인 것은 안 바뀐다.
        const accent = v.curse ? C.danger : C.neon;
        const face = state === "picked" ? C.panelHi : C.panel;
        const edge = state === "picked" ? accent : (v.curse ? C.danger : C.line);

        g.fillStyle(face, 1).fillRect(0, 0, cw, this.boxH);
        g.lineStyle(state === "picked" ? 2 : 1, edge, 1);
        g.strokeRect(1, 1, cw - 2, this.boxH - 2);

        // 고른 카드에만 위쪽 띠를 둔다 — 색만으로는 밝은 화면에서 잘 안 갈린다.
        if (state === "picked") {
            g.fillStyle(accent, 1).fillRect(2, 2, cw - 4, 3);
        }

        v.root.setAlpha(state === "dimmed" ? 0.35 : 1);
        v.name.setColor(state === "picked" ? (v.curse ? S.danger : S.neon)
            : (v.curse ? S.danger : S.ink));
    }
}
