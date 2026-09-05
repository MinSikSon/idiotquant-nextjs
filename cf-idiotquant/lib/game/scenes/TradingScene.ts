// 화면. **규칙은 하나도 여기서 계산하지 않는다** — `core/` 가 낸 값을 그릴 뿐이다.
//
// ── 세 장소 ─────────────────────────────────────────────────────
// 집에서 나가 회사에서 일하고 집으로 돌아온다. 그 리듬이 끊기는 날 가는 곳이 공원이다.
//
//   집    시작 · 들고 나갈 여섯 장 고르기 · 내레이션 · 챕터 결산
//   회사  12턴. 이 게임의 대부분
//   공원  끝. 조건에 따라 다른 그림, 그리고 1997 로 돌아간다
//
// 장소를 씬으로 가르지 않고 한 씬 안의 상태로 둔다 — 셋이 같은 챕터 띠와 같은 기억을
// 보고 있어서, 씬을 넘기면 그 값을 매번 실어 날라야 한다.
//
// ── 다시 그리는 방식 ────────────────────────────────────────────
// 값이 바뀌면 **화면을 통째로 다시 그린다.** 예전 화면은 자리마다 부분 갱신을 했는데,
// 띠가 여섯이고 장소가 셋이 되면서 "무엇이 바뀌면 어디를 고쳐야 하는가" 가 사람이 셀 수
// 있는 수를 넘었다. 12턴짜리 판이라 통째로 그려도 싸고, 어긋날 자리가 없어진다.

import Phaser from "phaser";
import { StockEngine, SEED_CASH, TRUST_MAX } from "@/lib/game/core/StockEngine";
import { CHAPTERS } from "@/lib/game/core/chapters";
import { DeckManager, HAND_SIZE, LOADOUT_SIZE } from "@/lib/game/core/DeckManager";
import { CLIENTS, clientAt, type Client } from "@/lib/game/core/clients";
import { decay, clampTrust, trustDelta, trustReason } from "@/lib/game/core/trust";
import {
    SITUATION_BY_ID, EMPTY_FACTS, newlyEarned, nextUp,
    type SituationFacts,
} from "@/lib/game/core/situations";
import {
    loadMemory, saveMemory, remember, regress, endReasonOf, type Memory,
} from "@/lib/game/core/progress";
import type { EndReason, MarketRead, StrategyCard, TurnBuff } from "@/lib/game/core/types";
import { NO_BUFF } from "@/lib/game/core/types";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { CardHandContainer } from "@/lib/game/components/CardHandContainer";
import { GameLog, type LogEntry } from "@/lib/game/components/GameLog";
import { QuoteBoard, type BoardRow } from "@/lib/game/components/QuoteBoard";
import {
    C, FS, LANE, PAD, S, bandsOf, designSize, fontOf, mkText, money,
    type Bands, type LogKind,
} from "@/lib/game/ui/theme";

type Place = "home" | "office" | "park";

/** 로그가 들고 있는 줄 수. 넘치면 앞에서부터 버린다. */
const LOG_KEEP = 200;
/** 칩 줄에 세우는 바로가기 수. 마지막 한 자리는 시세판을 여는 칩이다. */
const CHIP_SLOTS = 5;

export class TradingScene extends Phaser.Scene {
    /* ── 규칙 ─────────────────────────────────────────── */
    private memory!: Memory;
    private engine!: StockEngine;
    private deck!: DeckManager;
    private facts!: SituationFacts;

    /* ── 장소와 화면 ──────────────────────────────────── */
    private place: Place = "home";
    private W = 390;
    private H = 844;
    private bands!: Bands;

    /** 이 챕터에서 화면에 살아 있는 것들. 다시 그릴 때 통째로 지운다. */
    private junk: Phaser.GameObjects.GameObject[] = [];
    private chart: PixelCandleChart | null = null;
    private hand: CardHandContainer | null = null;
    private logView: GameLog | null = null;
    private board: QuoteBoard | null = null;

    /* ── 한 턴의 상태 ─────────────────────────────────── */
    private entries: LogEntry[] = [];
    private cards: StrategyCard[] = [];
    private client: Client | null = null;
    /** 이번 턴에 이미 권했는가. 고객이 한 명이라 한 번뿐이다. */
    private recommendedThisTurn = false;
    /** 이번 턴에 권한 종목과 그때의 근거. 다음 턴에 이걸로 정산한다. */
    private pending: { id: string; thesis: string | null; client: Client; cost: number } | null = null;
    private read: MarketRead | null = null;
    /** 이번 챕터에 새로 겪은 것. 챕터 결산에서 기억으로 넘어간다. */
    private earnedThisChapter: string[] = [];
    /** 떠난 고객. 신뢰가 바닥을 칠 때 한 명씩 잃는다. */
    private gone: string[] = [];
    /** 공원에 왔다면 왜 왔는가. */
    private ending: EndReason | null = null;
    /** 집에서 덱을 고르는 중인가. */
    private picking = false;

    constructor() { super("trading"); }

    /* ── 켜기 ─────────────────────────────────────────── */

    create() {
        this.memory = loadMemory();
        this.startCycle();
        this.measure();
        this.scale.on("resize", () => { this.measure(); this.redraw(); });
        this.redraw();
    }

    /** 1997년 겨울부터 다시. 회귀가 이 함수를 다시 부른다. */
    private startCycle(): void {
        this.engine = new StockEngine((Math.random() * 0xffffffff) >>> 0, SEED_CASH);
        this.facts = { ...this.memory.facts };
        this.gone = [];
        this.ending = null;
        this.earnedThisChapter = [];
        this.entries = [];
        this.place = "home";
        this.newDeck();
    }

    private newDeck(): void {
        const loadout = this.memory.loadout.length ? this.memory.loadout : this.memory.situations;
        this.deck = new DeckManager((Math.random() * 0xffffffff) >>> 0, loadout.slice(0, LOADOUT_SIZE));
    }

    private measure(): void {
        const size = designSize(this.scale.width, this.scale.height);
        this.W = size.width; this.H = size.height;
        this.bands = bandsOf(this.W, this.H);
    }

    /* ── 다시 그리기 ──────────────────────────────────── */

    private redraw(): void {
        for (const o of this.junk) o.destroy();
        this.junk = [];
        this.chart?.destroy(); this.chart = null;
        this.hand?.destroy(); this.hand = null;
        this.logView?.destroy(); this.logView = null;
        this.board?.close(); this.board = null;

        this.cameras.main.setBackgroundColor(S.bg);
        if (this.place === "home") this.drawHome();
        else if (this.place === "park") this.drawPark();
        else this.drawOffice();
    }

    private keep<T extends Phaser.GameObjects.GameObject>(o: T): T { this.junk.push(o); return o; }

    private text(x: number, y: number, s: string, size: number, color: string, origin = 0): Phaser.GameObjects.Text {
        const t = mkText(this, x, y, s, { fontFamily: fontOf(this), fontSize: `${size}px`, color });
        t.setOrigin(origin, 0);
        return this.keep(t);
    }

    private rect(x: number, y: number, w: number, h: number, color: number, alpha = 1): Phaser.GameObjects.Graphics {
        const g = this.add.graphics();
        g.fillStyle(color, alpha).fillRect(x, y, w, h);
        return this.keep(g);
    }

    /** 누를 수 있는 자리. 화면 어디든 이걸로 받는다. */
    private tap(x: number, y: number, w: number, h: number, fn: () => void): void {
        const z = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive();
        z.on("pointerup", fn);
        this.keep(z);
    }

    /* ── 챕터 띠 ──────────────────────────────────────── */

    /** 연·장, 신뢰 게이지, 빚. **셋 다 늘 보여야 한다.** */
    private drawStrip(label: string): void {
        const b = this.bands.strip;
        this.rect(b.x, b.y, b.w, b.h, C.line, 1);
        this.rect(b.x, b.y, b.w, b.h - 1, 0x2f4f56, 1);
        const cy = b.y + b.h / 2 - FS.xs / 2;

        this.text(PAD, cy, label, FS.xs, S.ink);

        // 신뢰 — 열 칸. 낮아지면 색이 금색을 거쳐 분홍으로 간다.
        const trust = this.engine.player.trust;
        const on = Math.round((trust / TRUST_MAX) * 10);
        const bw = 6, gap = 2;
        const barsW = 10 * bw + 9 * gap;
        const bx = b.w - PAD - barsW - 78;
        this.text(bx - 26, cy, "신뢰", FS.xs, "#9fc0c4");
        const col = trust <= 10 ? C.danger : trust <= 30 ? C.gold : C.up;
        for (let i = 0; i < 10; i++) {
            this.rect(bx + i * (bw + gap), b.y + 14, bw, 12, i < on ? col : 0x1b3238, 1);
        }
        // 빚 — 게이지가 아니라 숫자 한 줄. 0 이 되는 것이 게임 전체의 목표다.
        const debt = this.engine.player.debt;
        this.text(b.w - PAD, cy, debt > 0 ? `−${money(debt)}` : "빚 없음",
            FS.xs, debt > 0 ? S.down : S.up, 1);
    }

    /* ── 집 ───────────────────────────────────────────── */

    private drawHome(): void {
        const ch = this.engine.chapter;
        const idx = CHAPTERS.indexOf(ch);
        this.drawStrip(`집 · ${ch.year}   ${this.memory.cycle}회차`);

        const top = this.bands.strip.h;
        const side = Math.min(this.W - PAD * 2, Math.round(this.H * 0.30));
        const sx = (this.W - side) / 2;

        // 장소 그림 자리 — **지금은 비어 있다.** 그림이 나중에 같은 자리로 온다.
        this.rect(sx, top + 10, side, side, 0x0e1618, 1);
        this.text(this.W / 2, top + 10 + side / 2 - FS.xxl / 2, "집", FS.xxl, S.gold, 0.5);
        this.text(this.W / 2, top + 10 + side - 22, "그래픽 자리", FS.xs, "#3b4c50", 0.5);

        let y = top + side + 22;
        if (this.picking) { this.drawLoadoutPicker(y); return; }

        // 내레이션 — 1인칭. 챕터가 열릴 때마다 여기서 읽는다.
        for (const line of ch.narration) {
            this.text(this.W / 2, y, line, FS.sm, "#9aada6", 0.5);
            y += FS.sm + 8;
        }

        // 진행 중인 조건 — **채워지기 전에도 보인다.** 컨셉 이미지의 미션 패널에서 왔다.
        y += 10;
        const up = nextUp(this.facts, this.memory.situations, 3);
        if (up.length > 0) {
            this.text(PAD, y, "겪고 있는 것", FS.xs, "#4e5f58");
            y += FS.xs + 8;
            for (const s of up) {
                const [now, goal] = s.progress(this.facts);
                this.rect(PAD, y, this.W - PAD * 2, 22, 0x111a1c, 1);
                this.rect(PAD, y, Math.round(((this.W - PAD * 2) * now) / goal), 22, 0x17332a, 1);
                this.text(PAD + 6, y + 4, s.how, FS.xs, "#8d9c93");
                this.text(this.W - PAD - 6, y + 4, `${now}/${goal}`, FS.xs, S.gold, 1);
                y += 26;
            }
        }

        // 아래 줄 — 무엇을 갖고 있고 무엇을 들고 나가는가.
        const rows: Array<[string, string, string]> = [
            ["모은 상황카드", `${this.memory.situations.length} / ${Object.keys(SITUATION_BY_ID).length}`, S.up],
            ["들고 나갈 것", `${this.memory.loadout.length}장`, S.ink],
            ["맡은 돈", money(this.engine.equity), S.ink],
        ];
        y = this.bands.action.y - rows.length * 22 - 10;
        for (const [k, v, col] of rows) {
            this.rect(PAD, y + 20, this.W - PAD * 2, 1, 0x16211f, 1);
            this.text(PAD, y, k, FS.xs, "#6d7f78");
            this.text(this.W - PAD, y, v, FS.xs, col, 1);
            y += 22;
        }

        this.buttons([
            { label: "여섯 장 고른다", sub: `${this.memory.loadout.length}/${LOADOUT_SIZE}`, on: () => { this.picking = true; this.redraw(); } },
            { label: "기억", sub: `${this.memory.cycle}회차`, on: null },
            { label: "도감", sub: "", on: null },
            { label: "나간다", sub: `${ch.year}`, primary: true, on: () => this.leaveHome() },
        ]);
    }

    /** 들고 나갈 여섯 장. 모은 것이 늘어도 덱이 묽어지지 않게 한다. */
    private drawLoadoutPicker(y0: number): void {
        let y = y0;
        this.text(PAD, y, `들고 나갈 여섯 장 — ${this.memory.loadout.length}/${LOADOUT_SIZE}`, FS.sm, S.gold);
        y += FS.sm + 10;

        for (const id of this.memory.situations) {
            const s = SITUATION_BY_ID[id];
            if (!s) continue;
            const picked = this.memory.loadout.includes(id);
            const h = 30;
            this.rect(PAD, y, this.W - PAD * 2, h, picked ? 0x17332a : 0x111a1c, 1);
            this.rect(PAD, y, 3, h, LANE[s.lane].color, 1);
            this.text(PAD + 10, y + 4, s.name, FS.xs, picked ? S.ink : "#8d9c93");
            this.text(PAD + 10, y + 17, s.short, FS.xs, "#55645d");
            this.text(this.W - PAD - 6, y + 9, picked ? "◼" : "◻", FS.xs, picked ? S.gold : "#3c4844", 1);
            this.tap(PAD, y, this.W - PAD * 2, h, () => this.toggleLoadout(id));
            y += h + 3;
        }

        this.buttons([
            { label: "되돌린다", sub: "", on: () => { this.picking = false; this.redraw(); } },
            { label: "", sub: "", on: null },
            { label: "", sub: "", on: null },
            { label: "정했다", sub: `${this.memory.loadout.length}장`, primary: true,
              on: () => { this.picking = false; saveMemory(this.memory); this.newDeck(); this.redraw(); } },
        ]);
    }

    private toggleLoadout(id: string): void {
        const at = this.memory.loadout.indexOf(id);
        if (at >= 0) this.memory.loadout.splice(at, 1);
        else if (this.memory.loadout.length < LOADOUT_SIZE) this.memory.loadout.push(id);
        this.redraw();
    }

    private leaveHome(): void {
        this.place = "office";
        this.entries = [];
        this.pushLog(`${this.engine.chapter.year}년. 사무실 문을 열었다.`, "turn");
        this.beginTurn();
    }

    /* ── 회사 ─────────────────────────────────────────── */

    private drawOffice(): void {
        const e = this.engine;
        const ch = e.chapter;
        const half = e.player.currentTurn <= 6 ? "상" : "하";
        this.drawStrip(`${ch.year}. ${half}반기 · ${ch.title}   ${e.player.currentTurn}/${e.player.maxTurns}`);

        this.drawPlace();
        this.drawLog();
        this.drawChips();
        this.drawChart();
        this.drawFirm();
        this.drawActions();
    }

    /**
     * 장소 그림 자리 — **누르면 시세판이 열린다.**
     *
     * 초기 구현에는 그림이 없어 테두리와 글자뿐이다. 그래서 `▸ 시세판` 을 함께 적는다 —
     * 누를 수 있다는 것이 안 보이면 기능에 닿지 못한다. 그림이 들어오면 그 안에
     * 모니터가 그려지고 이 글자는 빠진다.
     */
    private drawPlace(): void {
        const b = this.bands.place;
        this.rect(b.x, b.y, b.w, b.h, 0x0e1618, 1);
        const g = this.add.graphics();
        g.lineStyle(1, 0x23343a, 1).strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        this.keep(g);
        this.text(b.x + b.w / 2, b.y + b.h / 2 - 14, "회사", FS.md, S.gold, 0.5);
        this.text(b.x + b.w / 2, b.y + b.h / 2 + 6, "▸ 시세판", FS.xs, "#3b4c50", 0.5);
        this.tap(b.x, b.y, b.w, b.h, () => this.openBoard());
    }

    private drawLog(): void {
        const b = this.bands.log;
        this.logView = new GameLog(this, { x: b.x, y: b.y, width: b.w, height: b.h });
        this.add.existing(this.logView);
        this.logView.setEntries(this.entries.slice(-LOG_KEEP));
    }

    /** 종목 칩 줄 — 바로가기 다섯 + 시세판을 여는 칩. */
    private drawChips(): void {
        const b = this.bands.chips;
        this.rect(b.x, b.y, b.w, b.h, C.screen, 1);

        const listed = this.engine.listed;
        // 보유 중인 것과 지금 보고 있는 것이 먼저 온다 — 내 자리가 눈에 먼저 들어와야 한다.
        const sorted = [...listed].sort((x, y) => {
            const hx = this.engine.positionOf(x.id).shares > 0 ? 1 : 0;
            const hy = this.engine.positionOf(y.id).shares > 0 ? 1 : 0;
            if (hx !== hy) return hy - hx;
            if (x.id === this.engine.focus) return -1;
            if (y.id === this.engine.focus) return 1;
            return y.listedAt - x.listedAt;
        });
        const shown = sorted.slice(0, CHIP_SLOTS);
        const more = listed.length - shown.length;

        const gap = 5;
        const cw = (b.w - PAD * 2 - gap * CHIP_SLOTS) / (CHIP_SLOTS + 1);
        const ch = b.h - 10;
        for (let i = 0; i < CHIP_SLOTS + 1; i++) {
            const x = PAD + i * (cw + gap);
            const y = b.y + 5;
            if (i === CHIP_SLOTS) {
                this.rect(x, y, cw, ch, 0x15242a, 1);
                this.text(x + cw / 2, y + 6, more > 0 ? `＋${more}` : "전체", FS.xs, "#8fb6bd", 0.5);
                this.text(x + cw / 2, y + ch - 16, "시세판", FS.xs, "#4e6a70", 0.5);
                this.tap(x, y, cw, ch, () => this.openBoard());
                continue;
            }
            const s = shown[i];
            if (!s) { this.rect(x, y, cw, ch, 0x0d1315, 1); continue; }

            const sel = s.id === this.engine.focus;
            const held = this.engine.positionOf(s.id).shares > 0;
            this.rect(x, y, cw, ch, sel ? 0x1a2a2e : 0x111a1c, 1);
            if (sel) {
                const g = this.add.graphics();
                g.lineStyle(1, C.gold, 1).strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
                this.keep(g);
            }
            if (held) this.rect(x + cw - 7, y + 3, 4, 4, C.gold, 1);

            this.text(x + cw / 2, y + 4, s.name.slice(0, 2), FS.xs, sel ? S.gold : "#9aada6", 0.5);
            const pct = this.engine.unrealizedPct(s.id);
            const last = s.history[s.history.length - 1];
            const prev = s.history[s.history.length - 2];
            const move = last && prev ? ((last.c - prev.c) / prev.c) * 100 : 0;
            const v = held ? pct : move;
            this.text(x + cw / 2, y + ch - 16, `${v >= 0 ? "+" : ""}${v.toFixed(0)}`,
                FS.xs, v >= 0 ? S.up : S.down, 0.5);
            this.tap(x, y, cw, ch, () => { this.engine.setFocus(s.id); this.redraw(); });
        }
    }

    private drawChart(): void {
        const b = this.bands.chart;
        this.chart = new PixelCandleChart(this, { x: b.x, y: b.y, width: b.w, height: b.h });
        this.add.existing(this.chart);
        const s = this.engine.focusStock;
        this.chart.render(s.history, this.read);

        this.text(b.x + PAD, b.y + 6, `${s.name} · β ${s.beta.toFixed(1)}`, FS.xs, "#9aada6");
        if (this.read?.regime) {
            const d = this.read.regimeDrift;
            this.text(b.x + b.w - PAD, b.y + 6,
                d === null ? "" : `턴당 ${d >= 0 ? "+" : ""}${d.toFixed(1)}%`,
                FS.xs, d !== null && d >= 0 ? S.up : S.down, 1);
        }
    }

    /** 운용 상황 — 고객 한 명, 내 처지 한 줄, 근거 한 줄, 그리고 손패. */
    private drawFirm(): void {
        const b = this.bands.firm;
        this.rect(b.x, b.y, b.w, b.h, 0xa7b2a9, 1);
        this.rect(b.x, b.y, b.w, 2, 0xd8e0d8, 1);

        let y = b.y + 8;

        // 고객 — 매 턴 한 명이 앞에 앉는다.
        const c = this.client;
        this.rect(PAD, y, b.w - PAD * 2, 46, 0x94a096, 1);
        this.rect(PAD, y, 3, 46, c ? C.line : C.down, 1);
        if (c) {
            this.text(PAD + 9, y + 6, c.name, FS.xs, "#101614");
            this.text(PAD + 9, y + 24, c.blurb, FS.xs, "#26332c");
        } else {
            this.text(PAD + 9, y + 16, "아무도 앉지 않았다.", FS.xs, "#7a2c1b");
        }
        y += 54;

        // 내 처지 한 줄.
        const eq = this.engine.equity;
        this.text(PAD, y, "맡은 돈", FS.xs, "#3c4844");
        this.text(PAD + 52, y, money(eq), FS.xs, eq >= SEED_CASH ? "#1d5c34" : "#8a2f1e");
        const holds = Object.keys(this.engine.player.positions).length;
        this.text(b.w - PAD, y, `보유 ${holds}종목`, FS.xs, "#3c4844", 1);
        y += 22;

        // 근거 — 이번 턴에 무엇을 근거로 대고 있는가.
        const buff = this.deck.buildBuff();
        const th = buff.thesis;
        this.rect(PAD, y, b.w - PAD * 2, 24, th ? 0x7f9a86 : 0x8f9b91, 1);
        this.text(PAD + 8, y + 6, "근거", FS.xs, "#3c4844");
        this.text(PAD + 40, y + 6, th ?? (buff.noThesis ? "저주에 막혔다" : "없음"),
            FS.xs, th ? "#123d24" : "#7a2c1b");
        y += 30;

        // 손패.
        const handH = b.y + b.h - y - 8;
        this.hand = new CardHandContainer(this, {
            x: b.x, y, width: b.w, height: handH,
            onPick: uid => this.onPickCard(uid),
        });
        this.add.existing(this.hand);
        this.hand.setHand(this.cards, card => this.deck.isIdle(card, {
            holdings: holds, cash: this.engine.player.cash,
        }));
    }

    /** 버튼은 동작이 아니라 **내가 하는 말**이다. */
    private drawActions(): void {
        const th = this.deck.buildBuff().thesis;
        const held = Object.keys(this.engine.player.positions).length;
        const done = this.recommendedThisTurn;
        this.buttons([
            {
                label: done ? "권했다" : (th ? "권합니다" : "믿어보십시오"),
                sub: done ? "이번 턴은 끝" : (th ? "근거 있음" : "근거 없음"),
                primary: !done,
                on: done || !this.client ? null : () => this.openBoard(),
            },
            { label: "거둡니다", sub: held > 0 ? `${held}종목` : "보유 없음",
              on: held > 0 ? () => this.openBoard() : null },
            { label: "기다리시죠", sub: "신뢰 −3", on: () => this.wait() },
            { label: "다음", sub: `${this.engine.player.currentTurn}/${this.engine.player.maxTurns}`,
              primary: done, on: () => this.endTurn() },
        ]);
    }

    private buttons(defs: Array<{ label: string; sub: string; primary?: boolean; on: (() => void) | null }>): void {
        const b = this.bands.action;
        this.rect(b.x, b.y, b.w, b.h, 0xa7b2a9, 1);
        this.rect(b.x, b.y, b.w, 2, 0x4e5a53, 1);

        const gap = 7;
        const cols = 2, rows = 2;
        const cw = (b.w - PAD * 2 - gap) / cols;
        const chh = (b.h - PAD * 2 - gap) / rows;
        defs.forEach((d, i) => {
            if (!d.label) return;
            const x = PAD + (i % cols) * (cw + gap);
            const y = b.y + PAD + Math.floor(i / cols) * (chh + gap);
            const on = d.on !== null;
            this.rect(x, y, cw, chh, on ? (d.primary ? 0x2f4f56 : 0x94a096) : 0x9aa69c, 1);
            this.text(x + cw / 2, y + chh / 2 - (d.sub ? 14 : 8), d.label, FS.md,
                on ? (d.primary ? "#e9f2ea" : "#101614") : "#3c4844", 0.5);
            if (d.sub) {
                this.text(x + cw / 2, y + chh / 2 + 6, d.sub, FS.xs,
                    d.primary && on ? "#9fc0c4" : "#3c4844", 0.5);
            }
            if (on) this.tap(x, y, cw, chh, d.on!);
        });
    }

    /* ── 시세판 ───────────────────────────────────────── */

    private openBoard(): void {
        if (this.board?.isOpen) return;
        this.board = new QuoteBoard({
            scene: this, width: this.W, height: this.H, top: this.bands.strip.h,
            rows: () => this.boardRows(),
            thesis: () => this.deck.buildBuff().thesis,
            alreadyRecommended: () => this.recommendedThisTurn,
            clientName: () => this.client?.name ?? "아무도",
            onBuy: id => this.recommend(id),
            onSell: id => this.sell(id),
            onClose: () => { this.board?.close(); this.board = null; this.redraw(); },
        });
        this.board.open();
    }

    private boardRows(): BoardRow[] {
        return this.engine.listed.map(s => {
            const last = s.history[s.history.length - 1];
            const prev = s.history[s.history.length - 2];
            return {
                stock: s,
                price: s.currentPrice,
                changePct: last && prev ? ((last.c - prev.c) / prev.c) * 100 : 0,
                shares: this.engine.positionOf(s.id).shares,
                pnlPct: this.engine.unrealizedPct(s.id),
                isNew: s.listedAt === this.engine.absTurn,
            };
        });
    }

    /* ── 권한다 · 거둔다 · 기다린다 ───────────────────── */

    /**
     * 권한다. **한 턴에 한 번뿐이다** — 고객이 한 명이니까.
     *
     * 근거가 없으면 고객이 거절할 수 있다. 박 대리는 거의 거절하고 어머니는 무조건 받는다.
     * 거절당하면 아무 일도 안 일어나고 신뢰만 자연 감소한다.
     */
    private recommend(id: string): void {
        if (this.recommendedThisTurn || !this.client) return;
        const buff = this.deck.buildBuff();
        const thesis = buff.thesis;
        const c = this.client;

        if (!thesis && Math.random() > c.acceptsBlind) {
            this.pushLog(`${c.name}이(가) 고개를 저었다. "근거가 뭡니까."`, "warn");
            this.recommendedThisTurn = true;
            this.closeBoardAndRedraw();
            return;
        }

        const before = this.engine.player.cash;
        const r = this.engine.buyHalf(id, buff);
        if (!r.ok) { this.pushLog(r.error, "warn"); this.closeBoardAndRedraw(); return; }

        this.engine.setFocus(id);
        this.recommendedThisTurn = true;
        this.pending = { id, thesis, client: c, cost: before - this.engine.player.cash };
        if (thesis) {
            this.facts.thesisPlays += 1;
            this.pushLog(`${c.name}에게 ${r.qty}주를 권했다. 근거는 「${thesis}」.`, "buy");
        } else {
            this.pushLog(`${c.name}에게 ${r.qty}주를 권했다. 근거는 대지 못했다.`, "buy");
        }
        if (r.fee > 0) this.pushLog(`수수료 ${money(r.fee)}.`, "fee");
        this.closeBoardAndRedraw();
    }

    private sell(id: string): void {
        const buff = this.deck.buildBuff();
        const s = this.engine.stockOf(id);
        const pnl = this.engine.unrealizedPct(id);
        const r = this.engine.sellAll(id, buff);
        if (!r.ok) { this.pushLog(r.error, "warn"); this.closeBoardAndRedraw(); return; }
        this.pushLog(`${s?.name ?? "종목"}을(를) 거뒀다. ${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%`,
            pnl >= 0 ? "up" : "down");
        // 권한 종목을 그 턴에 도로 팔면 정산은 그 결과로 한다.
        if (this.pending?.id === id) this.pending = null;
        this.closeBoardAndRedraw();
    }

    private wait(): void {
        this.facts.waitsThisChapter += 1;
        this.pushLog("오늘은 아무것도 권하지 않았다.", "turn");
        this.endTurn();
    }

    private closeBoardAndRedraw(): void {
        this.board?.close(); this.board = null;
        this.redraw();
    }

    private onPickCard(uid: string): void {
        if (!this.deck.playCard(uid)) return;
        const card = this.cards.find(c => c.uid === uid);
        if (card) this.pushLog(`「${card.name}」 — ${card.scene}`, "card");
        this.read = this.engine.read(this.deck.buildBuff());
        this.redraw();
    }

    /* ── 턴 ───────────────────────────────────────────── */

    private beginTurn(): void {
        this.cards = this.deck.dealHand();
        this.client = clientAt(this.memory.cycle, this.engine.chapter.id, this.engine.player.currentTurn, this.gone);
        this.recommendedThisTurn = false;
        this.read = this.engine.read(this.deck.buildBuff());

        const fresh = this.engine.newlyListed;
        if (fresh) this.pushLog(`${fresh.name}이(가) 상장했다. ${fresh.blurb}.`, "system");
        this.redraw();
    }

    /** 다음 턴으로. **여기서 주가가 움직이고 신뢰가 정산된다.** */
    private endTurn(): void {
        const buff = this.deck.buildBuff();
        const results = this.engine.tick(buff);

        const focus = results.find(r => r.id === this.engine.focus);
        if (focus?.news) this.pushLog(focus.news, focus.changePct >= 0 ? "up" : "down");
        if (focus) {
            this.pushLog(`${this.engine.focusStock.name} ${focus.changePct >= 0 ? "+" : ""}${focus.changePct.toFixed(1)}%`,
                focus.changePct >= 0 ? "up" : "down");
            if (focus.changePct < this.facts.worstTurnPct) this.facts.worstTurnPct = focus.changePct;
        }
        for (const id of this.engine.stoppedOut) {
            this.facts.stopHits += 1;
            this.pushLog(`손절이 걸렸다. ${this.engine.stockOf(id)?.name ?? ""} 전부 팔렸다.`, "warn");
        }

        this.settleTrust(buff);
        this.deck.consumeTurn(buff);
        this.pending = null;
        this.engine.advanceTurn();

        this.catchSituations();

        if (this.engine.isOver) { this.finishChapter(); return; }
        this.beginTurn();
    }

    /**
     * 신뢰 정산 — **결과가 아니라 결과 × 근거.**
     *
     * 운으로 벌어도 오르지 않는다. 그 한 칸이 이 게임의 논지다.
     */
    private settleTrust(buff: TurnBuff): void {
        let trust = this.engine.player.trust;

        if (this.pending) {
            const { thesis, client, id, cost } = this.pending;
            const value = this.engine.positionOf(id).shares * this.engine.priceOf(id);
            const gained = value > cost;
            let d = trustDelta({ hadThesis: thesis !== null, gained, client });
            if (d < 0 && thesis !== null && buff.softenLoss) d = Math.round(d / 2);

            trust += d;
            const why = trustReason({ hadThesis: thesis !== null, gained, client });
            this.pushLog(`${client.name} — ${why}. 신뢰 ${d >= 0 ? "+" : ""}${d}`,
                d > 0 ? "up" : d < 0 ? "warn" : "turn");

            if (thesis !== null && !gained) this.facts.thesisLosses += 1;
            if (thesis === null && !gained) this.facts.blindLosses += 1;
            if (thesis === null && gained) this.facts.blindGains += 1;
            // 김 부장 연속 — 근거를 대고 벌어 준 것만 센다.
            if (client.id === "kim") {
                this.facts.kimStreak = (thesis !== null && gained) ? this.facts.kimStreak + 1 : 0;
            }
        }

        if (!buff.noDecay) trust = decay(trust);
        this.engine.player.trust = clampTrust(trust, TRUST_MAX);

        // 신뢰가 바닥에 가까우면 한 사람이 떠난다. **떠난 고객은 안 돌아온다.**
        if (this.engine.player.trust <= 15 && this.client && this.gone.length < CLIENTS.length - 1) {
            if (!this.gone.includes(this.client.id)) {
                this.gone.push(this.client.id);
                this.pushLog(`${this.client.name}이(가) 맡긴 돈을 거둬 갔다.`, "warn");
            }
        }
    }

    /** 조건을 채웠으면 **그 자리에서** 온다. 정해진 턴이 아니다. */
    private catchSituations(): void {
        const got = newlyEarned(this.facts, [...this.memory.situations, ...this.earnedThisChapter]);
        for (const s of got) {
            this.earnedThisChapter.push(s.id);
            this.pushLog(`상황카드 — 「${s.name}」. ${s.scene}`, "system");
        }
    }

    /* ── 챕터가 끝났다 ────────────────────────────────── */

    private finishChapter(): void {
        // 챕터 끝의 사실 — 조건 몇 개가 이 값을 본다.
        this.facts.bestChapterEndTrust = Math.max(this.facts.bestChapterEndTrust, this.engine.player.trust);
        this.facts.mostHoldingsAtChapterEnd = Math.max(
            this.facts.mostHoldingsAtChapterEnd, Object.keys(this.engine.player.positions).length);
        if (this.engine.isRuined) this.facts.everRuined = true;
        this.catchSituations();

        const idx = CHAPTERS.indexOf(this.engine.chapter);
        const sum = this.engine.endChapter(this.earnedThisChapter);

        this.memory = remember(this.memory, sum, idx);
        this.memory.facts = { ...this.facts };
        saveMemory(this.memory);
        this.earnedThisChapter = [];
        this.facts.waitsThisChapter = 0;

        const end = endReasonOf({
            debt: this.engine.player.debt,
            trust: this.engine.player.trust,
            ruined: this.engine.isRuined,
            finalChapterDone: this.engine.isFinalChapter,
        });
        if (end) { this.ending = end; this.place = "park"; this.redraw(); return; }

        if (!this.engine.startNextChapter()) { this.ending = "debtRemains"; this.place = "park"; this.redraw(); return; }
        this.newDeck();
        this.place = "home";
        this.redraw();
    }

    /* ── 공원 ─────────────────────────────────────────── */

    private readonly ENDINGS: Record<EndReason, { title: string; lines: string[] }> = {
        debtCleared: { title: "갚았다", lines: ["빚이 0 이 됐다.", "공원을 지나 어디로든 갈 수 있다.", "루프가 끝났다."] },
        debtRemains: { title: "아직", lines: ["2000년이 지났고 빚은 남았다.", "끝나지 않았다.", "벤치에 앉아 눈을 감으면 — 다시 1997년이다."] },
        trustLost: { title: "폐업", lines: ["이제 아무도 나에게 맡기지 않는다.", "낮의 공원에는 나 같은 사람이 많았다.", "눈을 감으면 다시 1997년이다."] },
        ruined: { title: "전부", lines: ["맡은 돈을 다 날렸다.", "설명할 것이 남아 있지 않았다.", "눈을 감으면 다시 1997년이다."] },
    };

    private drawPark(): void {
        const reason = this.ending ?? "debtRemains";
        const info = this.ENDINGS[reason];
        const won = reason === "debtCleared";
        this.drawStrip(`공원 · ${this.engine.chapter.year}   ${this.memory.cycle}회차`);

        const top = this.bands.strip.h;
        const side = Math.min(this.W - PAD * 2, Math.round(this.H * 0.28));
        const sx = (this.W - side) / 2;
        this.rect(sx, top + 10, side, side, 0x0e1618, 1);
        this.text(this.W / 2, top + 10 + side / 2 - FS.xxl / 2, "공원", FS.xxl,
            won ? S.up : S.danger, 0.5);
        this.text(this.W / 2, top + 10 + side - 22, info.title, FS.xs, "#3b4c50", 0.5);

        let y = top + side + 22;
        for (const line of info.lines) {
            this.text(this.W / 2, y, line, FS.sm, "#9aada6", 0.5);
            y += FS.sm + 8;
        }

        // 끝나는 방법 넷 — 지금 걸린 것만 켜진다. **빚 완납만 루프를 끊는다.**
        y += 8;
        const ends: Array<[EndReason, string]> = [
            ["debtCleared", "빚 완납 — 루프를 벗어난다"],
            ["debtRemains", "빚 남음 — 1997 로"],
            ["trustLost", "신뢰 0 — 1997 로"],
            ["ruined", "자본잠식 — 1997 로"],
        ];
        const cw = (this.W - PAD * 2 - 2) / 2;
        ends.forEach(([r, label], i) => {
            const x = PAD + (i % 2) * (cw + 2);
            const ry = y + Math.floor(i / 2) * 26;
            const hit = r === reason;
            this.rect(x, ry, cw, 24, hit ? (won ? 0x123d24 : 0x3d1226) : 0x111a1c, 1);
            this.text(x + 6, ry + 6, label, FS.xs,
                hit ? (won ? S.up : S.danger) : "#4e5f58");
        });
        y += 60;

        // 남는 것과 사라지는 것.
        const rows: Array<[string, string, string]> = [
            ["남은 빚", this.engine.player.debt > 0 ? `−${money(this.engine.player.debt)}` : "0", this.engine.player.debt > 0 ? S.down : S.up],
            ["떠난 사람", this.gone.length ? this.gone.map(id => CLIENTS.find(c => c.id === id)?.name ?? id).join(" · ") : "없다", S.down],
            ["모은 상황카드", `${this.memory.situations.length} — 남는다`, S.up],
            ["회차", `${this.memory.cycle}`, S.ink],
        ];
        y = this.bands.action.y - rows.length * 22 - 10;
        for (const [k, v, col] of rows) {
            this.rect(PAD, y + 20, this.W - PAD * 2, 1, 0x16211f, 1);
            this.text(PAD, y, k, FS.xs, "#6d7f78");
            this.text(this.W - PAD, y, v, FS.xs, col, 1);
            y += 22;
        }

        this.buttons([
            { label: "기록 보기", sub: "", on: null },
            { label: "도감", sub: `${this.memory.situations.length}장`, on: null },
            { label: "", sub: "", on: null },
            {
                label: won ? "여기서 끝" : "눈을 감는다",
                sub: won ? "" : "1997 로",
                primary: true,
                on: () => this.goBack(reason),
            },
        ]);
    }

    /** 1997년 겨울로. **기억만 들고 간다.** */
    private goBack(reason: EndReason): void {
        this.memory = regress({ ...this.memory, facts: this.facts }, reason);
        saveMemory(this.memory);
        this.startCycle();
        this.pushLog("눈을 뜨니 다시 1997년 12월이었다.", "system");
        this.redraw();
    }

    /* ── 로그 ─────────────────────────────────────────── */

    private pushLog(text: string, kind: LogKind): void {
        this.entries.push({ turn: this.engine?.player.currentTurn ?? 0, kind, text });
        if (this.entries.length > LOG_KEEP) this.entries.splice(0, this.entries.length - LOG_KEEP);
    }
}
