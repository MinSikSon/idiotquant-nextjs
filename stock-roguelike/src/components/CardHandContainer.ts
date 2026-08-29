// 손패 세 장 — 화면 아래쪽 가로 탭 박스.
//
// 카드가 무엇을 하는지는 여기서 모른다. 눌린 카드의 id 를 위로 올려 줄 뿐이고, 효과는
// RoguelikeManager 가 정한다 — 그래서 카드를 하나 더 만들 때 이 파일을 안 고친다.

import Phaser from "phaser";
import type { StrategyCard } from "@/core/types";
import { C, S, FONT, FS } from "@/ui/theme";

export interface CardHandOpts {
    x: number;
    y: number;
    width: number;
    height: number;
    /** 카드를 눌렀을 때. 이미 한 장을 고른 뒤에는 안 불린다. */
    onPick: (cardId: string) => void;
}

interface CardView {
    root: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    name: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
    id: string;
}

const GAP = 8;

export class CardHandContainer extends Phaser.GameObjects.Container {
    // Container 가 이미 w·h 를 쓴다 — 겹치면 부모의 것을 덮어쓴다.
    private readonly boxW: number;
    private readonly boxH: number;
    private readonly onPick: (cardId: string) => void;

    private views: CardView[] = [];
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
        this.locked = false;

        const n = Math.max(1, cards.length);
        const cw = Math.floor((this.boxW - GAP * (n - 1)) / n);

        cards.forEach((card, i) => {
            const root = this.scene.add.container(i * (cw + GAP), 0);
            const bg = this.scene.add.graphics();

            const name = this.scene.add.text(cw / 2, 10, card.name, {
                fontFamily: FONT, fontSize: `${FS.sm}px`, color: S.ink,
                align: "center", wordWrap: { width: cw - 12 },
            }).setOrigin(0.5, 0);

            const desc = this.scene.add.text(cw / 2, 38, card.effectDescription, {
                fontFamily: FONT, fontSize: `${FS.xs}px`, color: S.inkDim,
                align: "center", wordWrap: { width: cw - 14 }, lineSpacing: 2,
            }).setOrigin(0.5, 0);

            const zone = this.scene.add.zone(0, 0, cw, this.boxH)
                .setOrigin(0, 0)
                .setInteractive({ useHandCursor: true });

            root.add([bg, name, desc, zone]);
            this.add(root);

            const view: CardView = { root, bg, name, desc, zone, id: card.id };
            this.views.push(view);

            this.paint(view, cw, "idle");

            zone.on("pointerdown", () => {
                if (this.locked) return;
                this.paint(view, cw, "picked");
            });
            zone.on("pointerup", () => {
                if (this.locked) return;
                this.lockTo(card.id, cw);
                this.onPick(card.id);
            });
            // 누른 채 손가락이 밖으로 나가면 취소다.
            zone.on("pointerout", () => {
                if (!this.locked) this.paint(view, cw, "idle");
            });
        });
    }

    /** 한 장을 고르면 나머지는 흐려지고 더 이상 안 눌린다. */
    private lockTo(cardId: string, cw: number) {
        this.locked = true;
        for (const v of this.views) {
            this.paint(v, cw, v.id === cardId ? "picked" : "dimmed");
        }
    }

    /** 밖에서(키보드 등) 고른 경우에도 화면을 맞춰 둘 수 있게 열어 둔다. */
    lock(cardId: string): void {
        const n = Math.max(1, this.views.length);
        this.lockTo(cardId, Math.floor((this.boxW - GAP * (n - 1)) / n));
    }

    private paint(v: CardView, cw: number, state: "idle" | "picked" | "dimmed") {
        const g = v.bg;
        g.clear();

        const face = state === "picked" ? C.panelHi : C.panel;
        const edge = state === "picked" ? C.neon : C.line;

        g.fillStyle(face, 1).fillRect(0, 0, cw, this.boxH);
        g.lineStyle(state === "picked" ? 2 : 1, edge, 1);
        g.strokeRect(1, 1, cw - 2, this.boxH - 2);

        // 고른 카드에만 위쪽 띠를 둔다 — 색만으로는 밝은 화면에서 잘 안 갈린다.
        if (state === "picked") {
            g.fillStyle(C.neon, 1).fillRect(2, 2, cw - 4, 3);
        }

        v.root.setAlpha(state === "dimmed" ? 0.35 : 1);
        v.name.setColor(state === "picked" ? S.neon : S.ink);
    }
}
