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
import { StockEngine, SEED_CASH, TRUST_MAX, regimeLabel } from "@/lib/game/core/StockEngine";
import { CHAPTERS } from "@/lib/game/core/chapters";
import { DeckManager, HAND_SIZE, LOADOUT_SIZE } from "@/lib/game/core/DeckManager";
import { CLIENTS, clientAt, type Client } from "@/lib/game/core/clients";
import { decay, clampTrust, trustDelta, trustReason } from "@/lib/game/core/trust";
import {
    SITUATION_BY_ID, EMPTY_FACTS, newlyEarned, nextUp,
    type SituationFacts,
} from "@/lib/game/core/situations";
import {
    loadMemory, saveMemory, remember, regress, endReasonOf, breaksLoop, type Memory,
} from "@/lib/game/core/progress";
import {
    cutStartRun, cutRegress, cutEnded, cutToOffice, cutOnChapterEnd, cutToPark, type Cut,
} from "@/lib/game/core/interlude";
import { drawInterlude } from "@/lib/game/components/Interlude";
import { preloadArt, sliceArt, drawArt, type ArtKey } from "@/lib/game/ui/art";
import type { EndReason, MarketRead, StrategyCard, TurnBuff } from "@/lib/game/core/types";
import { NO_BUFF } from "@/lib/game/core/types";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { CardHandContainer } from "@/lib/game/components/CardHandContainer";
import { GameLog, type LogEntry } from "@/lib/game/components/GameLog";
import { QuoteBoard, type BoardRow } from "@/lib/game/components/QuoteBoard";
import {
    C, FS, LANE, PAD, S, bandsOf, fontOf, mkText, money, pressable, pxOf,
    type Band, type Bands, type LogKind,
} from "@/lib/game/ui/theme";

/**
 * 지금 무엇을 보고 있는가.
 *
 * **집·회사·공원은 장소고, 시작·끝은 판을 감싸는 틀이다.** 판이 어디서 시작해서 어디서
 * 끝나는지가 화면에 없으면, 회귀가 「끝나고 다시 시작」이 아니라 「끝없이 굴러감」으로
 * 보인다. 그래서 판 바깥에 화면 둘을 둔다.
 *
 *   시작  한 판을 시작하는 자리. 회차 기록이 여기 쌓인다
 *   집    그 판의 준비 · 챕터 결산
 *   회사  12턴
 *   공원  이 판이 어떻게 끝났는가
 *   끝    **빚을 다 갚았을 때만.** 여기서는 회귀하지 않는다
 */
type Screen = "title" | "home" | "office" | "park" | "ending";

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
    private place: Screen = "title";
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
    /**
     * 이번 턴에 뭐라도 했는가 — 권했거나 거뒀거나.
     *
     * 「권했는가」와 따로 두는 이유: 거두기만 한 턴은 권한 것은 아니지만 **기다린 것도
     * 아니다.** 이 값이 `endTurn` 에서 기다림을 셀지를 가른다.
     */
    private actedThisTurn = false;
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
    /** 지금 덮여 있는 전환 막. 누르면 걷힌다. */
    private cut: Cut | null = null;

    constructor() { super("trading"); }

    /* ── 켜기 ─────────────────────────────────────────── */

    preload() { preloadArt(this); }

    create() {
        sliceArt(this);
        this.memory = loadMemory();
        // **띠부터 나눈다.** `startCycle` 이 집으로 가는 전환을 세우면서 화면을 그리는데,
        // 그 전에 `measure()` 가 돌지 않으면 `this.bands` 가 없어 씬이 그 자리에서 죽는다.
        this.measure();
        // 켜면 **시작 화면**이다. 예전에는 곧장 집이라 시작한 지점이 없었다.
        this.newRun(null);

        // 화면을 돌리거나 주소창이 숨으면 React 껍데기가 새 격자로 `setGameSize` 를 부른다.
        // 그 순간 **판을 잃지 않고** 그림만 다시 세운다 — 규칙은 전부 `core/` 에 있어서
        // 화면을 통째로 지웠다 그려도 게임 상태는 그대로다.
        this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
        });

        this.redraw();
    }

    private onResize(): void { this.measure(); this.redraw(); }

    /**
     * 판 하나를 새로 차린다. **차리기만 하고 시작하지는 않는다.**
     *
     * 예전에는 이 함수가 곧장 집으로 들여보냈다. 그래서 게임을 켜면 이미 판이 굴러가는
     * 중이었고, 회귀도 공원에서 집으로 곧장 이어져 **어디서 끝나고 어디서 시작하는지가
     * 화면에 없었다.** 지금은 여기서 시작 화면까지만 가고, 판은 사람이 눌러야 시작된다.
     */
    private newRun(cut: Cut | null): void {
        this.engine = new StockEngine((Math.random() * 0xffffffff) >>> 0, SEED_CASH);
        this.facts = { ...this.memory.facts };
        this.gone = [];
        this.ending = null;
        this.earnedThisChapter = [];
        this.entries = [];
        this.newDeck();
        this.go("title", cut);
    }

    /** 시작 화면에서 「시작한다」를 눌렀다. 여기서부터 판이다. */
    private beginRun(): void {
        this.go("home", cutStartRun(this.engine.chapter, this.memory.cycle));
    }

    /**
     * 장소를 바꾸는 **단 하나의 길.**
     *
     * 여태 `this.place = …; this.redraw()` 가 다섯 군데에 흩어져 있었다. 그래서 코드에서도
     * 흐름이 안 보였고, 전환에 무엇을 끼워 넣으려면 다섯 곳을 다 고쳐야 했다. 여기 하나로
     * 모으면 "장소가 바뀐다" 는 사건이 한 함수가 된다.
     */
    private go(to: Screen, cut: Cut | null): void {
        // 막 아래에 시세판이 남아 있으면 걷었을 때 엉뚱한 화면이 나온다.
        this.board?.close();
        this.board = null;
        this.place = to;
        this.cut = cut;
        this.picking = false;
        // 전환이 전환처럼 보이는 한 줄. 막이 이미 떠 있으므로 내용은 안 튄다.
        this.cameras.main.fadeIn(180);
        this.redraw();
    }

    /** 막을 걷는다. 여기서부터 아래 장소가 눌린다. */
    private dismissCut(): void {
        this.cut = null;
        this.redraw();
    }

    private newDeck(): void {
        const loadout = this.memory.loadout.length ? this.memory.loadout : this.memory.situations;
        this.deck = new DeckManager((Math.random() * 0xffffffff) >>> 0, loadout.slice(0, LOADOUT_SIZE));
    }

    /**
     * 지금 격자를 재고 띠를 나눈다. 켤 때 한 번, 돌릴 때마다 한 번.
     *
     * ── 여기서 `designSize()` 를 부르면 안 된다 ─────────────────────
     * `designSize` 는 **호스트 칸의 CSS 픽셀**을 받는 함수이고, 그건 이미
     * `config.ts` 와 `PhaserGame.tsx` 가 불렀다. 씬이 보는 `this.scale.width` 는
     * 그 결과에 `k` 를 곱한 **캔버스 버퍼**다 — 그걸 다시 넣으면 격자를 두 번 유도해
     * 값이 틀어진다.
     *
     * ── 카메라를 k 배 확대한다 ─────────────────────────────────────
     * 버퍼는 기기 해상도(설계 × k)로 잡혀 있다. 카메라를 그만큼 확대해야 이 아래로는
     * 전부 설계 격자 좌표로 되돌아간다 — 그래야 치수를 한 벌만 들고 있으면 되고,
     * 배율이 1 이든 3 이든 배치가 같다. **이 줄이 없으면 DPR 3 폰에서 게임이
     * 좌상단 1/3 에만 그려진다.**
     */
    private measure(): void {
        const k = pxOf(this);
        this.W = this.scale.width / k;
        this.H = this.scale.height / k;
        // 확대만 하면 카메라가 격자 한가운데를 보므로 왼쪽·위가 잘린다. 설계 격자의
        // 한가운데를 보게 해서 (0,0) 이 화면 (0,0) 에 오게 맞춘다.
        this.cameras.main.setZoom(k).centerOn(this.W / 2, this.H / 2);
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
        if (this.place === "title") this.drawTitle();
        else if (this.place === "ending") this.drawEnding();
        else if (this.place === "home") this.drawHome();
        else if (this.place === "park") this.drawPark();
        else this.drawOffice();

        // 막은 **맨 마지막에.** z 순서로 위에 서야 아래 장소의 입력을 삼킨다.
        // 여기 있으므로 화면을 돌려도(=redraw) 막이 공짜로 다시 선다.
        if (this.cut) {
            for (const o of drawInterlude(this, this.cut, this.W, this.H, () => this.dismissCut())) {
                this.keep(o);
            }
        }
    }

    /** 집·공원의 버튼 띠 — 장소가 곧 화면이므로 가로에서도 전폭이다. */
    private get placeBar(): Band {
        const h = Math.min(this.bands.action.h, Math.max(64, Math.round(this.H * 0.17)));
        return { x: 0, y: this.H - h, w: this.W, h };
    }

    private keep<T extends Phaser.GameObjects.GameObject>(o: T): T { this.junk.push(o); return o; }

    private text(x: number, y: number, s: string, size: number, color: string, origin = 0): Phaser.GameObjects.Text {
        const t = mkText(this, x, y, s, { fontFamily: fontOf(this), fontSize: `${size}px`, color });
        t.setOrigin(origin, 0);
        return this.keep(t);
    }

    /**
     * 칸을 넘치면 글자를 줄여 넣는다.
     *
     * 버튼 넷이 한 줄로 서면 칸이 87px 인데 「여섯 장 고른다」는 그보다 넓다 —
     * 가운데 정렬이라 양옆으로 흘러 화면 밖으로 잘렸다. 잘린 글자는 안 읽히므로
     * **작아도 다 보이는 쪽**을 고른다.
     */
    private textFit(
        x: number, y: number, str: string, size: number, color: string, origin: number, room: number,
    ): Phaser.GameObjects.Text {
        const t = this.text(x, y, str, size, color, origin);
        // **`width` 가 아니라 `displayWidth` 다.** `mkText` 는 선명하게 그리려고 글자를
        // k 배로 만들고 `1/k` 로 축소한다 — 그래서 `width` 는 실제로 보이는 폭의 k 배다.
        // 그걸 그대로 재면 DPR 3 폰에서 멀쩡한 글자가 3분의 1로 줄어든다.
        if (room > 0 && t.displayWidth > room) {
            t.setFontSize(Math.max(10, Math.floor(size * (room / t.displayWidth))));
        }
        return t;
    }

    private rect(x: number, y: number, w: number, h: number, color: number, alpha = 1): Phaser.GameObjects.Graphics {
        const g = this.add.graphics();
        g.fillStyle(color, alpha).fillRect(x, y, w, h);
        return this.keep(g);
    }

    /**
     * 집·공원의 큰 정사각. 그림이 있으면 그림, 없으면 이름과 「그래픽 자리」.
     *
     * 그림이 들어오면 **글자를 안 얹는다** — 밑에 캡션 한 줄이면 충분하고, 그림 한가운데
     * 큰 글씨를 놓으면 둘 다 안 읽힌다.
     */
    private placeArt(
        key: ArtKey, x: number, y: number, side: number, name: string,
        nameColor: string = S.gold, caption?: string,
    ): void {
        this.rect(x, y, side, side, 0x0e1618, 1);
        const art = drawArt(this, key, x, y, side, side);
        for (const o of art ?? []) this.keep(o);

        const g = this.add.graphics();
        g.lineStyle(1, C.line, 1).strokeRect(x + 0.5, y + 0.5, side - 1, side - 1);
        this.keep(g);

        if (art) {
            // **자리표시 문구를 그림 위에 얹지 않는다.** 캡션은 그림이 말 못 하는 것
            // (공원이라면 어떻게 끝났는지)이 있을 때만 붙는다. 장소 이름은 챕터 띠에 이미 있다.
            if (caption && side >= 120) {
                this.text(x + side / 2, y + side - 20, caption, FS.xs, nameColor, 0.5);
            }
            return;
        }
        this.text(x + side / 2, y + side / 2 - FS.xxl / 2, name,
            side >= 140 ? FS.xxl : FS.xl, nameColor, 0.5);
        if (side >= 120) this.text(x + side / 2, y + side - 20, "그래픽 자리", FS.xs, "#3b4c50", 0.5);
    }

    /**
     * 누를 수 있는 자리. 화면 어디든 이걸로 받는다.
     *
     * 넓은 면(장소 그림·칩)은 **내리지 않고 그늘만 덮는다** — 그림 한 장이 통째로
     * 2px 움직이면 눌린 게 아니라 흔들린 것으로 보인다.
     */
    private tap(x: number, y: number, w: number, h: number, fn: () => void): void {
        const { zone, shade } = pressable(this, x, y, w, h, [], fn);
        this.keep(shade);
        this.keep(zone);
    }

    /* ── 챕터 띠 ──────────────────────────────────────── */

    /**
     * 연·장, 신뢰 게이지, 빚. **셋 다 늘 보여야 한다.**
     *
     * @param withBoard 칩 줄이 빠진 격자에서 여기에 시세판 여는 길을 남긴다.
     *   짧은 화면에서 칩이 제일 먼저 양보하는데, 그렇다고 아홉 종목에 닿는 길까지
     *   같이 사라지면 안 된다.
     */
    private drawStrip(label: string, withBoard = false): void {
        const b = this.bands.strip;
        this.rect(b.x, b.y, b.w, b.h, C.line, 1);
        this.rect(b.x, b.y, b.w, b.h - 1, 0x2f4f56, 1);
        const cy = b.y + b.h / 2 - FS.xs / 2;

        // **「신뢰」에 닿기 전에 끊는다.** 예전에는 폭을 안 재고 그려서, 턴이 두 자리가
        // 되는 순간(1/12) 「1/12신뢰」로 붙어 둘 다 안 읽혔다.
        this.textFit(PAD, cy, label, FS.xs, S.ink, 0, b.w - 208);

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
        const right = withBoard ? b.w - PAD - 54 : b.w - PAD;
        this.text(right, cy, debt > 0 ? `−${money(debt)}` : "빚 없음",
            FS.xs, debt > 0 ? S.down : S.up, 1);

        if (withBoard) {
            const bw = 48, bx = b.w - PAD - bw, by = b.y + 6;
            this.rect(bx, by, bw, b.h - 12, 0x15242a, 1);
            this.text(bx + bw / 2, by + (b.h - 12) / 2 - FS.xs / 2, "시세판", FS.xs, "#8fb6bd", 0.5);
            this.tap(bx, by, bw, b.h - 12, () => this.openBoard());
        }
    }

    /* ── 시작과 끝 ────────────────────────────────────── */

    /**
     * 한 판의 문턱. **여기서 시작하고 여기로 돌아온다.**
     *
     * 회차와 기록을 보여 주는 자리이기도 하다. 회귀가 헛돌지 않는다는 것을 사람이 아는
     * 방법은 하나뿐이다 — 도는 동안 **무엇이 쌓였는지가 보이는 것.**
     */
    private drawTitle(): void {
        const m = this.memory;
        const first = m.cycle <= 1;
        const bar = this.placeBar;
        const top = PAD;
        const avail = bar.y - top;

        const rows: Array<[string, string, string]> = [
            ["회차", `${m.cycle}회차`, S.ink],
            ["가장 멀리", CHAPTERS[m.bestChapter]?.year ?? CHAPTERS[0]!.year, S.ink],
            ["모은 상황카드", `${m.situations.length} / ${Object.keys(SITUATION_BY_ID).length}`, S.up],
        ];
        if (m.escaped) rows.push(["빚 완납", "해낸 적 있다", S.gold]);
        const rowsTop = bar.y - rows.length * 22 - 8;

        const side = Math.max(56, Math.min(this.W - PAD * 2, Math.round(avail * 0.34)));
        const sx = (this.W - side) / 2;
        this.placeArt("home", sx, top, side, "재기", S.gold);

        let y = top + side + 16;
        this.textFit(this.W / 2, y, "재기", FS.xxl, S.gold, 0.5, this.W - PAD * 2);
        y += FS.xxl + 6;
        this.textFit(this.W / 2, y, "1997년 12월, 서울", FS.sm, "#9aada6", 0.5, this.W - PAD * 2);
        y += FS.sm + 14;

        const line = first
            ? "증권사를 나온 지 한 달이 됐다."
            : m.escaped
                ? "한 번 빠져나온 적이 있다. 다시 들어간다."
                : "또 1997년이다. 이번에는 다르게 해 본다.";
        if (y + FS.sm <= rowsTop) {
            this.textFit(this.W / 2, y, line, FS.sm, "#8d9c93", 0.5, this.W - PAD * 2);
        }

        let ry = rowsTop;
        for (const [k, v, col] of rows) {
            this.rect(PAD, ry + 20, this.W - PAD * 2, 1, 0x16211f, 1);
            this.text(PAD, ry, k, FS.xs, "#6d7f78");
            this.textFit(this.W - PAD, ry, v, FS.xs, col, 1, this.W / 2);
            ry += 22;
        }

        this.buttons([
            { label: first ? "시작한다" : "다시 시작한다", sub: `${m.cycle}회차`,
              primary: true, on: () => this.beginRun() },
        ], bar);
    }

    /**
     * 끝. **빚을 다 갚았을 때만 여기에 온다.**
     *
     * 이 화면의 존재 이유는 하나다 — 루프에 끝이 있다는 것을 보여 주는 것. 「처음부터」를
     * 누르면 그때 비로소 새 판이고, 그것도 시작 화면으로 간다.
     */
    private drawEnding(): void {
        const m = this.memory;
        const bar = this.placeBar;
        const top = PAD;
        const avail = bar.y - top;

        const rows: Array<[string, string, string]> = [
            ["걸린 회차", `${m.cycle}회차`, S.gold],
            ["모은 상황카드", `${m.situations.length} / ${Object.keys(SITUATION_BY_ID).length}`, S.up],
            ["남은 빚", "0", S.up],
        ];
        const rowsTop = bar.y - rows.length * 22 - 8;

        const side = Math.max(56, Math.min(this.W - PAD * 2, Math.round(avail * 0.34)));
        const sx = (this.W - side) / 2;
        this.placeArt("park-debtCleared", sx, top, side, "공원", S.up, "갚았다");

        let y = top + side + 16;
        this.textFit(this.W / 2, y, "빚을 다 갚았다", FS.xl, S.up, 0.5, this.W - PAD * 2);
        y += FS.xl + 10;

        for (const s of [
            "2000년의 겨울을 빚 없이 넘겼다.",
            "공원을 지나 어디로든 갈 수 있다.",
            "이 회차는 여기서 끝난다.",
        ]) {
            if (y + FS.sm > rowsTop) break;
            this.textFit(this.W / 2, y, s, FS.sm, "#9aada6", 0.5, this.W - PAD * 2);
            y += FS.sm + 7;
        }

        let ry = rowsTop;
        for (const [k, v, col] of rows) {
            this.rect(PAD, ry + 20, this.W - PAD * 2, 1, 0x16211f, 1);
            this.text(PAD, ry, k, FS.xs, "#6d7f78");
            this.textFit(this.W - PAD, ry, v, FS.xs, col, 1, this.W / 2);
            ry += 22;
        }

        this.buttons([
            { label: "처음부터", sub: "기억은 남는다", primary: true,
              on: () => this.goBack("debtCleared") },
        ], bar);
    }

    /* ── 집 ───────────────────────────────────────────── */

    /**
     * 집. **장소가 곧 화면이라 두 칸 배치를 안 쓴다** — 가로에서도 전폭이다.
     *
     * 세로가 짧으면 블록이 겹친다. 그래서 고정 오프셋으로 쌓지 않고 **남는 세로를 재서
     * 들어가는 것만 그린다** — 요약 줄은 버튼 띠에서 위로 붙이고, 조건 줄은 그 위에
     * 자리가 남을 때만 선다. 내레이션은 마지막까지 지킨다(이 화면의 이유다).
     */
    private drawHome(): void {
        const ch = this.engine.chapter;
        this.drawStrip(`집 · ${ch.year}   ${this.memory.cycle}회차`);

        const bar = this.placeBar;
        const top = this.bands.strip.h;
        const avail = bar.y - top;

        // 요약 줄은 아래에 못 박는다 — 무엇을 갖고 있는지는 늘 보여야 한다.
        const rows: Array<[string, string, string]> = [
            ["모은 상황카드", `${this.memory.situations.length} / ${Object.keys(SITUATION_BY_ID).length}`, S.up],
            ["들고 나갈 것", `${this.memory.loadout.length}장`, S.ink],
            ["맡은 돈", money(this.engine.equity), S.ink],
        ];
        const rowsH = rows.length * 22;
        const rowsTop = bar.y - rowsH - 8;

        // 정사각은 남는 세로의 절반까지만. 그래야 아래 글이 설 자리가 남는다.
        const side = Math.max(56, Math.min(this.W - PAD * 2, Math.round(avail * 0.40)));
        const sx = (this.W - side) / 2;
        this.placeArt("home", sx, top + 8, side, "집");

        let y = top + 8 + side + 14;
        if (this.picking) { this.drawLoadoutPicker(y, rowsTop); return; }

        // 내레이션 — 들어가는 줄만.
        for (const line of ch.narration) {
            if (y + FS.sm > rowsTop) break;
            this.textFit(this.W / 2, y, line, FS.sm, "#9aada6", 0.5, this.W - PAD * 2);
            y += FS.sm + 7;
        }

        // 겪고 있는 것 — 자리가 남을 때만. 조건은 채워지기 전에도 보여야 끌어당긴다.
        const up = nextUp(this.facts, this.memory.situations, 3);
        const needHead = FS.xs + 8;
        if (up.length > 0 && y + needHead + 26 <= rowsTop) {
            y += 8;
            this.text(PAD, y, "겪고 있는 것", FS.xs, "#4e5f58");
            y += needHead;
            for (const s2 of up) {
                if (y + 26 > rowsTop) break;
                const [now, goal] = s2.progress(this.facts);
                this.rect(PAD, y, this.W - PAD * 2, 22, 0x111a1c, 1);
                this.rect(PAD, y, Math.round(((this.W - PAD * 2) * now) / goal), 22, 0x17332a, 1);
                this.textFit(PAD + 6, y + 4, s2.how, FS.xs, "#8d9c93", 0, this.W - PAD * 2 - 64);
                this.text(this.W - PAD - 6, y + 4, `${now}/${goal}`, FS.xs, S.gold, 1);
                y += 26;
            }
        }

        let ry = rowsTop;
        for (const [k, v, col] of rows) {
            this.rect(PAD, ry + 20, this.W - PAD * 2, 1, 0x16211f, 1);
            this.text(PAD, ry, k, FS.xs, "#6d7f78");
            this.text(this.W - PAD, ry, v, FS.xs, col, 1);
            ry += 22;
        }

        // 죽은 버튼을 두지 않는다 — 넷을 세우면 칸이 87px 로 좁아져 글자가 잘린다.
        this.buttons([
            { label: "여섯 장 고른다", sub: `${this.memory.loadout.length}/${LOADOUT_SIZE}`,
              on: () => { this.picking = true; this.redraw(); } },
            { label: "나간다", sub: ch.year, primary: true, on: () => this.leaveHome() },
        ], bar);
    }

    /**
     * 들고 나갈 여섯 장. 모은 것이 늘어도 덱이 묽어지지 않게 한다.
     *
     * @param bottom 이 아래로는 못 그린다(버튼 띠와 요약 줄이 있다). 목록이 넘치면
     *   거기서 끊고 **몇 장이 더 있는지**를 한 줄로 말한다 — 스크롤을 여기까지
     *   만들 값어치는 없다. 어차피 고를 수 있는 것은 여섯 장뿐이다.
     */
    private drawLoadoutPicker(y0: number, bottom: number): void {
        let y = y0;
        this.text(PAD, y, `들고 나갈 여섯 장 — ${this.memory.loadout.length}/${LOADOUT_SIZE}`, FS.sm, S.gold);
        y += FS.sm + 10;

        const h = 30;
        let shown = 0;
        for (const id of this.memory.situations) {
            const s = SITUATION_BY_ID[id];
            if (!s) continue;
            if (y + h > bottom) break;
            const picked = this.memory.loadout.includes(id);
            this.rect(PAD, y, this.W - PAD * 2, h, picked ? 0x17332a : 0x111a1c, 1);
            this.rect(PAD, y, 3, h, LANE[s.lane].color, 1);
            this.textFit(PAD + 10, y + 4, s.name, FS.xs, picked ? S.ink : "#8d9c93", 0, this.W - PAD * 2 - 40);
            this.textFit(PAD + 10, y + 17, s.short, FS.xs, "#55645d", 0, this.W - PAD * 2 - 40);
            this.text(this.W - PAD - 6, y + 9, picked ? "◼" : "◻", FS.xs, picked ? S.gold : "#3c4844", 1);
            this.tap(PAD, y, this.W - PAD * 2, h, () => this.toggleLoadout(id));
            y += h + 3;
            shown += 1;
        }
        const left = this.memory.situations.length - shown;
        if (left > 0 && y + FS.xs <= bottom) {
            this.text(PAD, y, `그리고 ${left}장 더 — 화면을 돌리면 다 보입니다`, FS.xs, "#4e5f58");
        }

        this.buttons([
            { label: "되돌린다", sub: "", on: () => { this.picking = false; this.redraw(); } },
            { label: "정했다", sub: `${this.memory.loadout.length}장`, primary: true,
              on: () => { this.picking = false; saveMemory(this.memory); this.newDeck(); this.redraw(); } },
        ], this.placeBar);
    }

    private toggleLoadout(id: string): void {
        const at = this.memory.loadout.indexOf(id);
        if (at >= 0) this.memory.loadout.splice(at, 1);
        else if (this.memory.loadout.length < LOADOUT_SIZE) this.memory.loadout.push(id);
        this.redraw();
    }

    private leaveHome(): void {
        this.entries = [];
        this.pushLog(`${this.engine.chapter.year}년. 사무실 문을 열었다.`, "turn");
        this.go("office", cutToOffice(this.engine.chapter));
        this.beginTurn();
    }

    /* ── 회사 ─────────────────────────────────────────── */

    private drawOffice(): void {
        const e = this.engine;
        const ch = e.chapter;
        const half = e.player.currentTurn <= 6 ? "상" : "하";
        // 칩 줄이 없는 격자에서는 챕터 띠가 시세판 여는 길을 대신 든다.
        const noChips = this.bands.chips.h <= 0;
        this.drawStrip(`${ch.year}. ${half}반기 · ${ch.title}   ${e.player.currentTurn}/${e.player.maxTurns}`, noChips);

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
        if (b.h <= 0) return;
        this.rect(b.x, b.y, b.w, b.h, 0x0e1618, 1);

        // 그림이 들어왔다 — 책상 위 CRT 두 대. 주석이 예고하던 그 모니터다.
        const art = drawArt(this, "office", b.x, b.y, b.w, b.h);
        for (const o of art ?? []) this.keep(o);

        const g = this.add.graphics();
        g.lineStyle(1, 0x23343a, 1).strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        this.keep(g);

        // 그림이 있으면 이름은 빼고 **누를 수 있다는 표시만** 남긴다 — 그림 위에 글자를
        // 두 줄 얹으면 둘 다 안 읽힌다.
        const twoLines = b.h >= 56;
        if (art) {
            if (twoLines) this.text(b.x + b.w / 2, b.y + b.h - 16, "▸ 시세판", FS.xs, S.gold, 0.5);
        } else {
            // 정사각이 작아지면 글자도 같이 줄인다. 두 줄이 안 들어가면 이름만 남긴다.
            this.text(b.x + b.w / 2, b.y + b.h / 2 - (twoLines ? 14 : FS.xs / 2),
                "회사", twoLines ? FS.md : FS.xs, S.gold, 0.5);
            if (twoLines) this.text(b.x + b.w / 2, b.y + b.h / 2 + 6, "▸ 시세판", FS.xs, "#3b4c50", 0.5);
        }
        this.tap(b.x, b.y, b.w, b.h, () => this.openBoard());
    }

    private drawLog(): void {
        const b = this.bands.log;
        if (b.h <= 0) return;
        this.logView = new GameLog(this, { x: b.x, y: b.y, width: b.w, height: b.h });
        this.add.existing(this.logView);
        this.logView.setEntries(this.entries.slice(-LOG_KEEP));
    }

    /** 종목 칩 줄 — 바로가기 다섯 + 시세판을 여는 칩. */
    private drawChips(): void {
        const b = this.bands.chips;
        if (b.h <= 0) return;   // 짧은 격자에서는 양보했다 — 챕터 띠가 시세판을 든다
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
            // 줄이 낮으면 한 줄만 쓴다. 두 줄을 밀어 넣으면 글자가 서로 겹쳐
            // 둘 다 안 읽힌다 — 눕힌 화면에서 실제로 그랬다.
            const twoLines = ch >= 34;
            if (i === CHIP_SLOTS) {
                // **「시세판」이라고 두 번 쓰지 않는다.** 버튼 띠에 같은 이름의 버튼이
                // 있고, 이 칸은 종목 칩 줄 끝에 있어 「전체」만으로 뜻이 선다.
                this.rect(x, y, cw, ch, 0x15242a, 1);
                this.textFit(x + cw / 2, y + ch / 2 - FS.xs / 2,
                    more > 0 ? `＋${more}` : "전체", FS.xs, "#8fb6bd", 0.5, cw - 4);
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

            const pct = this.engine.unrealizedPct(s.id);
            const last = s.history[s.history.length - 1];
            const prev = s.history[s.history.length - 2];
            const move = last && prev ? ((last.c - prev.c) / prev.c) * 100 : 0;
            const v = held ? pct : move;
            this.textFit(x + cw / 2, y + (twoLines ? 4 : ch / 2 - FS.xs / 2), s.name.slice(0, 2),
                FS.xs, sel ? S.gold : "#9aada6", 0.5, cw - 4);
            if (twoLines) {
                this.textFit(x + cw / 2, y + ch - 16, `${v >= 0 ? "+" : ""}${v.toFixed(0)}`,
                    FS.xs, v >= 0 ? S.up : S.down, 0.5, cw - 4);
            }
            this.tap(x, y, cw, ch, () => { this.engine.setFocus(s.id); this.redraw(); });
        }
    }

    private drawChart(): void {
        const b = this.bands.chart;
        this.chart = new PixelCandleChart(this, { x: b.x, y: b.y, width: b.w, height: b.h });
        this.add.existing(this.chart);
        const s = this.engine.focusStock;
        this.chart.render(s.history, this.read);

        // **가운데에 쓴다.** 차트가 왼쪽 위·아래와 오른쪽 아래에 가격 눈금을 그리므로,
        // 모서리에 붙이면 숫자와 겹쳐 둘 다 안 읽힌다.
        this.textFit(b.x + b.w / 2, b.y + 5, `${s.name} · β ${s.beta.toFixed(1)}`,
            FS.xs, "#9aada6", 0.5, b.w - PAD * 2);
        const d = this.read?.regime ? this.read.regimeDrift : null;
        if (d !== null) {
            this.textFit(b.x + b.w / 2, b.y + b.h - FS.xs - 5,
                `${regimeLabel(this.read!.regime!)} · 턴당 ${d >= 0 ? "+" : ""}${d.toFixed(1)}%`,
                FS.xs, d >= 0 ? S.up : S.down, 0.5, b.w - PAD * 2);
        }
    }

    /** 운용 상황 — 고객 한 명, 내 처지 한 줄, 근거 한 줄, 그리고 손패. */
    private drawFirm(): void {
        const b = this.bands.firm;
        // **좌표는 전부 띠 상대값이다.** 가로(두 칸)에서 이 띠는 오른쪽 절반에 있어서,
        // 절대 `PAD` 로 적으면 내용이 왼쪽 칸의 차트 위에 겹쳐 그려진다.
        const x0 = b.x + PAD;
        const iw = b.w - PAD * 2;
        const xr = b.x + b.w - PAD;

        this.rect(b.x, b.y, b.w, b.h, 0xa7b2a9, 1);
        this.rect(b.x, b.y, b.w, 2, 0xd8e0d8, 1);

        let y = b.y + 8;

        // 고객 — 매 턴 한 명이 앞에 앉는다.
        const c = this.client;
        const clientH = Math.min(46, Math.max(28, Math.round(b.h * 0.17)));
        this.rect(x0, y, iw, clientH, 0x94a096, 1);
        this.rect(x0, y, 3, clientH, c ? C.line : C.down, 1);
        if (c) {
            this.textFit(x0 + 9, y + 5, c.name, FS.xs, "#101614", 0, iw - 18);
            if (clientH >= 40) this.textFit(x0 + 9, y + 23, c.blurb, FS.xs, "#26332c", 0, iw - 18);
        } else {
            this.text(x0 + 9, y + clientH / 2 - FS.xs / 2, "아무도 앉지 않았다.", FS.xs, "#7a2c1b");
        }
        y += clientH + 8;

        // 내 처지 한 줄.
        const eq = this.engine.equity;
        this.text(x0, y, "맡은 돈", FS.xs, "#3c4844");
        this.text(x0 + 52, y, money(eq), FS.xs, eq >= SEED_CASH ? "#1d5c34" : "#8a2f1e");
        const holds = Object.keys(this.engine.player.positions).length;
        this.text(xr, y, `보유 ${holds}종목`, FS.xs, "#3c4844", 1);
        y += 22;

        // 근거 — 이번 턴에 무엇을 근거로 대고 있는가.
        const buff = this.deck.buildBuff();
        const th = buff.thesis;
        this.rect(x0, y, iw, 24, th ? 0x7f9a86 : 0x8f9b91, 1);
        this.text(x0 + 8, y + 6, "근거", FS.xs, "#3c4844");
        this.text(x0 + 40, y + 6, th ?? (buff.noThesis ? "저주에 막혔다" : "없음"),
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
    /**
     * 이 턴에 할 수 있는 일은 **둘뿐이다** — 시세판을 열거나, 턴을 넘기거나.
     *
     * 예전에는 버튼이 넷이었는데 실제로 일어나는 일은 둘이었다.
     * 「믿어보십시오」와 「거둡니다」는 **둘 다 시세판을 열 뿐이고**(체결은 시세판의 종목
     * 줄에서 한다), 「기다리시죠」와 「다음」은 **둘 다 턴을 넘겼다.** 넷을 세워 두니
     * 무엇을 눌러야 하는지가 흐려졌다 — 시세판을 여는 길은 장소 그림과 칩 줄까지 합쳐
     * 넷이나 됐다.
     *
     * 겉만 흐린 것이 아니었다. **같은 행동이 어느 버튼을 눌렀느냐에 따라 다르게 세어졌다** —
     * 안 권하고 넘기는 것은 어느 쪽이든 기다린 것인데 「기다리시죠」만
     * 「기다릴 줄 알게 됐다」에 셌다. 그 셈은 이제 `endTurn` 이 한다.
     */
    private drawActions(): void {
        const th = this.deck.buildBuff().thesis;
        const held = Object.keys(this.engine.player.positions).length;
        const done = this.recommendedThisTurn;

        // 버튼이 둘뿐이므로 이번 턴의 상태는 부제가 진다 — 권할 수 있는지, 뭘 들고 있는지.
        const sub = done
            ? (held > 0 ? `권했다 · 보유 ${held}` : "권했다")
            : (th ? `근거 있음${held > 0 ? ` · 보유 ${held}` : ""}`
                  : `근거 없음${held > 0 ? ` · 보유 ${held}` : ""}`);

        this.buttons([
            { label: "시세판", sub, primary: !done, on: () => this.openBoard() },
            {
                label: "다음 턴",
                // 안 권하고 넘기면 그것이 곧 기다리는 것이다. 대가를 누르기 전에 말한다.
                sub: done
                    ? `${this.engine.player.currentTurn}/${this.engine.player.maxTurns}`
                    : "기다린다 · 신뢰 −3",
                primary: done,
                on: () => this.endTurn(),
            },
        ]);
    }

    /**
     * @param band 어느 띠에 세울까. 안 주면 회사 화면의 버튼 띠.
     *   **집·공원은 두 칸 배치를 안 쓴다** — 장소가 곧 화면이라 가로에서도 전폭이다.
     */
    private buttons(
        defs: Array<{ label: string; sub: string; primary?: boolean; on: (() => void) | null }>,
        band?: Band,
    ): void {
        const b = band ?? this.bands.action;
        this.rect(b.x, b.y, b.w, b.h, 0xa7b2a9, 1);
        this.rect(b.x, b.y, b.w, 2, 0x4e5a53, 1);

        const gap = 7;
        // **몇 개를 세우느냐로 칸을 나눈다.** 4칸 격자에 둘만 넣으면 왼쪽 절반에 몰리고
        // 칸이 87px 로 좁아져 「여섯 장 고른다」가 줄어든다.
        //
        // 두 줄 배치는 없앴다 — 이제 어느 화면도 버튼이 둘을 넘지 않는다.
        const live = defs.filter(d => d.label).length;
        const cols = Math.max(1, live);
        const cw = (b.w - PAD * 2 - gap * (cols - 1)) / cols;
        const chh = b.h - PAD * 2;

        defs.forEach((d, i) => {
            if (!d.label) return;
            const x = b.x + PAD + i * (cw + gap);
            const y = b.y + PAD;
            const on = d.on !== null;
            const face = this.rect(x, y, cw, chh, on ? (d.primary ? 0x2f4f56 : 0x94a096) : 0x9aa69c, 1);
            const showSub = Boolean(d.sub) && chh >= 40;
            const size = cw < 84 ? FS.sm : FS.md;
            const room = cw - 8;
            const label = this.textFit(x + cw / 2, y + chh / 2 - (showSub ? 14 : size / 2), d.label, size,
                on ? (d.primary ? "#e9f2ea" : "#101614") : "#3c4844", 0.5, room);
            const subT = showSub
                ? this.textFit(x + cw / 2, y + chh / 2 + 6, d.sub, FS.xs,
                    d.primary && on ? "#9fc0c4" : "#3c4844", 0.5, room)
                : null;
            if (!on) return;
            // 버튼은 **얼굴과 글자가 같이 내려간다** — 실제로 눌러 들어가는 느낌이 난다.
            const parts = subT ? [face, label, subT] : [face, label];
            const { zone, shade } = pressable(this, x, y, cw, chh, parts, d.on!);
            this.keep(shade);
            this.keep(zone);
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
            // 거절당해도 **권하려 한 턴**이다 — 기다린 것으로 세지 않는다.
            this.recommendedThisTurn = true;
            this.actedThisTurn = true;
            this.closeBoardAndRedraw();
            return;
        }

        const before = this.engine.player.cash;
        const r = this.engine.buyHalf(id, buff);
        if (!r.ok) { this.pushLog(r.error, "warn"); this.closeBoardAndRedraw(); return; }

        this.engine.setFocus(id);
        this.recommendedThisTurn = true;
        this.actedThisTurn = true;
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
        this.actedThisTurn = true;
        // 권한 종목을 그 턴에 도로 팔면 정산은 그 결과로 한다.
        if (this.pending?.id === id) this.pending = null;
        this.closeBoardAndRedraw();
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
        this.actedThisTurn = false;
        this.read = this.engine.read(this.deck.buildBuff());

        const fresh = this.engine.newlyListed;
        if (fresh) this.pushLog(`${fresh.name}이(가) 상장했다. ${fresh.blurb}.`, "system");
        this.redraw();
    }

    /** 다음 턴으로. **여기서 주가가 움직이고 신뢰가 정산된다.** */
    private endTurn(): void {
        // 아무것도 안 하고 넘긴 턴은 기다린 것으로 센다. **버튼이 아니라 행동으로 센다** —
        // 예전에는 「기다리시죠」로 넘긴 것만 세어서, 똑같이 흘려보낸 턴인데도 「다음」을
        // 누르면 「기다릴 줄 알게 됐다」가 안 채워졌다.
        if (!this.actedThisTurn) {
            this.facts.waitsThisChapter += 1;
            this.pushLog("오늘은 아무것도 하지 않았다.", "turn");
        }

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
        // 결산 머리에 쓸 연도. `startNextChapter()` 뒤에 읽으면 **다음 장의 연도**가 나온다.
        const done = this.engine.chapter;
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
        if (end) return this.toPark(end);
        if (!this.engine.startNextChapter()) return this.toPark("debtRemains");

        this.newDeck();
        // **여기가 결산이 처음 보이는 자리다.** 여태 `sum` 은 기억으로만 흘러들어가고
        // 화면에 한 번도 안 나왔다. 집으로 돌아오는 전환이 그것을 말한다.
        this.go("home", cutOnChapterEnd(done, sum, money));
    }

    private toPark(reason: EndReason): void {
        this.ending = reason;
        this.go("park", cutToPark(this.engine.chapter, reason, this.ENDINGS[reason].title));
    }

    /* ── 공원 ─────────────────────────────────────────── */

    private readonly ENDINGS: Record<EndReason, { title: string; lines: string[] }> = {
        debtCleared: { title: "갚았다", lines: ["빚이 0 이 됐다.", "공원을 지나 어디로든 갈 수 있다.", "루프가 끝났다."] },
        debtRemains: { title: "아직", lines: ["2000년이 지났고 빚은 남았다.", "끝나지 않았다.", "벤치에 앉아 눈을 감으면 — 다시 1997년이다."] },
        trustLost: { title: "폐업", lines: ["이제 아무도 나에게 맡기지 않는다.", "낮의 공원에는 나 같은 사람이 많았다.", "눈을 감으면 다시 1997년이다."] },
        ruined: { title: "전부", lines: ["맡은 돈을 다 날렸다.", "설명할 것이 남아 있지 않았다.", "눈을 감으면 다시 1997년이다."] },
    };

    /** 공원. 집과 같은 예산 규칙 — **안 들어가는 블록은 안 그린다.** */
    private drawPark(): void {
        const reason = this.ending ?? "debtRemains";
        const info = this.ENDINGS[reason];
        // **규칙은 core 에 있다.** 화면이 조건을 다시 적으면 둘이 어긋난다.
        const won = breaksLoop(reason);
        this.drawStrip(`공원 · ${this.engine.chapter.year}   ${this.memory.cycle}회차`);

        const bar = this.placeBar;
        const top = this.bands.strip.h;
        const avail = bar.y - top;

        const rows: Array<[string, string, string]> = [
            ["남은 빚", this.engine.player.debt > 0 ? `−${money(this.engine.player.debt)}` : "0",
                this.engine.player.debt > 0 ? S.down : S.up],
            ["떠난 사람", this.gone.length
                ? this.gone.map(id => CLIENTS.find(c => c.id === id)?.name ?? id).join(" · ") : "없다", S.down],
            ["모은 상황카드", `${this.memory.situations.length} — 남는다`, S.up],
        ];
        const rowsTop = bar.y - rows.length * 22 - 8;

        const side = Math.max(56, Math.min(this.W - PAD * 2, Math.round(avail * 0.36)));
        const sx = (this.W - side) / 2;
        // **끝난 방식에 따라 그림이 갈린다** — 아직 굴러가는 둘은 벤치, 무너진 둘은 그 인물.
        this.placeArt(`park-${reason}`, sx, top + 8, side, "공원", won ? S.up : S.danger, info.title);

        let y = top + 8 + side + 14;
        for (const line of info.lines) {
            if (y + FS.sm > rowsTop) break;
            this.textFit(this.W / 2, y, line, FS.sm, "#9aada6", 0.5, this.W - PAD * 2);
            y += FS.sm + 7;
        }

        // 끝나는 방법 넷 — 지금 걸린 것만 켜진다. **빚 완납만 루프를 끊는다.**
        const ends: Array<[EndReason, string]> = [
            ["debtCleared", "빚 완납 — 루프를 벗어난다"],
            ["debtRemains", "빚 남음 — 1997 로"],
            ["trustLost", "신뢰 0 — 1997 로"],
            ["ruined", "자본잠식 — 1997 로"],
        ];
        const cw = (this.W - PAD * 2 - 2) / 2;
        if (y + 8 + 50 <= rowsTop) {
            y += 8;
            ends.forEach(([r, label], i) => {
                const x = PAD + (i % 2) * (cw + 2);
                const ry = y + Math.floor(i / 2) * 26;
                const hit = r === reason;
                this.rect(x, ry, cw, 24, hit ? (won ? 0x123d24 : 0x3d1226) : 0x111a1c, 1);
                this.textFit(x + 6, ry + 6, label, FS.xs,
                    hit ? (won ? S.up : S.danger) : "#4e5f58", 0, cw - 12);
            });
        }

        let ry = rowsTop;
        for (const [k, v, col] of rows) {
            this.rect(PAD, ry + 20, this.W - PAD * 2, 1, 0x16211f, 1);
            this.text(PAD, ry, k, FS.xs, "#6d7f78");
            this.textFit(this.W - PAD, ry, v, FS.xs, col, 1, this.W / 2);
            ry += 22;
        }

        // 「도감」은 눌러도 아무 일이 없는 죽은 버튼이었다. 도감으로 가는 길은 캔버스
        // 아래의 「카드 도감」 링크에 이미 있고, 모은 장수는 위 요약 줄이 말한다.
        //
        // **이기면 회귀하지 않는다.** 예전에는 라벨만 「여기서 끝」이고 하는 일은 똑같이
        // `goBack()` 이라, 빚을 다 갚아도 1997 로 되돌아갔다. `breaksLoop` 가 코드에
        // 있는데 화면이 그걸 안 봤다.
        this.buttons([
            won
                ? { label: "끝냈다", sub: `${this.memory.cycle}회차`, primary: true,
                    on: () => this.go("ending", cutEnded(this.memory.cycle)) }
                : { label: "눈을 감는다", sub: "1997 로", primary: true,
                    on: () => this.goBack(reason) },
        ], bar);
    }

    /**
     * 판이 끝났다. **회귀는 여기 한 곳에서만 일어난다.**
     *
     * 공원의 지는 엔딩 셋과 끝 화면의 「처음부터」가 모두 이리로 온다. 회차를 올려 저장하고
     * **집이 아니라 시작 화면으로** 내보낸다 — 판과 판 사이에 문턱을 두어야 끝난 줄 안다.
     */
    private goBack(reason: EndReason): void {
        const cycle = this.memory.cycle;
        this.memory = regress({ ...this.memory, facts: this.facts }, reason);
        saveMemory(this.memory);
        this.newRun(cutRegress(cycle));
    }

    /* ── 로그 ─────────────────────────────────────────── */

    private pushLog(text: string, kind: LogKind): void {
        this.entries.push({ turn: this.engine?.player.currentTurn ?? 0, kind, text });
        if (this.entries.length > LOG_KEEP) this.entries.splice(0, this.entries.length - LOG_KEEP);
    }
}
