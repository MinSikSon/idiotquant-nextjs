// 시세판 — **여섯 개가 상한이 아니게 만드는 화면.**
//
// 회사 화면의 칩 줄은 다섯 자리뿐이다. 1999년(코스닥 신규 상장이 쏟아진 해)을 서너
// 종목으로 표현하는 것은 무리였고, 그래서 전체를 따로 여는 자리를 만든다.
// 좌상단 장소 그림을 누르면 열린다 — 사무실을 둘러보는 것이고, 그림이 들어오면
// 그 안에 모니터가 그려진다.
//
// ── 두 화면의 역할이 안 겹친다 ──────────────────────────────────
// **카드는 회사에서, 종목 고르기와 체결은 여기서.** 근거는 회사 화면에서 이미 낸 것이
// 그대로 적용된다 — 그래서 이 화면에는 손패가 없다. 정보 카드를 내고 열면
// 「권합니다」이고, 안 냈으면 「믿어보십시오」다.
//
// ── 한 턴에 권하는 것은 한 번뿐이다 ─────────────────────────────
// 고객이 한 명이니까. 시세판은 *무엇을 권할지 고르는 곳*이지 쓸어 담는 곳이 아니다.
// 다만 「거둡니다」는 여러 종목에 된다 — 보유를 정리하는 것은 권유가 아니다.

import Phaser from "phaser";
import type { Stock } from "@/lib/game/core/types";
import { C, FS, PAD, S, fontOf, mkText, money } from "@/lib/game/ui/theme";

/** 한 줄의 높이. 아홉 줄이면 다 들어가고, 한 줄을 펼치면 넘쳐서 스크롤된다. */
const ROW_H = 56;
/** 펼친 줄의 높이 — 큰 차트 + 근거 한 줄 + 버튼. */
const OPEN_H = 292;
const HEAD_H = 28;
const CLOSE_H = 60;
/** 이만큼 끌면 누른 것이 아니라 넘긴 것으로 친다. */
const DRAG_SLOP = 8;

export interface BoardRow {
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

export interface BoardDeps {
    scene: Phaser.Scene;
    width: number;
    height: number;
    /** 챕터 띠가 위에 얹혀 있으므로 그만큼 내려서 그린다. */
    top: number;
    rows(): BoardRow[];
    /** 회사 화면에서 이미 낸 근거. 없으면 null. */
    thesis(): string | null;
    /** 이번 턴에 이미 권했는가. 그러면 「권합니다」가 잠긴다. */
    alreadyRecommended(): boolean;
    /** 지금 앞에 앉은 사람의 이름. 버튼이 누구에게 하는 말인지 말한다. */
    clientName(): string;
    onBuy(id: string): void;
    onSell(id: string): void;
    onClose(): void;
}

export class QuoteBoard {
    private readonly d: BoardDeps;
    private root: Phaser.GameObjects.Container | null = null;
    private list: Phaser.GameObjects.Container | null = null;
    private mask: Phaser.Display.Masks.GeometryMask | null = null;
    private maskShape: Phaser.GameObjects.Graphics | null = null;

    /** 펼친 줄의 종목 id. 하나만 펼쳐진다 — 둘이면 어느 것에 체결하는지가 흐려진다. */
    private openId: string | null = null;
    private scrollY = 0;
    private dragging = false;
    private dragged = 0;
    private lastPtrY = 0;

    constructor(deps: BoardDeps) { this.d = deps; }

    get isOpen(): boolean { return this.root !== null; }

    open(): void {
        if (this.root) return;
        this.openId = null;
        this.scrollY = 0;
        this.draw();
    }

    close(): void {
        this.root?.destroy(true);
        this.maskShape?.destroy();
        this.root = null; this.list = null; this.mask = null; this.maskShape = null;
    }

    /** 값이 바뀌었을 때 같은 자리에 다시 그린다. 스크롤 위치는 지킨다. */
    refresh(): void {
        if (!this.root) return;
        const keep = this.scrollY;
        this.close();
        this.draw();
        this.scrollY = keep;
        this.applyScroll();
    }

    private get viewTop(): number { return this.d.top + HEAD_H; }
    private get viewH(): number { return this.d.height - this.d.top - HEAD_H - CLOSE_H; }

    private draw(): void {
        const { scene, width } = this.d;
        const root = scene.add.container(0, 0).setDepth(500);
        this.root = root;

        // 뒷 화면을 덮는다. 시세판은 오버레이가 아니라 **다른 화면**이다.
        const bg = scene.add.graphics();
        bg.fillStyle(C.screen, 1).fillRect(0, this.d.top, width, this.d.height - this.d.top);
        root.add(bg);

        this.drawHead();
        this.drawList();
        this.drawCloseBar();
    }

    private drawHead(): void {
        const { scene, width } = this.d;
        const rows = this.d.rows();
        const g = scene.add.graphics();
        g.fillStyle(C.panelHi, 1).fillRect(0, this.d.top, width, HEAD_H);
        this.root!.add(g);

        const f = fontOf(scene);
        const y = this.d.top + HEAD_H / 2;
        this.root!.add(mkText(scene, PAD, y, `상장 ${rows.length}`, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: S.inkDim,
        }).setOrigin(0, 0.5));
        this.root!.add(mkText(scene, width - PAD - 62, y, "현재가", {
            fontFamily: f, fontSize: `${FS.xs}px`, color: S.inkDim,
        }).setOrigin(1, 0.5));
        this.root!.add(mkText(scene, width - PAD, y, "등락", {
            fontFamily: f, fontSize: `${FS.xs}px`, color: S.inkDim,
        }).setOrigin(1, 0.5));
    }

    /**
     * 목록. 마스크를 씌우고 컨테이너를 끌어 스크롤한다.
     *
     * 기존 코드에 스크롤되는 목록이 없어 참고할 선례가 없었다 — 마스크·드래그·히트 영역을
     * 여기서 처음 짠다. 끈 거리가 `DRAG_SLOP` 을 넘으면 **누른 것으로 안 친다**:
     * 그러지 않으면 목록을 넘길 때마다 아무 줄이나 펼쳐진다.
     */
    private drawList(): void {
        const { scene, width } = this.d;
        const list = scene.add.container(0, this.viewTop);
        this.list = list;
        this.root!.add(list);

        const shape = scene.add.graphics();
        shape.fillStyle(0xffffff).fillRect(0, this.viewTop, width, this.viewH);
        shape.setVisible(false);
        this.maskShape = shape;
        this.mask = shape.createGeometryMask();
        list.setMask(this.mask);

        let y = 0;
        for (const row of this.d.rows()) {
            y += row.stock.id === this.openId ? this.drawOpenRow(list, row, y) : this.drawRow(list, row, y);
        }

        // 목록 전체를 덮는 판을 깔고 거기서 드래그를 받는다.
        const zone = scene.add.zone(0, this.viewTop, width, this.viewH).setOrigin(0, 0).setInteractive();
        this.root!.add(zone);
        zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
            this.dragging = true; this.dragged = 0; this.lastPtrY = p.y;
        });
        zone.on("pointermove", (p: Phaser.Input.Pointer) => {
            if (!this.dragging) return;
            const dy = p.y - this.lastPtrY;
            this.lastPtrY = p.y;
            this.dragged += Math.abs(dy);
            this.scrollY += dy;
            this.applyScroll();
        });
        const release = (p: Phaser.Input.Pointer) => {
            if (!this.dragging) return;
            this.dragging = false;
            if (this.dragged > DRAG_SLOP) return;   // 넘긴 것이지 누른 것이 아니다
            this.hitAt(p.y);
        };
        zone.on("pointerup", release);
        zone.on("pointerout", () => { this.dragging = false; });

        this.contentH = y;
        this.applyScroll();
    }

    private contentH = 0;

    private applyScroll(): void {
        if (!this.list) return;
        const min = Math.min(0, this.viewH - this.contentH);
        this.scrollY = Math.max(min, Math.min(0, this.scrollY));
        this.list.y = this.viewTop + this.scrollY;
    }

    /** 화면 좌표에서 어느 줄을 눌렀는지 찾는다. */
    private hitAt(screenY: number): void {
        const local = screenY - this.viewTop - this.scrollY;
        let y = 0;
        for (const row of this.d.rows()) {
            const h = row.stock.id === this.openId ? OPEN_H : ROW_H;
            if (local >= y && local < y + h) {
                // 펼친 줄 안쪽은 버튼이 따로 받는다. 여기서는 접기만 한다.
                if (row.stock.id === this.openId) {
                    if (local - y < ROW_H) { this.openId = null; this.refresh(); }
                    return;
                }
                this.openId = row.stock.id;
                this.refresh();
                return;
            }
            y += h;
        }
    }

    private drawRow(list: Phaser.GameObjects.Container, row: BoardRow, y: number): number {
        const { scene, width } = this.d;
        const f = fontOf(scene);
        const up = row.changePct >= 0;
        const col = up ? S.up : S.down;

        const g = scene.add.graphics();
        if (row.shares > 0) {
            // 들고 있는 줄은 왼쪽에 금색 띠. 목록을 훑을 때 내 자리가 먼저 온다.
            g.fillStyle(0x0f1a1c, 1).fillRect(0, y, width, ROW_H);
            g.fillStyle(C.gold, 1).fillRect(0, y, 3, ROW_H);
        }
        g.lineStyle(1, 0x131d1f, 1).lineBetween(0, y + ROW_H, width, y + ROW_H);
        list.add(g);

        list.add(mkText(scene, PAD, y + 10, row.stock.name, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: S.ink,
        }));
        list.add(mkText(scene, width - PAD - 62, y + 10, money(row.price), {
            fontFamily: f, fontSize: `${FS.sm}px`, color: col,
        }).setOrigin(1, 0));
        list.add(mkText(scene, width - PAD, y + 10, `${up ? "+" : ""}${row.changePct.toFixed(1)}%`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: col,
        }).setOrigin(1, 0));

        const sub = row.isNew ? "신규 상장" : row.stock.blurb;
        list.add(mkText(scene, PAD, y + 32, sub, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: row.isNew ? S.gold : S.inkDim,
        }));
        if (row.shares > 0) {
            const p = row.pnlPct;
            list.add(mkText(scene, width - PAD, y + 32,
                `${row.shares}주 · ${p >= 0 ? "+" : ""}${p.toFixed(0)}%`, {
                fontFamily: f, fontSize: `${FS.xs}px`, color: S.gold,
            }).setOrigin(1, 0));
        }
        return ROW_H;
    }

    /** 펼친 줄 — 큰 차트와 근거, 그리고 체결. */
    private drawOpenRow(list: Phaser.GameObjects.Container, row: BoardRow, y: number): number {
        const { scene, width } = this.d;
        const f = fontOf(scene);
        const up = row.changePct >= 0;

        const g = scene.add.graphics();
        g.fillStyle(0x101b1e, 1).fillRect(0, y, width, OPEN_H);
        g.fillStyle(C.gold, 1).fillRect(0, y, 3, OPEN_H);
        list.add(g);

        list.add(mkText(scene, PAD, y + 10, `${row.stock.name} · β ${row.stock.beta.toFixed(1)}`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: S.gold,
        }));
        list.add(mkText(scene, width - PAD, y + 10,
            `${money(row.price)}  ${up ? "+" : ""}${row.changePct.toFixed(1)}%`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: up ? S.up : S.down,
        }).setOrigin(1, 0));

        // 작은 꺾은선 — 이 줄에서 굳이 봉을 그리지 않는다. 크기를 정하는 데는 흐름이면 된다.
        const chartY = y + 34, chartH = 150;
        const cg = scene.add.graphics();
        cg.fillStyle(C.screen, 1).fillRect(PAD, chartY, width - PAD * 2, chartH);
        const bars = row.stock.history.slice(-24);
        if (bars.length >= 2) {
            const lo = Math.min(...bars.map(b => b.l));
            const hi = Math.max(...bars.map(b => b.h));
            const span = hi - lo || 1;
            const w = width - PAD * 2 - 8;
            cg.lineStyle(2, bars[bars.length - 1]!.c >= bars[0]!.o ? C.up : C.down, 1);
            cg.beginPath();
            bars.forEach((b, i) => {
                const px = PAD + 4 + (w * i) / (bars.length - 1);
                const py = chartY + 6 + (chartH - 12) * (1 - (b.c - lo) / span);
                if (i === 0) cg.moveTo(px, py); else cg.lineTo(px, py);
            });
            cg.strokePath();
        }
        list.add(cg);

        // 근거 — 회사 화면에서 낸 것이 그대로 온다.
        const th = this.d.thesis();
        const thY = chartY + chartH + 8;
        const tg = scene.add.graphics();
        tg.fillStyle(th ? 0x17332a : 0x2a1a16, 1).fillRect(PAD, thY, width - PAD * 2, 22);
        list.add(tg);
        list.add(mkText(scene, PAD + 6, thY + 4, th ? `근거 — ${th}` : "근거 없음", {
            fontFamily: f, fontSize: `${FS.xs}px`, color: th ? "#7fdca6" : S.down,
        }));

        // 체결 — 한 턴에 권하는 것은 한 번뿐이다.
        const btnY = thY + 28, btnH = 44, half = (width - PAD * 2 - 6) / 2;
        const locked = this.d.alreadyRecommended();
        this.cell(list, PAD, btnY, half, btnH,
            locked ? "이미 권했다" : (th ? "권합니다" : "믿어보십시오"),
            locked ? "이번 턴은 끝" : `${this.d.clientName()}에게`,
            locked ? null : () => this.d.onBuy(row.stock.id), !locked);
        this.cell(list, PAD + half + 6, btnY, half, btnH,
            "거둡니다", row.shares > 0 ? `${row.shares}주` : "보유 없음",
            row.shares > 0 ? () => this.d.onSell(row.stock.id) : null, false);

        return OPEN_H;
    }

    private cell(
        list: Phaser.GameObjects.Container,
        x: number, y: number, w: number, h: number,
        label: string, sub: string, onTap: (() => void) | null, primary: boolean,
    ): void {
        const { scene } = this.d;
        const f = fontOf(scene);
        const on = onTap !== null;
        const g = scene.add.graphics();
        g.fillStyle(on ? (primary ? 0x2f4f56 : 0x1a2a2e) : 0x151d1f, 1).fillRect(x, y, w, h);
        list.add(g);
        list.add(mkText(scene, x + w / 2, y + 8, label, {
            fontFamily: f, fontSize: `${FS.sm}px`,
            color: on ? (primary ? S.ink : "#c6d3cb") : S.inkDim,
        }).setOrigin(0.5, 0));
        list.add(mkText(scene, x + w / 2, y + 27, sub, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: on ? "#8fa8ad" : "#4a5a56",
        }).setOrigin(0.5, 0));

        if (!on) return;
        const zone = scene.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive();
        // 목록 안이라 컨테이너와 함께 움직인다. 스크롤 중 눌림은 바깥 zone 이 막는다.
        list.add(zone);
        zone.on("pointerup", () => { if (this.dragged <= DRAG_SLOP) onTap(); });
    }

    private drawCloseBar(): void {
        const { scene, width, height } = this.d;
        const y = height - CLOSE_H;
        const g = scene.add.graphics();
        g.fillStyle(C.panelHi, 1).fillRect(0, y, width, CLOSE_H);
        g.lineStyle(2, C.line, 1).lineBetween(0, y, width, y);
        this.root!.add(g);
        this.root!.add(mkText(scene, width / 2, y + CLOSE_H / 2, "사무실로", {
            fontFamily: fontOf(scene), fontSize: `${FS.md}px`, color: S.ink,
        }).setOrigin(0.5));

        const zone = scene.add.zone(0, y, width, CLOSE_H).setOrigin(0, 0).setInteractive();
        this.root!.add(zone);
        zone.on("pointerup", () => this.d.onClose());
    }
}
