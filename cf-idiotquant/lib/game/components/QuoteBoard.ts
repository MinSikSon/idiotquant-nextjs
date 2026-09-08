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
import type { MarketRead, Stock } from "@/lib/game/core/types";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { BTN, C, FS, PAD, S, fontOf, mkText, price, pressable, pxOf } from "@/lib/game/ui/theme";

/**
 * 한 줄의 높이. **모든 줄이 언제나 이 높이다.**
 *
 * 예전에는 고른 줄이 292px 로 펼쳐졌다(아코디언). 그러면 그 아래 줄이 전부 236px 씩
 * 밀려서, **누를 때마다 종목 위치가 바뀌었다** — 방금 본 종목을 다시 찾으려면 눈으로
 * 다시 훑어야 했다. 지금은 목록이 절대 안 움직이고, 고른 종목의 자세한 것은 아래에서
 * 올라오는 판이 진다.
 */
const ROW_H = 56;
const HEAD_H = 28;
const CLOSE_H = 60;
/**
 * 아래에서 올라오는 판의 최대 높이 — 차트 + 근거 한 줄 + 체결 버튼.
 *
 * **차트가 여기로 왔다.** 예전에는 회사 화면에 늘 떠 있었는데, 차트는 *종목을 고를 때*
 * 보는 것이지 매 턴 쳐다볼 것이 아니었다. 늘 떠 있느라 회사 화면의 3분의 1을 먹었고,
 * 정작 그 안의 국면 글씨는 씬이 그리는 머리글과 같은 자리에 겹쳐 찍혔다 —
 * 같은 값을 두 곳에서 그리고 있었던 것이다. 이제 한 곳에서만 그린다.
 */
const SHEET_MAX = 360;
/** 차트를 빼고 머리·근거·버튼만 넣는 데 드는 높이. */
const SHEET_MIN = 124;
/** 이보다 얇으면 봉의 몸통과 꼬리가 안 갈린다 — 그때는 차트를 안 그린다. */
const CHART_MIN = 96;
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
    /** 지금 읽어 낸 국면. 아직 안 알아봤으면 null — 차트가 그만큼만 말한다. */
    read(): MarketRead | null;
    /** 이번 턴 알아본 종목의 id. 안 알아봤으면 null. */
    researchedId(): string | null;
    /** 한 종목을 알아보는 데 드는 에너지. */
    researchCost(): number;
    /** 지금 알아볼 수 있는가 — 이번 턴에 아직 안 알아봤고 에너지가 남았는가. */
    canResearch(): boolean;
    onResearch(id: string): void;
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

    /**
     * 포인터의 y 를 **설계 격자로** 되돌린다.
     *
     * `p.y` 는 캔버스 좌표다. 캔버스 버퍼를 기기 해상도(설계 × k)로 잡아 두었으므로
     * 이 값은 설계 격자의 k 배다 — `GameLog` 는 이 주의사항을 지켰는데 여기는 안 지켰다.
     * 그래서 **DPR 3 폰에서 줄을 누르면 엉뚱한 줄이 잡혔고**(세 배 아래 줄, 대개
     * 목록 밖이라 아무 일도 안 났다) 드래그는 세 배 빠르게 넘어갔다.
     */
    private designY(p: Phaser.Input.Pointer): number { return p.y / pxOf(this.d.scene); }

    private get viewTop(): number { return this.d.top + HEAD_H; }
    private get viewH(): number { return this.d.height - this.d.top - HEAD_H - CLOSE_H; }

    /**
     * 아래 판의 높이. **한 줄은 반드시 남긴다** — 목록이 통째로 가리면 어디를 골랐는지
     * 알 수 없다. 화면이 아주 낮으면 최소치가 이기고, 그때는 차트가 빠진다.
     */
    private get sheetH(): number {
        return Math.min(SHEET_MAX, Math.max(SHEET_MIN, this.viewH - ROW_H));
    }

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
        // 판은 목록 **위에** 뜬다. 목록은 그대로 있고 가려질 뿐이다.
        if (this.openId) this.drawSheet();
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

        // **줄 높이가 전부 같다.** 고른 줄도 안 커진다 — 그래서 목록이 안 움직인다.
        const rows = this.d.rows();
        rows.forEach((row, i) => this.drawRow(list, row, i * ROW_H));

        // 누른 줄을 표시하는 그늘. 줄마다 zone 을 두면 드래그 스크롤과 싸우므로,
        // **판 하나로 받고 이 그늘만 옮긴다.**
        const shade = scene.add.graphics();
        shade.fillStyle(0xffffff, 0.10).fillRect(0, 0, width, ROW_H);
        shade.setVisible(false);
        list.add(shade);

        // 목록 전체를 덮는 판을 깔고 거기서 드래그를 받는다.
        const zone = scene.add.zone(0, this.viewTop, width, this.viewH).setOrigin(0, 0).setInteractive();
        this.root!.add(zone);
        const rowAt = (designY: number): number => {
            const local = designY - this.viewTop - this.scrollY;
            const i = Math.floor(local / ROW_H);
            return i >= 0 && i < rows.length ? i : -1;
        };
        zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
            this.dragging = true; this.dragged = 0; this.lastPtrY = this.designY(p);
            const i = rowAt(this.designY(p));
            if (i >= 0) { shade.y = i * ROW_H; shade.setVisible(true); }
        });
        zone.on("pointermove", (p: Phaser.Input.Pointer) => {
            if (!this.dragging) return;
            const dy = this.designY(p) - this.lastPtrY;
            this.lastPtrY = this.designY(p);
            this.dragged += Math.abs(dy);
            // 끌기 시작하면 눌린 표시를 거둔다 — 넘기는 중이지 누르는 중이 아니다.
            if (this.dragged > DRAG_SLOP) shade.setVisible(false);
            this.scrollY += dy;
            this.applyScroll();
        });
        const release = (p: Phaser.Input.Pointer) => {
            if (!this.dragging) return;
            this.dragging = false;
            shade.setVisible(false);
            if (this.dragged > DRAG_SLOP) return;   // 넘긴 것이지 누른 것이 아니다
            this.hitAt(this.designY(p));
        };
        zone.on("pointerup", release);
        zone.on("pointerout", () => { this.dragging = false; shade.setVisible(false); });

        this.contentH = rows.length * ROW_H;
        this.applyScroll();
    }

    private contentH = 0;

    private applyScroll(): void {
        if (!this.list) return;
        const min = Math.min(0, this.viewH - this.contentH);
        this.scrollY = Math.max(min, Math.min(0, this.scrollY));
        this.list.y = this.viewTop + this.scrollY;
    }

    /**
     * 화면 좌표에서 어느 줄을 눌렀는지 찾는다.
     *
     * 줄 높이가 전부 같아지면서 **나눗셈 한 번**이 됐다. 예전에는 펼친 줄이 있어서
     * 목록을 처음부터 훑으며 높이를 더해야 했다.
     */
    private hitAt(designY: number): void {
        const rows = this.d.rows();
        const local = designY - this.viewTop - this.scrollY;
        const i = Math.floor(local / ROW_H);
        const row = i >= 0 && i < rows.length ? rows[i] : undefined;
        if (!row) return;
        // 고른 줄을 다시 누르면 판을 닫는다.
        this.openId = row.stock.id === this.openId ? null : row.stock.id;
        this.refresh();
    }

    private drawRow(list: Phaser.GameObjects.Container, row: BoardRow, y: number): number {
        const { scene, width } = this.d;
        const f = fontOf(scene);
        const up = row.changePct >= 0;
        const col = up ? S.up : S.down;

        const picked = row.stock.id === this.openId;
        const g = scene.add.graphics();
        if (picked) {
            // 고른 줄 — 아래 판이 이 종목의 것이라는 표시. 자리는 그대로 두고 색만 바꾼다.
            g.fillStyle(0x16292e, 1).fillRect(0, y, width, ROW_H);
            g.lineStyle(1, C.gold, 1).strokeRect(0.5, y + 0.5, width - 1, ROW_H - 1);
        } else if (row.shares > 0) {
            // 들고 있는 줄은 왼쪽에 금색 띠. 목록을 훑을 때 내 자리가 먼저 온다.
            g.fillStyle(0x0f1a1c, 1).fillRect(0, y, width, ROW_H);
            g.fillStyle(C.gold, 1).fillRect(0, y, 3, ROW_H);
        }
        g.lineStyle(1, 0x131d1f, 1).lineBetween(0, y + ROW_H, width, y + ROW_H);
        list.add(g);

        list.add(mkText(scene, PAD, y + 10, row.stock.name, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: S.ink,
        }));
        list.add(mkText(scene, width - PAD - 62, y + 10, price(row.price), {
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

    /**
     * 고른 종목의 판 — 차트와 근거, 그리고 체결.
     *
     * **목록 안이 아니라 화면 아래에 고정으로 뜬다.** 목록 안에서 펼치면 아래 줄이
     * 전부 밀려서 누를 때마다 종목 자리가 바뀌었다. 여기 있으면 목록은 손대지 않고
     * 가려지기만 하므로, 판을 닫으면 방금 보던 자리 그대로다.
     */
    private drawSheet(): void {
        const { scene, width, height } = this.d;
        const rows = this.d.rows();
        const row = rows.find(r => r.stock.id === this.openId);
        if (!row) { this.openId = null; return; }

        const f = fontOf(scene);
        const up = row.changePct >= 0;
        const h = this.sheetH;
        const top = height - CLOSE_H - h;
        const root = this.root!;

        const g = scene.add.graphics();
        g.fillStyle(0x101b1e, 1).fillRect(0, top, width, h);
        g.lineStyle(2, C.gold, 1).lineBetween(0, top, width, top);
        root.add(g);

        // 판 위에서는 목록이 안 끌린다. 이 판이 없으면 차트를 문지를 때 뒤가 스크롤된다.
        root.add(scene.add.zone(0, top, width, h).setOrigin(0, 0).setInteractive());

        root.add(mkText(scene, PAD, top + 7, `${row.stock.name} · β ${row.stock.beta.toFixed(1)}`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: S.gold,
        }));
        root.add(mkText(scene, width - PAD, top + 7,
            `${price(row.price)}  ${up ? "+" : ""}${row.changePct.toFixed(1)}%`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: up ? S.up : S.down,
        }).setOrigin(1, 0));

        // 아래에서부터 자리를 잡는다 — 버튼과 근거는 반드시 서고, **차트가 남는 것을 쓴다.**
        const btnH = 44;
        const btnY = top + h - btnH - 8;
        const thY = btnY - 30;
        const chartY = top + 28;
        const chartH = thY - 8 - chartY;

        // 회사 화면에 늘 떠 있던 그 차트다. 여기서는 **고른 종목의 것**이라, 무엇을
        // 보고 있는지가 머리글과 붙어 있다.
        if (chartH >= CHART_MIN) {
            const chart = new PixelCandleChart(scene, {
                x: PAD, y: chartY, width: width - PAD * 2, height: chartH,
            });
            scene.add.existing(chart);
            chart.render(row.stock.history, this.d.read());
            root.add(chart);
        }

        // 근거 — **여기서 만든다.**
        //
        // 예전에는 회사 화면에서 낸 카드의 결과를 그대로 읽기만 하는 죽은 줄이었다
        // (늘 「근거 없음」이라고 적혀 있었다). 카드를 걷어 내면서 근거의 출처가
        // 사라졌으므로, 그 줄을 **누를 수 있는 줄**로 만들었다 — 판을 하나 더 세우지
        // 않고 죽은 줄을 살리는 자리다(`core/research.ts`).
        const th = this.d.thesis();
        const mine = this.d.researchedId() === row.stock.id;
        const can = this.d.canResearch();
        const cost = this.d.researchCost();

        const label = mine ? `근거 · ${row.stock.name}`
            : th ? `근거는 ${th}에 걸려 있다`
            : can ? `알아본다 · 에너지 ${cost}`
            : "알아볼 힘이 없다";
        const ink = mine ? "#7fdca6" : can ? S.gold : S.inkDim;

        const tg = scene.add.graphics();
        tg.fillStyle(mine ? 0x17332a : 0x141c1e, 1).fillRect(PAD, thY, width - PAD * 2, 22);
        if (can && !mine) tg.lineStyle(1, C.gold, 1).strokeRect(PAD + 0.5, thY + 0.5, width - PAD * 2 - 1, 21);
        root.add(tg);
        const tt = mkText(scene, PAD + 6, thY + 4, label, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: ink,
        });
        root.add(tt);

        if (can && !mine) {
            const { zone, shade } = pressable(scene, PAD, thY, width - PAD * 2, 22, [tg, tt],
                () => this.d.onResearch(row.stock.id), () => this.dragged <= DRAG_SLOP);
            root.add(shade);
            root.add(zone);
        }

        // 체결 — 한 턴에 권하는 것은 한 번뿐이다.
        const half = (width - PAD * 2 - 6) / 2;
        const locked = this.d.alreadyRecommended();
        this.cell(root, PAD, btnY, half, btnH,
            locked ? "이미 권했다" : (mine ? "권합니다" : "믿어보십시오"),
            locked ? "이번 턴은 끝" : `${this.d.clientName()}에게`,
            locked ? null : () => this.d.onBuy(row.stock.id), !locked);
        this.cell(root, PAD + half + 6, btnY, half, btnH,
            "거둡니다", row.shares > 0 ? `${row.shares}주` : "보유 없음",
            row.shares > 0 ? () => this.d.onSell(row.stock.id) : null, false);
    }

    private cell(
        parent: Phaser.GameObjects.Container,
        x: number, y: number, w: number, h: number,
        label: string, sub: string, onTap: (() => void) | null, primary: boolean,
    ): void {
        const { scene } = this.d;
        const f = fontOf(scene);
        const on = onTap !== null;
        // 색은 씬의 버튼과 **같은 표**에서 온다(`ui/theme.ts` 의 `BTN`). 두 화면이
        // 저마다 색을 정하면 같은 「권합니다」가 화면마다 달라 보인다.
        const skin = !on ? BTN.off : primary ? BTN.primary : BTN.normal;
        const g = scene.add.graphics();
        g.fillStyle(skin.face, 1).fillRect(x, y, w, h);
        g.lineStyle(1, skin.edge, 1).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        parent.add(g);
        const labelT = mkText(scene, x + w / 2, y + 8, label, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: skin.ink,
        }).setOrigin(0.5, 0);
        parent.add(labelT);
        const subT = mkText(scene, x + w / 2, y + 27, sub, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: skin.sub,
        }).setOrigin(0.5, 0);
        parent.add(subT);

        if (!on) return;
        // 아래 판은 목록 밖이라 스크롤과 안 싸운다. 그래도 끌다 뗀 것은 안 받는다.
        const { zone, shade } = pressable(scene, x, y, w, h, [g, labelT, subT], onTap,
            () => this.dragged <= DRAG_SLOP);
        parent.add(shade);
        parent.add(zone);
    }

    private drawCloseBar(): void {
        const { scene, width, height } = this.d;
        const y = height - CLOSE_H;
        const g = scene.add.graphics();
        g.fillStyle(C.panelHi, 1).fillRect(0, y, width, CLOSE_H);
        g.lineStyle(2, C.line, 1).lineBetween(0, y, width, y);
        this.root!.add(g);
        const t = mkText(scene, width / 2, y + CLOSE_H / 2, "사무실로", {
            fontFamily: fontOf(scene), fontSize: `${FS.md}px`, color: S.ink,
        }).setOrigin(0.5);
        this.root!.add(t);

        const { zone, shade } = pressable(scene, 0, y, width, CLOSE_H, [g, t],
            () => this.d.onClose());
        this.root!.add(shade);
        this.root!.add(zone);
    }
}
