// 손패 세 장 — 화면 아래쪽 가로 탭 박스.
//
// 카드가 무엇을 하는지는 여기서 모른다. 눌린 **장**의 uid 를 위로 올려 줄 뿐이고, 효과는
// RoguelikeManager 가 정한다 — 그래서 카드를 하나 더 만들 때 이 파일을 안 고친다.
//
// id 가 아니라 uid 로 짚는 이유: 덱에 같은 카드가 여러 장 들어간다. 같은 카드가 두 장
// 잡히는 일이 흔해서 id 로 짚으면 두 장이 함께 눌린 것처럼 보인다.
//
// ── 두 번 누르기 ────────────────────────────────────────────────
// 카드 칸은 세로 70~120px 이다. 여기에 효과 설명을 통째로 넣으면 글자가 서로를 밟는다.
// 그렇다고 설명을 지우면 무슨 카드인지 모르는 채 눌러야 한다.
//
//   접힘 — 이름 + 한 줄  →  [탭]  →  펼침 — 효과 · 언제 쓰는가  →  [탭] → 사용
//
// 그래서 굴리는 동안은 한 줄만 보이고, 알고 싶을 때만 펼쳐서 읽는다. 잘못 눌렀으면
// 펼침의 "닫기" 로 되돌아간다 — 한 번의 탭으로 그 턴이 정해지는 일이 없다.

import Phaser from "phaser";
import type { StrategyCard } from "@/lib/game/core/types";
import { C, S, FS, LANE, fontOf, mkText } from "@/lib/game/ui/theme";

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

/** 펼침 칸이 위쪽(유물·켜짐 줄)으로 넘어가는 높이. 세로 폰에서 설명 넉 줄이 들어간다. */
const OPEN_RISE = 64;

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
    /** 지금 펼쳐 놓고 읽는 중인 칸. 접힘으로 돌아가면 없어진다. */
    private detail: Phaser.GameObjects.Container | null = null;

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
        this.closeDetail();
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

            const name = mkText(this.scene, cw / 2, tag.y + tag.displayHeight + 3, card.name, {
                fontFamily: fontOf(this.scene), fontSize: `${FS.sm}px`, color: S.ink,
                align: "center", wordWrap: { width: cw - 12 },
            }).setOrigin(0.5, 0);

            // 설명은 이름이 **실제로 차지한 높이** 아래에서 시작한다. 고정값을 쓰면 칸이
            // 좁아 이름이 두 줄이 되는 순간(가로 배치가 그렇다) 설명 위에 겹쳐 찍힌다.
            const desc = mkText(this.scene, cw / 2, name.y + name.displayHeight + 3, card.shortDescription, {
                fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.inkDim,
                align: "center", wordWrap: { width: cw - 14 }, lineSpacing: 2,
            }).setOrigin(0.5, 0);

            const zone = this.scene.add.zone(0, 0, cw, this.boxH)
                .setOrigin(0, 0)
                .setInteractive({ useHandCursor: true });

            root.add([bg, tag, name, desc, zone]);
            this.add(root);

            const view: CardView = { root, bg, name, desc, tag, card, idle };
            this.views.push(view);
            this.paint(view, cw, "idle");

            // 첫 탭은 **읽는 것**이다. 여기서 카드가 쓰이지 않는다.
            zone.on("pointerup", () => {
                if (this.locked) return;
                this.openDetail(view);
            });
        });
    }

    private cellW(n: number): number {
        return Math.floor((this.boxW - GAP * (Math.max(1, n) - 1)) / Math.max(1, n));
    }

    /* ── 펼침 ───────────────────────────────────────────── */

    /**
     * 자세한 설명을 손패 위에 통째로 덮는다. 좁은 칸 안에 밀어 넣지 않는 이유는 하나다 —
     * 세로 폰의 카드 칸은 70px 남짓이라 어떻게 넣어도 글자가 겹친다.
     */
    private openDetail(v: CardView) {
        this.closeDetail();

        const lane = LANE[v.card.lane];
        const w = this.boxW;
        const pad = 12;
        const box = this.scene.add.container(0, 0);

        // 먼저 0 을 기준으로 쌓아 **실제 높이를 재고**, 그 다음에 칸을 그 높이에 맞춘다.
        // 칸 크기를 먼저 못박으면 설명이 한 줄 길어지는 순간 안내 위에 겹쳐 찍힌다.
        const head = mkText(this.scene, pad, 10, `${lane.tag} · ${v.card.name}`, {
            fontFamily: fontOf(this.scene), fontSize: `${FS.md}px`, color: lane.ink,
            wordWrap: { width: w - pad * 2 - 56 },
        });
        const close = mkText(this.scene, w - pad, 12, "닫기 ✕", {
            fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.inkDim,
        }).setOrigin(1, 0);
        const effect = mkText(this.scene, pad, head.y + head.displayHeight + 6, v.card.effectDescription, {
            fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.ink,
            wordWrap: { width: w - pad * 2 }, lineSpacing: 3,
        });
        const when = mkText(this.scene, pad, effect.y + effect.displayHeight + 6, v.card.when, {
            fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`, color: S.inkDim,
            wordWrap: { width: w - pad * 2 }, lineSpacing: 3,
        });
        const hint = mkText(this.scene, w / 2, when.y + when.displayHeight + 8,
            v.idle ? "지금은 아무 일도 안 합니다 — 한 번 더 누르면 사용"
                : "한 번 더 누르면 사용합니다",
            {
                fontFamily: fontOf(this.scene), fontSize: `${FS.xs}px`,
                color: v.idle ? S.danger : lane.ink, align: "center",
                wordWrap: { width: w - pad * 2 },
            }).setOrigin(0.5, 0);

        // 필요한 만큼 위로 올라간다. 짧은 카드라도 최소 OPEN_RISE 는 올려 둔다 — 칸이
        // 카드마다 들쭉날쭉하면 눈이 매번 다시 자리를 찾는다.
        const need = hint.y + hint.displayHeight + 10;
        const y0 = Math.min(-OPEN_RISE, this.boxH - need);
        const h = this.boxH - y0;
        for (const t of [head, close, effect, when, hint]) t.y += y0;

        const g = this.scene.add.graphics();
        g.fillStyle(C.panelHi, 1).fillRect(0, y0, w, h);
        g.lineStyle(2, lane.color, 1).strokeRect(1, y0 + 1, w - 2, h - 2);
        g.fillStyle(lane.color, 1).fillRect(2, y0 + 2, w - 4, 3);
        box.add(g);

        // 두 번째 탭 = 사용. 칸 전체가 버튼이다.
        const use = this.scene.add.zone(0, y0, w, h).setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });
        use.on("pointerup", () => {
            this.closeDetail();
            this.lockTo(v.card.uid);
            this.onPick(v.card.uid);
        });

        // 닫기는 **나중에** 얹는다. Phaser 는 맨 위 하나에만 입력을 주므로 이 순서가 곧
        // "닫기가 사용을 이긴다" 는 규칙이다.
        const closeZone = this.scene.add.zone(w - 80, y0, 80, 40).setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });
        closeZone.on("pointerup", () => this.closeDetail());

        box.add([head, close, effect, when, hint, use, closeZone]);
        this.add(box);
        this.detail = box;
    }

    private closeDetail() {
        this.detail?.destroy(true);
        this.detail = null;
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
        this.closeDetail();
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
