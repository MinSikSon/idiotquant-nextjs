// 종목 목록 — **회사 화면의 본체.**
//
// ── 왜 화면 안으로 들어왔나 ────────────────────────────────────
// 예전에는 「시세판」이라는 **별도 화면**이었다. 종목을 고르려면 버튼을 눌러 화면을
// 옮기고 → 줄을 눌러 판을 열고 → 다시 눌러 체결하는 세 단계였고, 그보다 나쁘게는
// **애초에 종목을 골라야 하는지가 화면에 안 적혀 있었다.** 회사 화면에는 로그와
// 버튼 둘뿐이라, 처음 보는 사람에게는 「다음 턴」만 누르는 게임처럼 보였다.
//
// 목록이 늘 떠 있으면 그 질문이 사라진다. **무엇을 고를지가 화면의 일**이고,
// 고르는 것이 곧 이 게임에서 하는 일이다.
//
// ── 늘 하나가 골라져 있다 ──────────────────────────────────────
// 고른 것을 **끌 수 없다.** 판이 열리면 처음부터 한 종목이 골라져 있고, 다른 줄을
// 누르면 그리로 옮겨갈 뿐이다. 「지금 아무것도 안 골랐다」는 상태를 없애면
// 「골라야 하나?」를 물을 일이 없다.
//
// 고른 종목은 **씬이 들고 있다**(`engine.focus`). 여기서 따로 기억하면 화면을 다시
// 그릴 때 둘이 어긋난다.
//
// ── 줄은 누른다고 움직이지 않는다 ──────────────────────────────
// 줄 높이는 언제나 `ROW_H` 다. 고른 줄이 그 자리에서 펼쳐지면 아래 줄이 전부 밀려서
// **누를 때마다 종목 자리가 바뀐다.** 고른 종목의 자세한 것은 목록 아래 고정 판이
// 지고, 목록은 색만 바뀐다.

import Phaser from "phaser";
import type { MarketRead, Stock } from "@/lib/game/core/types";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { BTN, C, FS, PAD, S, type Band, fontOf, mkText, price, pressable, pxOf } from "@/lib/game/ui/theme";

/**
 * 한 줄의 높이. **모든 줄이 언제나 이 높이다.**
 *
 * 예전에는 고른 줄이 292px 로 펼쳐졌다(아코디언). 그러면 그 아래 줄이 전부 236px 씩
 * 밀려서, **누를 때마다 종목 위치가 바뀌었다** — 방금 본 종목을 다시 찾으려면 눈으로
 * 다시 훑어야 했다. 지금은 목록이 절대 안 움직이고, 고른 종목의 자세한 것은 아래에서
 * 올라오는 판이 진다.
 */
const ROW_H = 56;
/**
 * 고른 종목 판의 최대 높이 — 차트 + 근거 한 줄 + 체결 버튼.
 *
 * **차트가 여기 있다.** 예전에는 회사 화면에 늘 떠 있었는데, 차트는 *고른 종목을 볼 때*
 * 보는 것이지 매 턴 쳐다볼 것이 아니다. 늘 떠 있느라 화면의 3분의 1을 먹었고, 그 안의
 * 국면 글씨는 씬이 그리던 머리글과 같은 자리에 겹쳐 찍혔다.
 */
const SHEET_MAX = 300;
/** 차트를 빼고 머리·근거·버튼만 넣는 데 드는 높이. */
const SHEET_MIN = 124;
/** 이보다 얇으면 봉의 몸통과 꼬리가 안 갈린다 — 그때는 차트를 안 그린다. */
const CHART_MIN = 64;
/** 차트를 뺀 나머지가 쓰는 높이 — 머리 · 근거 줄 · 체결 버튼 · 여백. */
const SHEET_CHROME = 112;
/** 차트까지 서려면 판이 최소한 이만큼은 돼야 한다. */
const SHEET_WITH_CHART = SHEET_MIN + CHART_MIN + 8;
/** 이만큼 끌면 누른 것이 아니라 넘긴 것으로 친다. */
const DRAG_SLOP = 8;

export interface MarketRow {
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

export interface MarketDeps {
    scene: Phaser.Scene;
    /** 이 띠 **안에만** 그린다. 전면 화면이 아니라 회사 화면의 한 자리다. */
    band: Band;
    rows(): MarketRow[];
    /** 지금 고른 종목. **늘 하나가 골라져 있다** — null 이 없다. */
    selectedId(): string;
    onSelect(id: string): void;
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
}

export class Market {
    private readonly d: MarketDeps;
    private root: Phaser.GameObjects.Container | null = null;
    private list: Phaser.GameObjects.Container | null = null;
    private mask: Phaser.Display.Masks.GeometryMask | null = null;
    private maskShape: Phaser.GameObjects.Graphics | null = null;

    private scrollY = 0;
    private dragging = false;
    private dragged = 0;
    private lastPtrY = 0;

    constructor(deps: MarketDeps) { this.d = deps; }

    get isOpen(): boolean { return this.root !== null; }

    open(): void {
        if (this.root) return;
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

    private get viewTop(): number { return this.d.band.y; }
    private get viewH(): number { return this.d.band.h; }

    /**
     * 고른 종목 판의 높이. **내용에 딱 맞춘다 — 남는 자리는 목록이 쓴다.**
     *
     * 두 가지를 한꺼번에 막는 값이다.
     *
     * 1. 예전에는 `viewH - ROW_H` 라 **판이 목록을 거의 다 먹고 한 줄만 남았다.**
     *    한 줄짜리 목록은 목록이 아니라 머리글처럼 보여서 「고르는 곳」으로 안 읽힌다.
     * 2. 그렇다고 비율로만 자르면 **차트가 못 들어가는 어중간한 높이**가 생긴다. 그때는
     *    차트 자리가 빈 채로 남아 판 한가운데에 구멍이 뚫린다 — 실제로 그랬다.
     *
     * 그래서 차트가 설 만큼이면 비율대로 주고, 아니면 **차트를 포기하고 최소치로**
     * 줄인다. 어느 쪽이든 판에는 빈 자리가 없다.
     */
    private get sheetH(): number {
        const v = this.viewH;
        const want = Math.min(SHEET_MAX, Math.max(SHEET_MIN, Math.round(v * 0.58)));
        const need = want >= SHEET_WITH_CHART ? want : SHEET_MIN;
        return Math.min(need, Math.max(0, v - ROW_H));
    }

    /** 목록에 보이는 높이. 마지막 줄이 반쯤 걸리는 것은 「더 있다」는 표시다. */
    private get listH(): number {
        return Math.max(0, this.viewH - this.sheetH);
    }

    private draw(): void {
        const { scene, band } = this.d;
        const root = scene.add.container(0, 0);
        this.root = root;

        // 띠 안쪽만 칠한다. 오버레이가 아니라 회사 화면의 한 자리다.
        const bg = scene.add.graphics();
        bg.fillStyle(C.screen, 1).fillRect(band.x, band.y, band.w, band.h);
        root.add(bg);

        this.drawList();
        // 판은 목록 **위에** 뜬다. 목록은 그대로 있고 가려질 뿐이다.
        this.drawSheet();
    }

    /**
     * 목록. 마스크를 씌우고 컨테이너를 끌어 스크롤한다.
     *
     * 기존 코드에 스크롤되는 목록이 없어 참고할 선례가 없었다 — 마스크·드래그·히트 영역을
     * 여기서 처음 짠다. 끈 거리가 `DRAG_SLOP` 을 넘으면 **누른 것으로 안 친다**:
     * 그러지 않으면 목록을 넘길 때마다 아무 줄이나 펼쳐진다.
     */
    private drawList(): void {
        const { scene, band } = this.d;
        const width = band.w;
        const list = scene.add.container(band.x, this.viewTop);
        this.list = list;
        this.root!.add(list);

        const shape = scene.add.graphics();
        shape.fillStyle(0xffffff).fillRect(band.x, this.viewTop, width, this.listH);
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
        const zone = scene.add.zone(band.x, this.viewTop, width, this.listH).setOrigin(0, 0).setInteractive();
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
        const min = Math.min(0, this.listH - this.contentH);
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
        // **끄지 않는다.** 같은 줄을 다시 눌러도 그대로 골라져 있다 — 「아무것도 안
        // 고른 상태」를 없애야 「골라야 하나?」를 물을 일이 없다.
        if (row.stock.id !== this.d.selectedId()) this.d.onSelect(row.stock.id);
    }

    private drawRow(list: Phaser.GameObjects.Container, row: MarketRow, y: number): number {
        const { scene } = this.d;
        const width = this.d.band.w;
        const f = fontOf(scene);
        const up = row.changePct >= 0;
        const col = up ? S.up : S.down;

        const picked = row.stock.id === this.d.selectedId();
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
        const { scene, band } = this.d;
        const width = band.w;
        const rows = this.d.rows();
        const row = rows.find(r => r.stock.id === this.d.selectedId()) ?? rows[0];
        if (!row) return;

        const f = fontOf(scene);
        const up = row.changePct >= 0;
        const h = this.sheetH;
        const top = band.y + band.h - h;
        const x0 = band.x + PAD;
        const xr = band.x + width - PAD;
        const root = this.root!;

        const g = scene.add.graphics();
        g.fillStyle(0x101b1e, 1).fillRect(band.x, top, width, h);
        g.lineStyle(2, C.gold, 1).lineBetween(band.x, top, band.x + width, top);
        root.add(g);

        // 판 위에서는 목록이 안 끌린다. 이 판이 없으면 차트를 문지를 때 뒤가 스크롤된다.
        root.add(scene.add.zone(band.x, top, width, h).setOrigin(0, 0).setInteractive());

        root.add(mkText(scene, x0, top + 7, `${row.stock.name} · β ${row.stock.beta.toFixed(1)}`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: S.gold,
        }));
        root.add(mkText(scene, xr, top + 7,
            `${price(row.price)}  ${up ? "+" : ""}${row.changePct.toFixed(1)}%`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: up ? S.up : S.down,
        }).setOrigin(1, 0));

        // 아래에서부터 자리를 잡는다 — 버튼과 근거는 반드시 서고, **차트가 남는 것을 쓴다.**
        const btnH = 44;
        const btnY = top + h - btnH - 8;
        const thY = btnY - 32;
        const chartY = top + 24;
        const chartH = thY - 6 - chartY;

        // 회사 화면에 늘 떠 있던 그 차트다. 여기서는 **고른 종목의 것**이라, 무엇을
        // 보고 있는지가 머리글과 붙어 있다.
        if (chartH >= CHART_MIN) {
            const chart = new PixelCandleChart(scene, {
                x: x0, y: chartY, width: width - PAD * 2, height: chartH,
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

        const label = mine ? `이 종목은 알아봤다 — 근거가 있다`
            : th ? `이번 턴은 ${th}을(를) 알아봤다`
            : can ? `이 종목을 알아본다 — 에너지 ${cost}`
            : `알아볼 에너지가 없다 (${cost} 필요)`;
        // **아직 안 알아봤으면 이 줄이 이번 턴의 다음 걸음이다** — 그래서 버튼과 같은
        // 초록을 쓴다. 화면에 초록은 언제나 하나뿐이고, 그것이 턴을 따라 옮겨 다닌다:
        // 알아본다 → 근거를 대고 권한다 → 하루를 넘긴다.
        const skin = mine ? BTN.normal : can ? BTN.primary : BTN.off;
        const ink = mine ? "#7fdca6" : skin.ink;

        const tg = scene.add.graphics();
        tg.fillStyle(mine ? 0x17332a : skin.face, 1).fillRect(x0, thY, width - PAD * 2, 24);
        tg.lineStyle(1, mine ? 0x2c6349 : skin.edge, 1)
            .strokeRect(x0 + 0.5, thY + 0.5, width - PAD * 2 - 1, 23);
        root.add(tg);
        const tt = mkText(scene, x0 + 8, thY + 5, label, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: ink,
        });
        root.add(tt);

        if (can && !mine) {
            const { zone, shade } = pressable(scene, x0, thY, width - PAD * 2, 24, [tg, tt],
                () => this.d.onResearch(row.stock.id), () => this.dragged <= DRAG_SLOP);
            root.add(shade);
            root.add(zone);
        }

        // 체결 — 한 턴에 권하는 것은 한 번뿐이다.
        // **이름이 곧 일어나는 일이고, 부제가 그 대가다.**
        // 예전 이름은 「권합니다」/「믿어보십시오」였는데, 둘이 같은 행동(매수)인데도
        // 이름이 달라서 무엇이 다른지가 안 보였다. 다른 것은 **근거를 댔느냐**뿐이다.
        const half = (width - PAD * 2 - 6) / 2;
        const locked = this.d.alreadyRecommended();
        const who = this.d.clientName();
        this.cell(root, x0, btnY, half, btnH,
            locked ? "오늘은 이미 권했다" : mine ? "근거를 대고 권한다" : "근거 없이 권한다",
            locked ? "다음 턴에" : mine ? `${who}에게 · 현금 절반` : `틀리면 에너지가 크게 준다`,
            locked ? null : () => this.d.onBuy(row.stock.id), mine && !locked);
        this.cell(root, x0 + half + 6, btnY, half, btnH,
            row.shares > 0 ? "지금 판다" : "가진 것이 없다",
            row.shares > 0
                ? `${row.shares}주 · ${row.pnlPct >= 0 ? "+" : ""}${row.pnlPct.toFixed(0)}%`
                : "이 종목은 안 샀다",
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

}
