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
import { StockEngine, SEED_CASH, ENERGY_MAX, regimeLabel } from "@/lib/game/core/StockEngine";
import { CHAPTERS } from "@/lib/game/core/chapters";
import { CLIENTS, clientAt, type Client } from "@/lib/game/core/clients";
import {
    decay, clampEnergy, energyDelta, energyReason, ENERGY_DECAY,
} from "@/lib/game/core/energy";
import { researchBuff, RESEARCH_COST } from "@/lib/game/core/research";
import { EMPTY_FACTS, type SituationFacts } from "@/lib/game/core/situations";
import {
    loadMemory, saveMemory, remember, regress, endReasonOf, breaksLoop, type Memory,
} from "@/lib/game/core/progress";
import { recordChapter, recordRun } from "@/lib/game/core/career";
import {
    cutStartRun, cutRegress, cutEnded, cutToOffice, cutOnChapterEnd, cutToPark, type Cut,
} from "@/lib/game/core/interlude";
import { drawInterlude } from "@/lib/game/components/Interlude";
import { preloadArt, sliceArt, drawArt, ART_VEIL_BACK, type ArtKey } from "@/lib/game/ui/art";
import type { EndReason, MarketRead, TurnBuff } from "@/lib/game/core/types";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { GameLog, type LogEntry } from "@/lib/game/components/GameLog";
import { QuoteBoard, type BoardRow } from "@/lib/game/components/QuoteBoard";
import {
    BTN, C, CLIENT_ROW, FS, PAD, S, bandsOf, fontOf, mkText, money, pressable, pxOf,
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
    private facts!: SituationFacts;

    /* ── 장소와 화면 ──────────────────────────────────── */
    private place: Screen = "title";
    private W = 390;
    private H = 844;
    private bands!: Bands;

    /** 이 챕터에서 화면에 살아 있는 것들. 다시 그릴 때 통째로 지운다. */
    private junk: Phaser.GameObjects.GameObject[] = [];
    private chart: PixelCandleChart | null = null;
    private logView: GameLog | null = null;
    private board: QuoteBoard | null = null;

    /* ── 한 턴의 상태 ─────────────────────────────────── */
    private entries: LogEntry[] = [];
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
    /**
     * 이번 턴 알아본 종목의 id. **근거는 여기서만 나온다**(`core/research.ts`).
     *
     * 카드가 있던 자리다. 손패 셋 중 정보 갈래를 내면 근거가 붙었는데, 카드를 걷어
     * 내면서 그 출처를 시세판의 「알아본다」 한 번으로 옮겼다.
     */
    private researched: string | null = null;
    /** 떠난 고객. 에너지가 바닥을 칠 때 한 명씩 잃는다. */
    private gone: string[] = [];
    /** 공원에 왔다면 왜 왔는가. */
    private ending: EndReason | null = null;
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
        this.entries = [];
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
        // 전환이 전환처럼 보이는 한 줄. 막이 이미 떠 있으므로 내용은 안 튄다.
        this.cameras.main.fadeIn(180);
        this.redraw();
    }

    /**
     * 이번 턴의 상태. **근거는 「알아본다」 하나에서만 나온다**(`core/research.ts`).
     *
     * 예전에는 `deck.buildBuff()` 였다. 손패에서 낸 카드가 근거·손절·헤지·수수료를
     * 한꺼번에 채워 줬는데, 카드를 걷어 내면서 채워지는 것은 근거와 국면 둘뿐이다.
     */
    private buff(): TurnBuff {
        const s = this.researched ? this.engine.stockOf(this.researched) : null;
        return researchBuff(s?.name ?? null);
    }

    /**
     * 한 종목을 알아본다. **에너지를 쓰고 그 종목에 근거가 붙는다.**
     *
     * 한 턴에 하나뿐이다 — 고객이 한 명이니 권하는 것도 하나이고, 알아보는 것도 하나다.
     * 값은 낸 그 자리에서 빠진다: 미루면 게이지와 「알아볼 수 있는가」가 한 턴 동안
     * 어긋나 다음 판단이 틀린 값 위에서 이뤄진다.
     */
    private research(id: string): void {
        if (this.researched !== null) return;
        if (this.engine.player.energy < RESEARCH_COST) return;
        const stock = this.engine.stockOf(id);
        if (!stock) return;

        this.researched = id;
        this.engine.player.energy = clampEnergy(this.engine.player.energy - RESEARCH_COST, ENERGY_MAX);
        this.engine.setFocus(id);
        this.read = this.engine.read(this.buff());
        this.actedThisTurn = true;
        this.pushLog(`${stock.name}을(를) 알아봤다. (에너지 −${RESEARCH_COST})`, "card");

        // **시세판을 닫지 않는다.** `redraw()` 는 판을 닫으므로 여기서 부르면 알아본
        // 직후에 사무실로 튕겨 나가고, 곧바로 권하려면 다시 열어야 한다. 판만 다시
        // 그리면 근거 줄과 체결 버튼이 바뀐 채로 그 자리에 남는다.
        if (this.board?.isOpen) this.board.refresh();
        else this.redraw();
    }

    /** 막을 걷는다. 여기서부터 아래 장소가 눌린다. */
    private dismissCut(): void {
        this.cut = null;
        this.redraw();
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

    /** 그려 보고 안 들어가서 무르는 자리. 폭은 그려 봐야 알 수 있다. */
    private drop(o: Phaser.GameObjects.GameObject): void {
        const at = this.junk.indexOf(o);
        if (at >= 0) this.junk.splice(at, 1);
        o.destroy();
    }

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
     * 연·장, 에너지 게이지, 빚. **셋 다 늘 보여야 한다.**
     *
     * 왼쪽에 언제인지, 오른쪽에 내가 어떤지. 그 사이는 비운다 — 여기에 시세판 버튼까지
     * 끼워 넣던 때가 있었는데, 한 줄에 넷이 서니 셋 다 잘렸다. 시세판으로 가는 길은
     * 아래 버튼 하나로 충분하다.
     */
    private drawStrip(label: string): void {
        const b = this.bands.strip;
        // 띠는 면이 아니라 **아래 선 하나**로 가른다. 면을 칠하면 그 자체로 판이 하나
        // 더 서고, 화면에 판이 많은 것이 이 UI 의 병이었다.
        this.rect(b.x, b.y + b.h - 1, b.w, 1, C.line, 1);
        const cy = b.y + b.h / 2 - FS.xs / 2;

        // 에너지 — 열 칸. **화면에 게이지는 이것 하나뿐이다.** 낮아지면 색이 금색을
        // 거쳐 분홍으로 가고, 0 이면 그 자리에서 판이 끝난다.
        const energy = this.engine.player.energy;
        const on = Math.round((energy / ENERGY_MAX) * 10);
        const bw = 5, gap = 2;
        const barsW = 10 * bw + 9 * gap;

        // 빚부터 자리를 잡는다 — 자릿수가 그때그때 달라서, 먼저 재야 게이지가 안 밀린다.
        const debt = this.engine.player.debt;
        const debtT = this.text(b.x + b.w - PAD, cy, debt > 0 ? `−${money(debt)}` : "빚 없음",
            FS.xs, debt > 0 ? S.down : S.up, 1);
        const bx = b.x + b.w - PAD - debtT.displayWidth - 12 - barsW;
        const col = energy <= 10 ? C.danger : energy <= 30 ? C.gold : C.up;
        for (let i = 0; i < 10; i++) {
            this.rect(bx + i * (bw + gap), b.y + b.h / 2 - 5, bw, 10, i < on ? col : 0x1b3238, 1);
        }

        // **게이지에 닿기 전에 끊는다.** 예전에는 폭을 안 재고 그려서, 턴이 두 자리가
        // 되는 순간(1/12) 라벨과 게이지가 붙어 둘 다 안 읽혔다.
        this.textFit(b.x + PAD, cy, label, FS.xs, S.inkDim, 0, bx - b.x - PAD - 8);
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
            ["여태 갚은 빚", money(m.career.feePaid), m.career.feePaid > 0 ? S.up : S.ink],
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
            ["여태 갚은 빚", money(m.career.feePaid), S.up],
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
            ["회차", `${this.memory.cycle}회차`, S.ink],
            ["맡은 돈", money(this.engine.equity), S.ink],
        ];
        const rowsH = rows.length * 22;
        const rowsTop = bar.y - rowsH - 8;

        // 정사각은 남는 세로의 절반까지만. 그래야 아래 글이 설 자리가 남는다.
        const side = Math.max(56, Math.min(this.W - PAD * 2, Math.round(avail * 0.40)));
        const sx = (this.W - side) / 2;
        this.placeArt("home", sx, top + 8, side, "집");

        let y = top + 8 + side + 14;

        // 내레이션 — 들어가는 줄만.
        for (const line of ch.narration) {
            if (y + FS.sm > rowsTop) break;
            this.textFit(this.W / 2, y, line, FS.sm, "#9aada6", 0.5, this.W - PAD * 2);
            y += FS.sm + 7;
        }

        let ry = rowsTop;
        for (const [k, v, col] of rows) {
            this.rect(PAD, ry + 20, this.W - PAD * 2, 1, 0x16211f, 1);
            this.text(PAD, ry, k, FS.xs, "#6d7f78");
            this.text(this.W - PAD, ry, v, FS.xs, col, 1);
            ry += 22;
        }

        // **버튼 하나.** 「여섯 장 고른다」는 상황카드를 걷어 내면서 같이 없앴다 —
        // 고를 것이 없는데 버튼만 남으면 눌러 보고 나서야 안다.
        this.buttons([
            { label: "나간다", sub: ch.year, primary: true, on: () => this.leaveHome() },
        ], bar);
    }

    private leaveHome(): void {
        this.entries = [];
        this.pushLog(`${this.engine.chapter.year}년. 사무실 문을 열었다.`, "turn");
        this.go("office", cutToOffice(this.engine.chapter));
        this.beginTurn();
    }

    /* ── 회사 ─────────────────────────────────────────── */

    /**
     * 회사 화면 — **판 넷.** 언제인가 / 무슨 일이 있었나 / 무엇을 낼까 / 무엇을 할까.
     *
     * 예전에는 여덟이었다. 챕터 띠 · 장소 정사각 · 로그 · 종목 칩 줄 · 차트 · 회사
     * 정보판 · 손패 · 버튼이 저마다 테두리를 두르고 세로로 쌓여서, 화면을 봐도
     * **무엇이 중요한지가 없었다.** 셋을 덜어 냈다(`ui/theme.ts` 의 `Bands` 주석).
     */
    private drawOffice(): void {
        const e = this.engine;
        const ch = e.chapter;
        const half = e.player.currentTurn <= 6 ? "상" : "하";
        this.drawStrip(`${ch.year} ${half}반기 · ${e.player.currentTurn}/${e.player.maxTurns}`);
        this.drawLog();
        this.drawNow();
        this.drawActions();
    }

    /**
     * 무슨 일이 있었나 — **고객 한 줄과 그 아래 1인칭 기록.**
     *
     * 고객이 여기로 온 이유: 「누가 앞에 앉았나」는 지나간 일이 아니라 지금의 상황이고,
     * 로그의 맨 윗줄로 읽는 것이 자연스럽다. 예전에는 회사 정보판 안에 들어 있어서
     * 손패와 같은 상자를 썼는데, 고객은 내가 만지는 것이 아니다.
     */
    private drawLog(): void {
        const b = this.bands.log;
        if (b.h <= 0) return;

        // **사무실 그림이 이 띠의 배경이다.** 예전에는 100px 짜리 정사각으로 왼쪽 위에
        // 박혀 있어서 무엇을 그린 것인지 안 보였다. 로그는 아래에서부터 쌓이므로 위쪽이
        // 늘 비는데, 그 자리를 그림이 받는다 — 판을 하나 더 세우지 않고.
        const art = drawArt(this, "office", b.x, b.y, b.w, b.h,
            { veil: ART_VEIL_BACK, cover: true });
        for (const o of art ?? []) this.keep(o);

        const c = this.client;
        const rowH = Math.min(CLIENT_ROW, b.h);
        // 왼쪽 끝의 색 막대 하나가 「사람이 앉아 있다」를 말한다. 상자를 두르지 않는다.
        this.rect(b.x + PAD, b.y + 5, 2, rowH - 10, c ? C.gold : C.down, 1);

        // **이름과 한마디는 각자 한 줄씩이다.** 한 줄에 붙이면 폭이 몇 픽셀 모자라
        // 한마디가 통째로 빠지는데, 고객을 사람으로 만드는 것이 그 한마디다.
        // 한 줄에 넣고 `textFit` 으로 줄이는 길도 있었지만 그러면 로그보다 작아진다.
        const tx = b.x + PAD + 8;
        const room = b.x + b.w - PAD - tx;
        if (!c) {
            this.text(tx, b.y + rowH / 2 - FS.xs / 2, "오늘은 아무도 앉지 않았다.", FS.xs, S.down);
        } else if (rowH >= 34) {
            this.textFit(tx, b.y + 4, c.name, FS.xs, S.ink, 0, room);
            this.textFit(tx, b.y + 21, c.blurb, FS.xs, S.inkDim, 0, room);
        } else {
            this.textFit(tx, b.y + rowH / 2 - FS.xs / 2, c.name, FS.xs, S.ink, 0, room);
        }

        const logY = b.y + rowH;
        const logH = b.h - rowH;
        if (logH <= 0) return;
        this.logView = new GameLog(this, { x: b.x, y: logY, width: b.w, height: logH });
        this.add.existing(this.logView);
        this.logView.setEntries(this.entries.slice(-LOG_KEEP));
    }

    /**
     * 이번 턴이 어떤가 — **근거와 계좌, 한 줄.**
     *
     * 예전 이름은 `drawFirm` 이었고, 고객 상자 · 계좌 두 줄 · 근거 상자 · 손패를 밝은
     * 회색 판 하나에 다 담았다. 그 뒤 카드까지 걷어 내면서 **한 줄만 남았다.**
     *
     * 근거는 시세판에서 「알아본다」를 눌러야 생긴다. 여기서는 그 결과만 읽는다 —
     * 규칙을 화면이 다시 적으면 둘이 어긋난다.
     */
    private drawNow(): void {
        const b = this.bands.now;
        if (b.h <= 0) return;
        // **좌표는 전부 띠 상대값이다.** 가로(두 칸)에서 이 띠는 오른쪽 칸에 있어서,
        // 절대 `PAD` 로 적으면 왼쪽 칸의 로그 위에 겹쳐 그려진다.
        const x0 = b.x + PAD;
        const xr = b.x + b.w - PAD;

        const th = this.buff().thesis;
        const eq = this.engine.equity;
        const holds = Object.keys(this.engine.player.positions).length;

        // 왼쪽이 이번 턴의 근거, 오른쪽이 내 계좌다. 근거는 색으로 갈린다 — 있으면
        // 초록, 없으면 흐린 글씨. 상자를 두르면 그것대로 판이 하나 더 선다.
        const y = b.y + (b.h - FS.xs) / 2;
        const acct = this.text(xr, y, `${money(eq)} · 보유 ${holds}`, FS.xs,
            eq >= SEED_CASH ? S.inkDim : S.down, 1);
        this.textFit(x0, y, th ? `근거 · ${th}` : "근거 없음",
            FS.xs, th ? S.up : "#5c6b65", 0, xr - acct.displayWidth - 10 - x0);
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
        const th = this.buff().thesis;
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
                    : `기다린다 · 에너지 −${ENERGY_DECAY}`,
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
        // **띠에 면을 안 칠한다.** 예전에는 밝은 회색(`0xa7b2a9`)으로 통째로 칠해서,
        // 어두운 화면 아래에 회색 덩어리가 붙어 있었다. 지금은 위 선 하나로 가른다.
        this.rect(b.x, b.y, b.w, 1, C.line, 1);

        const gap = 8;
        // **몇 개를 세우느냐로 칸을 나눈다.** 4칸 격자에 둘만 넣으면 왼쪽 절반에 몰리고
        // 칸이 87px 로 좁아져 「여섯 장 고른다」가 줄어든다.
        const live = defs.filter(d => d.label).length;
        const cols = Math.max(1, live);
        const cw = (b.w - PAD * 2 - gap * (cols - 1)) / cols;
        const chh = b.h - PAD * 2;

        defs.forEach((d, i) => {
            if (!d.label) return;
            const x = b.x + PAD + i * (cw + gap);
            const y = b.y + PAD;
            const on = d.on !== null;
            const skin = !on ? BTN.off : d.primary ? BTN.primary : BTN.normal;

            // 면은 다 같고 **테두리가 가른다** — 주된 버튼만 초록 선을 두른다.
            const face = this.add.graphics();
            face.fillStyle(skin.face, 1).fillRect(x, y, cw, chh);
            face.lineStyle(1, skin.edge, 1).strokeRect(x + 0.5, y + 0.5, cw - 1, chh - 1);
            this.keep(face);

            const showSub = Boolean(d.sub) && chh >= 40;
            const size = cw < 84 ? FS.sm : FS.md;
            const room = cw - 10;
            const label = this.textFit(x + cw / 2, y + chh / 2 - (showSub ? 13 : size / 2),
                d.label, size, skin.ink, 0.5, room);
            const subT = showSub
                ? this.textFit(x + cw / 2, y + chh / 2 + 7, d.sub, FS.xs, skin.sub, 0.5, room)
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
            thesis: () => this.buff().thesis,
            researchedId: () => this.researched,
            researchCost: () => RESEARCH_COST,
            canResearch: () => this.researched === null
                && this.engine.player.energy >= RESEARCH_COST,
            onResearch: id => this.research(id),
            alreadyRecommended: () => this.recommendedThisTurn,
            clientName: () => this.client?.name ?? "아무도",
            read: () => this.read,
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
     * 거절당하면 아무 일도 안 일어나고 에너지만 자연 감소한다.
     */
    private recommend(id: string): void {
        if (this.recommendedThisTurn || !this.client) return;
        const buff = this.buff();
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
        const buff = this.buff();
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

    /* ── 턴 ───────────────────────────────────────────── */

    private beginTurn(): void {
        this.client = clientAt(this.memory.cycle, this.engine.chapter.id, this.engine.player.currentTurn, this.gone);
        this.recommendedThisTurn = false;
        this.actedThisTurn = false;
        // 알아본 것은 **그 턴에만** 유효하다. 하루가 지나면 다시 알아봐야 한다.
        this.researched = null;
        this.read = this.engine.read(this.buff());

        const fresh = this.engine.newlyListed;
        if (fresh) this.pushLog(`${fresh.name}이(가) 상장했다. ${fresh.blurb}.`, "system");
        this.redraw();
    }

    /** 다음 턴으로. **여기서 주가가 움직이고 에너지가 정산된다.** */
    private endTurn(): void {
        // 아무것도 안 하고 넘긴 턴은 기다린 것으로 센다. **버튼이 아니라 행동으로 센다** —
        // 예전에는 「기다리시죠」로 넘긴 것만 세어서, 똑같이 흘려보낸 턴인데도 「다음」을
        // 누르면 「기다릴 줄 알게 됐다」가 안 채워졌다.
        if (!this.actedThisTurn) {
            this.facts.waitsThisChapter += 1;
            this.pushLog("오늘은 아무것도 하지 않았다.", "turn");
        }

        const buff = this.buff();
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

        this.settleEnergy(buff);
        this.pending = null;
        this.engine.advanceTurn();

        if (this.engine.isOver) { this.finishChapter(); return; }
        this.beginTurn();
    }

    /**
     * 에너지 정산 — **결과가 아니라 결과 × 근거.**
     *
     * 운으로 벌어도 오르지 않는다. 그 한 칸이 이 게임의 논지다.
     */
    private settleEnergy(buff: TurnBuff): void {
        let energy = this.engine.player.energy;

        if (this.pending) {
            const { thesis, client, id, cost } = this.pending;
            const value = this.engine.positionOf(id).shares * this.engine.priceOf(id);
            const gained = value > cost;
            let d = energyDelta({ hadThesis: thesis !== null, gained, client });
            if (d < 0 && thesis !== null && buff.softenLoss) d = Math.round(d / 2);

            energy += d;
            const why = energyReason({ hadThesis: thesis !== null, gained, client });
            this.pushLog(`${client.name} — ${why}. 에너지 ${d >= 0 ? "+" : ""}${d}`,
                d > 0 ? "up" : d < 0 ? "warn" : "turn");

            if (thesis !== null && !gained) this.facts.thesisLosses += 1;
            if (thesis === null && !gained) this.facts.blindLosses += 1;
            if (thesis === null && gained) this.facts.blindGains += 1;
            // 김 부장 연속 — 근거를 대고 벌어 준 것만 센다.
            if (client.id === "kim") {
                this.facts.kimStreak = (thesis !== null && gained) ? this.facts.kimStreak + 1 : 0;
            }
        }

        if (!buff.noDecay) energy = decay(energy);
        this.engine.player.energy = clampEnergy(energy, ENERGY_MAX);

        // 에너지가 바닥에 가까우면 한 사람이 떠난다. **떠난 고객은 안 돌아온다.**
        if (this.engine.player.energy <= 15 && this.client && this.gone.length < CLIENTS.length - 1) {
            if (!this.gone.includes(this.client.id)) {
                this.gone.push(this.client.id);
                this.pushLog(`${this.client.name}이(가) 맡긴 돈을 거둬 갔다.`, "warn");
            }
        }
    }

    /**
     * **상황카드 수집은 지금 판에 없다.**
     *
     * 조건 판정(`newlyEarned`)도 획득도 걷어 냈다 — 카드를 낼 자리가 없어졌으니 모아도
     * 쓸 데가 없고, 모으는 것만 남으면 화면에 목적 없는 진행 막대가 선다. 규칙 자체는
     * `core/situations.ts` 에 그대로 있으니 되살릴 때 여기부터 다시 부르면 된다.
     *
     * 조건이 읽는 사실(`facts`)은 계속 쌓는다 — 이력 페이지가 그것을 읽고, 수집을
     * 되살릴 때 이미 채워져 있어야 한다.
     */

    /* ── 챕터가 끝났다 ────────────────────────────────── */

    private finishChapter(): void {
        // 챕터 끝의 사실 — 조건 몇 개가 이 값을 본다.
        this.facts.bestChapterEndEnergy = Math.max(this.facts.bestChapterEndEnergy, this.engine.player.energy);
        this.facts.mostHoldingsAtChapterEnd = Math.max(
            this.facts.mostHoldingsAtChapterEnd, Object.keys(this.engine.player.positions).length);
        if (this.engine.isRuined) this.facts.everRuined = true;

        const idx = CHAPTERS.indexOf(this.engine.chapter);
        // 결산 머리에 쓸 연도. `startNextChapter()` 뒤에 읽으면 **다음 장의 연도**가 나온다.
        const done = this.engine.chapter;
        // 수집이 없으니 새로 겪은 것도 없다. 되살리면 여기에 그 목록이 온다.
        const sum = this.engine.endChapter([]);

        this.memory = remember(this.memory, sum, idx);
        // 이력은 **챕터 단위**로 접는다 — 판을 끝까지 안 가고 창을 닫아도 남는다.
        this.memory.career = recordChapter(this.memory.career, sum);
        this.memory.facts = { ...this.facts };
        saveMemory(this.memory);
        this.facts.waitsThisChapter = 0;

        const end = endReasonOf({
            debt: this.engine.player.debt,
            energy: this.engine.player.energy,
            ruined: this.engine.isRuined,
            finalChapterDone: this.engine.isFinalChapter,
        });
        if (end) return this.toPark(end);
        if (!this.engine.startNextChapter()) return this.toPark("debtRemains");

        // **여기가 결산이 처음 보이는 자리다.** 여태 `sum` 은 기억으로만 흘러들어가고
        // 화면에 한 번도 안 나왔다. 집으로 돌아오는 전환이 그것을 말한다.
        this.go("home", cutOnChapterEnd(done, sum, money));
    }

    /**
     * 판이 끝났다. **한 판에 정확히 한 번 지나는 자리라 이력을 여기서 접는다.**
     *
     * `goBack()` 에서 접으면 이긴 판(끝 화면으로 가는 길)이 빠지고, 끝 화면의 「처음부터」가
     * 다시 `goBack()` 을 부르므로 같은 판을 두 번 세게 된다.
     */
    private toPark(reason: EndReason): void {
        this.ending = reason;
        this.memory.career = recordRun(this.memory.career, reason, this.facts, this.engine.player.debt);
        saveMemory(this.memory);
        this.go("park", cutToPark(this.engine.chapter, reason, this.ENDINGS[reason].title));
    }

    /* ── 공원 ─────────────────────────────────────────── */

    private readonly ENDINGS: Record<EndReason, { title: string; lines: string[] }> = {
        debtCleared: { title: "갚았다", lines: ["빚이 0 이 됐다.", "공원을 지나 어디로든 갈 수 있다.", "루프가 끝났다."] },
        debtRemains: { title: "아직", lines: ["2000년이 지났고 빚은 남았다.", "끝나지 않았다.", "벤치에 앉아 눈을 감으면 — 다시 1997년이다."] },
        burnout: { title: "소진", lines: ["더는 그 자리에 앉아 있을 힘이 없었다.", "낮의 공원에는 나 같은 사람이 많았다.", "눈을 감으면 다시 1997년이다."] },
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
            ["burnout", "에너지 0 — 1997 로"],
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
