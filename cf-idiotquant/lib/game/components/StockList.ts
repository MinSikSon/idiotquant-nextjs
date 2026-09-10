// 종목 목록 — **화면 하나를 통째로 쓴다.**
//
// ── 왜 다시 별도 화면인가 ──────────────────────────────────────
// 이 목록은 세 번 자리를 옮겼다. 처음에는 「시세판」이라는 별도 화면이었고, 그것이
// 「종목을 골라야 하는지조차 모르겠다」는 말을 들어 회사 화면 안으로 들어왔다. 그런데
// 회사 화면 안에서는 **고른 종목 판이 세로의 절반을 먹어서 목록에 두세 줄밖에 안 남았다** —
// 폰에서 아홉 종목을 견줄 수가 없다. 고르는 일이 화면의 본체인데 고를 것이 안 보였다.
//
// 그래서 다시 별도 화면인데, **처음 것과 다른 점이 하나 있다.** 예전에는 버튼을 눌러
// 화면을 옮기고 → 줄을 눌러 판을 열고 → 다시 눌러 체결하는 세 단계였다. 지금은
// **줄을 한 번 누르면 그 종목이 골라지고 곧장 회사로 돌아간다.** 이 화면이 하는 일은
// 고르는 것 하나뿐이라, 「골라야 하나?」를 물을 자리가 없다.
//
// ── 마스크를 안 쓴다 ───────────────────────────────────────────
// Phaser 4 의 WebGL 렌더러는 `setMask` 를 안 받는다(콘솔에 그렇게 찍힌다). 그래서 예전
// 코드의 잘라내기는 **아무 일도 안 하고 있었고**, 줄이 띠 밖으로 흘러도 그대로 그려졌다.
// 종목이 셋뿐이던 동안에는 안 드러났을 뿐이다.
//
// 마스크 대신 **보이는 줄만 그린다.** 스크롤은 줄 단위로만 움직이므로 반 줄이 걸치는
// 일이 없고, 창 밖으로 나갈 줄은 애초에 만들지 않는다. 잘라낼 것이 없으면 잘라내기도 필요 없다.

import Phaser from "phaser";
import type { Stock } from "@/lib/game/core/types";
import { C, FS, PAD, S, type Band, fontOf, mkText, price, pxOf } from "@/lib/game/ui/theme";
import { bevel, crt } from "@/lib/game/ui/win95";

/** 한 줄의 높이. **모든 줄이 언제나 이 높이다** — 누른다고 펼쳐지지 않는다. */
const ROW_H = 56;
/** 이만큼 끌면 누른 것이 아니라 넘긴 것으로 친다. */
const DRAG_SLOP = 8;
/** 오른쪽 스크롤 막대의 폭. 그 시절 값은 16 인데, 폰에서는 목록을 그만큼 좁힌다. */
const SCROLL_W = 9;

export interface StockRow {
    stock: Stock;
    price: number;
    /** 지난 턴 대비 등락률(%). */
    changePct: number;
    /** 보유 주수. 0 이면 안 들고 있다. */
    shares: number;
    /** 평가손익률(%). 안 들고 있으면 0. */
    pnlPct: number;
    /** 이번 반기에 새로 상장했는가. */
    isNew: boolean;
}

export interface StockListDeps {
    scene: Phaser.Scene;
    /** 이 띠 **안에만** 그린다. */
    band: Band;
    rows(): StockRow[];
    /** 지금 고른 종목. **늘 하나가 골라져 있다** — null 이 없다. */
    selectedId(): string;
    /** 이번 턴 알아본 종목의 id. 목록에서 표시가 붙는다. */
    researchedId(): string | null;
    /** 줄을 눌렀다. **고르고 화면을 닫는 것까지 부르는 쪽의 일이다.** */
    onPick(id: string): void;
}

export class StockList {
    private readonly d: StockListDeps;
    private root: Phaser.GameObjects.Container | null = null;

    /** 맨 위에 보이는 줄의 번호. **줄 단위다** — 반 줄이 걸치지 않는다. */
    private top = 0;
    private dragging = false;
    private dragged = 0;
    private lastPtrY = 0;

    constructor(deps: StockListDeps) { this.d = deps; }

    get isOpen(): boolean { return this.root !== null; }

    open(): void { if (!this.root) this.draw(); }

    close(): void {
        this.root?.destroy(true);
        this.root = null;
    }

    /**
     * 포인터의 y 를 **설계 격자로** 되돌린다.
     *
     * `p.y` 는 캔버스 좌표다. 버퍼를 기기 해상도(설계 × k)로 잡아 두었으므로 이 값은
     * 설계 격자의 k 배다. 안 나누면 DPR 3 폰에서만 엉뚱한 줄이 잡힌다.
     */
    private designY(p: Phaser.Input.Pointer): number { return p.y / pxOf(this.d.scene); }

    /** 창에 **온전히** 들어가는 줄 수. */
    private get visible(): number {
        return Math.max(1, Math.floor(this.d.band.h / ROW_H));
    }

    private get needsScroll(): boolean {
        return this.d.rows().length > this.visible;
    }

    /** 한 줄이 실제로 쓰는 폭. 스크롤 막대 밑으로 글자가 들어가지 않게. */
    private get rowW(): number {
        return this.d.band.w - (this.needsScroll ? SCROLL_W : 0);
    }

    /** 맨 위 줄이 갈 수 있는 마지막 자리. */
    private get maxTop(): number {
        return Math.max(0, this.d.rows().length - this.visible);
    }

    private draw(): void {
        const { scene, band } = this.d;
        const root = scene.add.container(0, 0);
        this.root = root;

        // 목록은 **검은 화면 안**이다. 값이 굴러가는 자리라 회색 면 위가 아니다.
        root.add(crt(scene, band.x, band.y, band.w, band.h));

        const rows = this.d.rows();
        this.top = Math.min(this.top, this.maxTop);
        const shown = rows.slice(this.top, this.top + this.visible);
        shown.forEach((row, i) => this.drawRow(root, row, band.y + i * ROW_H));

        if (this.needsScroll) this.drawScrollbar(root);

        // 누른 줄을 표시하는 그늘. 줄마다 zone 을 두면 드래그와 싸우므로 **판 하나로 받는다.**
        const shade = scene.add.graphics();
        shade.fillStyle(0xffffff, 0.10).fillRect(band.x, band.y, this.rowW, ROW_H);
        shade.setVisible(false);
        root.add(shade);

        const zone = scene.add.zone(band.x, band.y, band.w, band.h)
            .setOrigin(0, 0).setInteractive();
        root.add(zone);

        /** 화면 y 가 보이는 줄 중 몇 번째인가. 창 밖이면 −1. */
        const slotAt = (designY: number): number => {
            const i = Math.floor((designY - band.y) / ROW_H);
            return i >= 0 && i < shown.length ? i : -1;
        };

        zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
            this.dragging = true; this.dragged = 0; this.lastPtrY = this.designY(p);
            const i = slotAt(this.designY(p));
            if (i >= 0) { shade.y = i * ROW_H; shade.setVisible(true); }
        });
        zone.on("pointermove", (p: Phaser.Input.Pointer) => {
            if (!this.dragging) return;
            const y = this.designY(p);
            const dy = y - this.lastPtrY;
            this.dragged += Math.abs(dy);
            // 끌기 시작하면 눌린 표시를 거둔다 — 넘기는 중이지 누르는 중이 아니다.
            if (this.dragged > DRAG_SLOP) shade.setVisible(false);
            // **한 줄을 넘게 끌었을 때만** 한 줄 움직인다. 줄 단위라 반 줄이 안 걸친다.
            if (Math.abs(dy) >= ROW_H && this.needsScroll) {
                this.lastPtrY = y;
                this.scrollBy(dy > 0 ? -1 : 1);
            }
        });
        const release = (p: Phaser.Input.Pointer) => {
            if (!this.dragging) return;
            this.dragging = false;
            shade.setVisible(false);
            if (this.dragged > DRAG_SLOP) return;   // 넘긴 것이지 누른 것이 아니다
            const i = slotAt(this.designY(p));
            const row = i >= 0 ? shown[i] : undefined;
            if (row) this.d.onPick(row.stock.id);
        };
        zone.on("pointerup", release);
        zone.on("pointerout", () => { this.dragging = false; shade.setVisible(false); });
    }

    /** 맨 위 줄을 옮기고 다시 그린다. **그리는 줄이 바뀌므로 통째로 다시 세운다.** */
    private scrollBy(rows: number): void {
        const next = Math.max(0, Math.min(this.maxTop, this.top + rows));
        if (next === this.top) return;
        this.top = next;
        this.close();
        this.draw();
    }

    /**
     * 오른쪽 스크롤 막대. **줄이 넘칠 때만 선다.**
     *
     * 누르는 물건이 아니라 **읽는 물건**이다 — 끄는 것은 목록 위 아무 데서나 되고,
     * 이건 「지금 어디쯤이고 얼마나 더 있는가」를 말한다. 죽은 버튼이 아닌 이유가 그것이다.
     */
    private drawScrollbar(root: Phaser.GameObjects.Container): void {
        const { scene, band } = this.d;
        const total = this.d.rows().length;
        const x = band.x + band.w - SCROLL_W;
        const h = this.visible * ROW_H;

        root.add(bevel(scene, x, band.y, SCROLL_W, h, { face: C.panelLo, sunken: true }));
        const thumbH = Math.max(20, Math.round((h * this.visible) / total));
        const t = this.maxTop > 0 ? this.top / this.maxTop : 0;
        root.add(bevel(scene, x + 1, band.y + Math.round(t * (h - thumbH)), SCROLL_W - 2, thumbH));
    }

    private drawRow(root: Phaser.GameObjects.Container, row: StockRow, y: number): void {
        const { scene, band } = this.d;
        const width = this.rowW;
        const x = band.x;
        const f = fontOf(scene);
        const up = row.changePct >= 0;
        const col = up ? S.up : S.down;

        const picked = row.stock.id === this.d.selectedId();
        const mine = row.stock.id === this.d.researchedId();

        const g = scene.add.graphics();
        if (picked) {
            // 고른 줄 — **남색 반전.** 그 시절 목록에서 고른 줄이 이렇게 생겼다.
            g.fillStyle(C.bar, 1).fillRect(x, y, width, ROW_H);
        }
        if (row.shares > 0) {
            // 들고 있는 줄은 왼쪽에 금색 띠. 훑을 때 내 자리가 먼저 온다.
            g.fillStyle(C.gold, 1).fillRect(x, y, 3, ROW_H);
        }
        g.lineStyle(1, C.grid, 1).lineBetween(x, y + ROW_H, x + width, y + ROW_H);
        root.add(g);

        const ink = picked ? S.barInk : S.ink;
        const dim = picked ? "#a8bcd8" : S.inkDim;

        const name = mkText(scene, x + PAD, y + 9, row.stock.name, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: ink,
        });
        root.add(name);
        // **베타를 이름 옆에.** 국면이 시장 하나짜리라 종목을 가르는 것은 베타다 —
        // 같은 하락에서 0.4 와 2.0 이 다섯 배로 갈린다. 고르려면 이 값이 보여야 한다.
        root.add(mkText(scene, x + PAD + name.displayWidth + 6, y + 11,
            `β${row.stock.beta.toFixed(1)}`, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: dim,
        }));
        // 알아본 종목에는 표시를 남긴다 — 이 화면에서 나갔다 와도 어느 것이었는지 안다.
        if (mine) {
            root.add(mkText(scene, x + width - PAD, y + 34, "알아봤다", {
                fontFamily: f, fontSize: `${FS.xs}px`, color: S.up,
            }).setOrigin(1, 0));
        }

        root.add(mkText(scene, x + width - PAD - 62, y + 9, price(row.price), {
            fontFamily: f, fontSize: `${FS.sm}px`, color: col,
        }).setOrigin(1, 0));
        root.add(mkText(scene, x + width - PAD, y + 9,
            `${up ? "+" : ""}${row.changePct.toFixed(1)}%`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: col,
        }).setOrigin(1, 0));

        const sub = row.isNew ? "신규 상장" : row.stock.blurb;
        root.add(mkText(scene, x + PAD, y + 32, sub, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: row.isNew ? S.gold : dim,
        }));
        if (row.shares > 0 && !mine) {
            const p = row.pnlPct;
            root.add(mkText(scene, x + width - PAD, y + 32,
                `${row.shares}주 · ${p >= 0 ? "+" : ""}${p.toFixed(0)}%`, {
                fontFamily: f, fontSize: `${FS.xs}px`, color: S.gold,
            }).setOrigin(1, 0));
        }
    }
}
