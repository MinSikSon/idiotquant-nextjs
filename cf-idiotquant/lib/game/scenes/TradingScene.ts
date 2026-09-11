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
import {
    StockEngine, SEED_CASH, ENERGY_MAX, regimeLabel, type TradeMark,
} from "@/lib/game/core/StockEngine";
import { CHAPTERS, TOTAL_TURNS } from "@/lib/game/core/chapters";
import { CLIENTS, clientAt, entrustAmount, type Client } from "@/lib/game/core/clients";
import {
    LIVING_COST, PARTTIME_ENERGY, PARTTIME_PAY, SHORTFALL_DEBT,
} from "@/lib/game/core/wallet";
import {
    decay, clampEnergy, energyDelta, energyReason, ENERGY_DECAY,
} from "@/lib/game/core/energy";
import {
    researchBuff, verdictOf, worthRecommending, RESEARCH_COST,
} from "@/lib/game/core/research";
import { EMPTY_FACTS, type SituationFacts } from "@/lib/game/core/situations";
import {
    recommendBlock, researchBlock, blockSay, type OrderBlock, type ResearchBlock,
} from "@/lib/game/core/orders";
import {
    loadMemory, saveMemory, remember, regress, endReasonOf, breaksLoop, type Memory,
} from "@/lib/game/core/progress";
import { recordChapter, recordRepay, recordRun, recordWage } from "@/lib/game/core/career";
import {
    chapterStrip, noteTurn, notedCount, recallAt, recallSay, worthResearching,
} from "@/lib/game/core/chronicle";
import {
    cutStartRun, cutRegress, cutEnded, cutToOffice, cutOnChapterEnd, cutToPark,
    type ClientId, type Cut,
} from "@/lib/game/core/interlude";
import { drawInterlude } from "@/lib/game/components/Interlude";
import { preloadArt, sliceArt, drawArt, ART_VEIL_BACK, type ArtKey } from "@/lib/game/ui/art";
import { ledgerOf } from "@/lib/game/core/ledger";
import type { EndReason, MarketRead, Regime, TurnBuff } from "@/lib/game/core/types";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { GameLog, type LogEntry } from "@/lib/game/components/GameLog";
import { StockList, type StockRow } from "@/lib/game/components/StockList";
import { StockSheet } from "@/lib/game/components/StockSheet";
import {
    ACTION_FRAMED_MIN, BTN, C, CLIENT_ROW, FS, MIN_FS, PAD, S, STACK, bandsOf, fontOf,
    mkText, money, pressable, pxOf, setSize, stackH, stackPlan,
    type Band, type Bands, type LogKind,
} from "@/lib/game/ui/theme";
import { TITLE_H, bevel, btnFace, crt, skinOf, winFrame } from "@/lib/game/ui/win95";

/** 버튼 띠 한 칸. */
interface ButtonDef {
    label: string;
    /**
     * 칸이 좁을 때 대신 쓸 **짧은 이름.** 뜻은 남기고 길이만 줄인다.
     *
     * 글꼴이 고정폭이라 한글이 **전각**이다 — 「하루를 넘긴다」는 14px 에서도 109px 이라,
     * 버튼이 셋이 되어 칸이 106px 로 줄면 **어떤 크기로도 안 들어간다.** 그때 줄이는 데만
     * 맡기면 긴 이름만 쪼그라들어 한 줄에 크기가 둘셋 섞인다 — 가로에서 실제로 그랬다.
     */
    short?: string;
    sub: string;
    primary?: boolean;
    /** null 이면 못 누른다. 그때 이름과 부제가 **왜 못 누르는지**를 말한다. */
    on: (() => void) | null;
}

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
 *   목록  **아홉 종목을 견주는 자리.** 회사에서 열고, 고르면 곧장 회사로 돌아온다
 *   장부  **돈 셋이 어떻게 이어지는가.** 배너의 검은 줄을 누르면 열린다
 *   공원  이 판이 어떻게 끝났는가
 *   끝    **빚을 다 갚았을 때만.** 여기서는 회귀하지 않는다
 *
 * 목록과 장부는 장소가 아니라 **회사 화면이 잠깐 여는 창**이다 — 그래서 전환 막을 안
 * 세우고 `go()` 를 안 거친다. 턴도 안 흐르고 고객도 안 바뀐다.
 */
type Screen = "title" | "home" | "office" | "market" | "ledger" | "park" | "ending";

/**
 * 장부의 한 줄. `[이름, 값, 값의 색, 지킬 것인가]`.
 *
 * 마지막 칸이 **좁은 격자에서 살아남는가**를 정한다 — 눕힌 폰에서는 창이 245px 이라
 * 열세 줄이 다 못 선다(`drawLedgerBlocks`).
 */
type LedgerRow = [string, string, string, boolean];

interface LedgerBlock {
    head: string;
    /** 머리 오른쪽의 한마디. **셋이 서로 무슨 사이인지**를 이것이 말한다. */
    note: string;
    /** 왼쪽 색 조각. 갈래를 글자보다 먼저 보게 한다. */
    tint: number;
    rows: LedgerRow[];
    /**
     * 이 덩이에서 **다음 덩이로 무엇이 넘어가는가.** 덩이 사이에 화살표 한 줄로 선다.
     *
     * 요청이 「흐름이 구분되면 좋겠다」였는데, 세 덩이를 그냥 쌓아 두면 그건 흐름이
     * 아니라 표 셋이다. 셋이 **한 줄로 이어져 있다**는 것이 이 화살표에 있다.
     * 사이가 좁으면 안 그린다 — 덩이에 붙어 버리면 어느 쪽 것인지 모른다.
     */
    flow?: string;
}

/** 장부의 연대기 띠가 먹는 세로 — 머리 18 + 칸 16 + 여백 8. */
const CHRON_H = 42;

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
    private list: StockList | null = null;
    private sheet: StockSheet | null = null;

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
    /**
     * 이번 턴에 **실제로 체결이 일어났는가.** 「무른다」가 이 값을 본다.
     *
     * `recommendedThisTurn` 과 따로 두는 이유: 고객이 고개를 저은 턴은 권한 것이지만
     * **아무것도 안 사졌다.** 그것까지 무를 수 있게 두면 거절을 무르고 다시 굴려
     * 받아 줄 때까지 되풀이할 수 있다 — 무름은 잘못 누른 것을 고치는 자리이지
     * 주사위를 다시 굴리는 자리가 아니다.
     */
    private traded = false;
    /** 턴이 열릴 때의 자리. 「무른다」가 여기로 되돌린다. */
    private mark: {
        trades: TradeMark;
        recommended: boolean;
        acted: boolean;
        pending: { id: string; thesis: string | null; client: Client; cost: number } | null;
        facts: SituationFacts;
        logLen: number;
    } | null = null;
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
        // 막 아래에 목록이 남아 있으면 걷었을 때 엉뚱한 화면이 나온다.
        this.list = null; this.sheet = null;
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
        // **화면이 이미 잠갔다면 여기까지 오지 않는다.** 두 번째 자물쇠다.
        if (id !== this.engine.focus) return;
        if (this.researchBlock() !== "none") return;
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
        this.redraw();
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
        this.list?.close(); this.list = null;
        this.sheet?.close(); this.sheet = null;

        this.cameras.main.setBackgroundColor(S.bg);
        if (this.place === "title") this.drawTitle();
        else if (this.place === "ending") this.drawEnding();
        else if (this.place === "home") this.drawHome();
        else if (this.place === "park") this.drawPark();
        else if (this.place === "market") this.drawStockList();
        else if (this.place === "ledger") this.drawLedger();
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
            setSize(this, t, Math.max(MIN_FS, Math.floor(size * (room / t.displayWidth))));
        }
        return t;
    }

    /**
     * 칸을 넘치면 **줄이지 말고 자른다.** 끝에 「…」를 붙인다.
     *
     * `textFit` 은 글자를 작게 만드는데, 옆 글자와 크기가 같아야 하는 자리(고객 이름과
     * 그 한마디)에 쓰면 한 줄이 두 덩어리로 보인다 — 눕힌 화면에서 한마디가 이름의
     * 절반 크기로 줄어 실제로 그랬다.
     */
    private textClip(
        x: number, y: number, str: string, size: number, color: string, origin: number, room: number,
    ): Phaser.GameObjects.Text {
        const t = this.text(x, y, str, size, color, origin);
        if (room <= 0 || t.displayWidth <= room) return t;
        // 한 글자씩 떼며 재 본다. 한 줄짜리 짧은 글이라 이 정도면 충분히 빠르다.
        let cut = str;
        while (cut.length > 1 && t.displayWidth > room) {
            cut = cut.slice(0, -1);
            t.setText(`${cut}…`);
        }
        return t;
    }

    private rect(x: number, y: number, w: number, h: number, color: number, alpha = 1): Phaser.GameObjects.Graphics {
        const g = this.add.graphics();
        g.fillStyle(color, alpha).fillRect(x, y, w, h);
        return this.keep(g);
    }

    /**
     * 집·공원의 큰 정사각. **모니터 안에 넣는다.**
     *
     * 회색 창 면 위에 그림을 직접 얹으면 그림이 스티커가 된다 — 판에 붙은 것이지 판의
     * 일부가 아니다. 파인 테두리를 두르면 그 자리가 화면이 되고, 그림은 그 화면에
     * 떠 있는 것이 된다. 이 게임의 모든 그림이 그렇게 놓인다.
     *
     * 그림이 들어오면 **글자를 안 얹는다** — 밑에 캡션 한 줄이면 충분하고, 그림 한가운데
     * 큰 글씨를 놓으면 둘 다 안 읽힌다.
     */
    private placeArt(
        key: ArtKey, x: number, y: number, side: number, name: string,
        nameColor: string = S.gold, caption?: string,
    ): void {
        this.keep(crt(this, x, y, side, side));
        const art = drawArt(this, key, x + 2, y + 2, side - 4, side - 4);
        for (const o of art ?? []) this.keep(o);

        if (art) {
            if (caption && side >= 120) {
                this.text(x + side / 2, y + side - 20, caption, FS.xs, nameColor, 0.5);
            }
            return;
        }
        this.text(x + side / 2, y + side / 2 - FS.xxl / 2, name,
            side >= 140 ? FS.xxl : FS.xl, nameColor, 0.5);
        if (side >= 120) this.text(x + side / 2, y + side - 20, "그래픽 자리", FS.xs, S.inkDim, 0.5);
    }

    /**
     * 배너 아래를 통째로 덮는 창 하나. 집·공원·시작·끝이 전부 이 안에 그려진다.
     *
     * 회사 화면과 다른 점: 저기는 창이 둘(뉴스·주식 현황)이고 여기는 하나다. **이 화면들은
     * 한 가지만 말한다** — 지금 어디에 있고 여기서 무엇을 하는가. 창을 둘로 쪼개면 그
     * 하나를 둘로 나누는 셈이라 어느 쪽을 먼저 읽어야 하는지가 생긴다.
     */
    private paper(title: string): Band {
        const bar = this.placeBar;
        const top = this.bands.strip.h;
        const win = winFrame(this, 2, top, this.W - 4, Math.max(0, bar.y - top), title);
        for (const o of win.parts) this.keep(o);
        return win.body;
    }

    /**
     * 요약 줄 — **검은 화면 안.** 창 바닥에 붙는다.
     *
     * 회차·맡은 돈·남은 빚 같은 것들이다. 값을 읽는 자리는 전부 CRT 안이라는 규칙이
     * 여기에도 걸린다 — 회색 면 위에 늘어놓으면 그 시절 화면이 아니라 표가 된다.
     *
     * @returns 이 블록의 윗변. 그 위로만 글이 설 수 있다.
     */
    private crtRows(body: Band, rows: Array<[string, string, string]>): number {
        const h = rows.length * 20 + 8;
        const y = body.y + body.h - h - 2;
        this.keep(crt(this, body.x + 3, y, body.w - 6, h));
        let ry = y + 6;
        for (const [k, v, col] of rows) {
            this.text(body.x + 11, ry, k, FS.xs, S.inkDim);
            this.textFit(body.x + body.w - 11, ry, v, FS.xs, col, 1, body.w / 2);
            ry += 20;
        }
        return y;
    }

    /**
     * 검은 화면 한 줄. **색이 곧 뜻인 문장**이 여기 든다 — 판이 어떻게 끝났는가 같은.
     *
     * 회색 면 위에 형광 초록을 얹으면 은색에 잠겨 오히려 안 읽힌다. 그런 문장은 화면
     * 안으로 들여보낸다.
     */
    private crtLine(body: Band, y: number, str: string, size: number, color: string): number {
        const h = size + 12;
        this.keep(crt(this, body.x + 3, y, body.w - 6, h));
        this.textFit(body.x + body.w / 2, y + 6, str, size, color, 0.5, body.w - 24);
        return h + 8;
    }

    /**
     * 그림 한 변과 그 윗변을 **한꺼번에** 정한다. 집·공원·시작·끝이 다 이걸 쓴다.
     *
     * 두 가지를 같이 막는 자리다.
     *
     * 1. 위에서부터 쌓으면 남는 여백이 전부 아래에 몰려, 긴 폰에서 그림과 글이 창 위쪽에
     *    붙고 그 아래가 통째로 빈 은색 판이 된다 — 실제로 시작 화면이 그랬다.
     * 2. 그렇다고 그림을 비율대로만 키우면 **글이 먼저 잘린다.** 내레이션과 설명은
     *    이 화면들의 존재 이유라 그림보다 뒤에 밀리면 안 된다.
     *
     * @param textH 그림 아래에 설 글의 높이. 그림은 이만큼을 남기고 남는 것만 쓴다.
     */
    private artFit(
        body: Band, rowsTop: number, share: number, textH: number,
    ): { side: number; top: number } {
        const room = rowsTop - body.y - 12;
        const side = Math.max(56, Math.min(
            Math.round(room * share), body.w - 16, Math.max(0, room - textH - 12)));
        const top = body.y + 6 + Math.max(0, Math.round((room - side - 12 - textH) / 2));
        return { side, top };
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
     * 화면 맨 위의 **배너** — 붉은 제목과 날짜, 그리고 그 아래 CRT 한 줄.
     *
     * 참고한 그 시절 화면이 이렇게 생겼다: 남색 띠에 붉은 픽셀 제목, 오른쪽에 날짜.
     * 이 게임에서는 거기에 「지금 몇 턴인가」가 붙는다 — 날짜가 곧 진행도니까.
     *
     * ── 왜 값이 검은 줄 안으로 들어갔나 ──────────────────────────
     * 예전에는 에너지 막대와 빚이 띠 위에 그냥 얹혀 있었다. 화면이 90년대 윈도우가 되면서
     * **값을 읽는 자리는 검은 화면 안**이라는 규칙이 섰고(`ui/win95.ts`), 이 둘이 화면에서
     * 제일 자주 읽는 값이라 제일 먼저 그 안으로 들어갔다. 남색 위에 형광 초록을 얹으면
     * 색은 예쁜데 그게 「모니터에 뜬 값」인지 「띠에 그린 그림」인지가 안 갈린다.
     *
     * @param stats 에너지와 빚을 같이 적을까. 시작·끝 화면은 판이 없어서 안 적는다.
     * @param onOpen 검은 줄을 누르면 무엇을 열까. **장부로 가는 유일한 길이다.**
     *   버튼 띠에 넷째 버튼을 세우지 않으려고 여기로 왔다 — 셋만 서도 칸이 118px 이고,
     *   무엇보다 이 줄이 이미 **돈을 읽는 자리**라 장부가 그 뒤에 있는 것이 자연스럽다.
     */
    private drawBanner(sub: string, stats = true, onOpen?: () => void): void {
        const b = this.bands.strip;
        this.rect(b.x, b.y, b.w, b.h, C.banner, 1);
        this.rect(b.x, b.y + b.h - 1, b.w, 1, C.edge, 1);

        // 제목 「IMF」 — 붉다. 이 세 글자는 어느 화면에서도 안 바뀐다.
        //
        // **라틴 문자라 한글보다 좁다.** 고정폭 글꼴에서 라틴은 반각이므로 세 글자가
        // 한글 한 자 반이다 — 오른쪽 날짜가 그만큼 넓게 쓴다.
        const title = this.text(b.x + PAD, b.y + 5, "IMF", FS.md, S.title);
        this.textFit(b.x + b.w - PAD, b.y + 7, sub, FS.xs, S.barInk, 1,
            b.w - PAD * 2 - title.displayWidth - 10);

        // 줄이 하나뿐일 만큼 짧으면 CRT 줄을 접는다. 접혀도 제목과 날짜는 남는다 —
        // 「언제인가」가 없으면 판이 어디쯤 왔는지를 화면이 아예 말하지 않는다.
        if (!stats || b.h < 48) return;

        const cy = b.y + b.h - 22;
        this.keep(crt(this, b.x + PAD, cy, b.w - PAD * 2, 18));
        const x0 = b.x + PAD + 6;
        const xr = b.x + b.w - PAD - 6;
        const ty = cy + 9 - FS.xs / 2;

        // 이 줄 뒤에 장부가 있다는 표시. **글자 하나로 말한다** — 「장부 보기」라고 적을
        // 자리가 없고, 적으면 게이지가 그만큼 짧아진다.
        if (onOpen) {
            this.text(xr, ty, "▸", FS.xs, S.gold, 1);
            // **누르는 자리는 띠 전체다.** 검은 줄만 받으면 높이가 18px 이라 손가락으로는
            // 거의 못 누른다. 띠 안에 다른 누를 것이 없으므로 통째로 받아도 안 겹친다 —
            // 화살표는 「여기 뭔가 있다」를 말하는 표시지 과녁이 아니다.
            this.tap(b.x, b.y, b.w, b.h, onOpen);
        }
        const rightEdge = onOpen ? xr - 12 : xr;

        // 빚부터 자리를 잡는다 — 자릿수가 그때그때 달라서, 먼저 재야 게이지가 안 밀린다.
        const debt = this.engine.player.debt;
        const debtT = this.text(rightEdge, ty, debt > 0 ? `빚 −${money(debt)}` : "빚 없음",
            FS.xs, debt > 0 ? S.down : S.up, 1);

        // **지갑은 빚 왼쪽에 붙는다.** 둘은 같은 주머니의 양쪽이라 나란히 있어야 읽힌다 —
        // 빚을 갚을 수 있는지는 이 두 숫자를 나란히 놓고서야 알 수 있다.
        //
        // 자리가 모자라면 **안 적는다.** 이 띠는 에너지 게이지가 주인이고, 지갑은
        // 장부 화면이 언제나 제대로 말해 준다.
        const wallet = this.engine.player.wallet;
        const walletX = rightEdge - debtT.displayWidth - 8;
        // 가운뎃점으로 가른다 — 안 그으면 「지갑 0 빚 없음」이 한 덩이로 읽힌다.
        const walletT = this.text(walletX, ty, `지갑 ${money(wallet)} ·`,
            FS.xs, wallet < LIVING_COST ? S.down : S.inkDim, 1);
        const walletLeft = walletX - walletT.displayWidth;

        // 에너지 — 열 칸. **화면에 게이지는 이것 하나뿐이다.** 낮아지면 색이 금색을
        // 거쳐 분홍으로 가고, 0 이면 그 자리에서 판이 끝난다.
        const energy = this.engine.player.energy;
        const on = Math.round((energy / ENERGY_MAX) * 10);
        const bw = 5, gap = 2;
        const barsW = 10 * bw + 9 * gap;
        const col = energy <= 10 ? C.danger : energy <= 30 ? C.gold : C.up;
        const label = this.text(x0, ty, "에너지", FS.xs, S.inkDim);
        const bx = x0 + label.displayWidth + 6;
        for (let i = 0; i < 10; i++) {
            this.rect(bx + i * (bw + gap), cy + 4, bw, 10, i < on ? col : 0x16211f, 1);
        }
        // 게이지가 지갑 글자에 닿으면 지갑을 지운다 — 띠의 주인은 게이지다.
        if (bx + barsW + 6 > walletLeft) {
            walletT.destroy();
        } else if (bx + barsW + 34 < walletLeft) {
            // 막대만으로는 「몇 칸이 남았지」를 세어야 한다. 숫자를 옆에 둔다 —
            // **게이지가 잘릴 만큼 좁으면 안 적는다.**
            this.text(bx + barsW + 6, ty, `${energy}`, FS.xs, S.ink);
        }
    }

    /* ── 시작과 끝 ────────────────────────────────────── */

    /**
     * 한 판의 문턱. **여기서 시작하고 여기로 돌아온다.**
     *
     * 회차와 기록을 보여 주는 자리이기도 하다. 회귀가 헛돌지 않는다는 것을 사람이 아는
     * 방법은 하나뿐이다 — 도는 동안 **무엇이 쌓였는지가 보이는 것.**
     */
    /**
     * 이 게임이 무엇인지 세 줄. **시작 화면에만 있다.**
     *
     * 규칙을 다 적으면 아무도 안 읽는다. 「무엇을 갚는가 · 무엇이 그것을 줄이는가 ·
     * 언제 끝나는가」 셋이면 첫 턴을 스스로 굴릴 수 있다. 나머지는 화면이 그때그때
     * 말한다(버튼 부제).
     */
    private static readonly HOW = [
        // **「빚 3천만원」이라고 적으면 안 된다.** 빚은 1997년이 끝날 때 생긴다
        // (`chapters.ts` 의 `debtOnEnd`). 프롤로그 네 턴 동안 배너는 「빚 없음」이라고
        // 적혀 있는데 시작 화면이 「빚 3천만원」이라고 하면, 처음 켠 사람에게는
        // 화면 둘이 서로 다른 말을 하는 것으로 보인다.
        "1997년이 끝나면 빚 3천만원이 남는다.",
        "종목을 알아보고 근거를 대서 맞혀야 에너지가 오른다.",
        "에너지가 곧 보수이고, 보수만이 빚을 줄인다.",
    ];

    private drawTitle(): void {
        const m = this.memory;
        const first = m.cycle <= 1;
        const bar = this.placeBar;

        // 배너가 「IMF」를 말하므로 화면 한가운데의 큰 제목은 없앴다. 같은 세 글자가
        // 한 화면에 두 번 서는 것은 강조가 아니라 중복이다.
        this.drawBanner("1997년 12월, 서울", false);
        const body = this.paper(first ? "새 회차" : `${m.cycle}회차`);
        if (body.h <= 0) return;

        const rows: Array<[string, string, string]> = [
            ["회차", `${m.cycle}회차`, S.ink],
            ["가장 멀리", CHAPTERS[m.bestChapter]?.year ?? CHAPTERS[0]!.year, S.ink],
            ["여태 갚은 빚", money(m.career.repaid), m.career.repaid > 0 ? S.up : S.ink],
        ];
        // **쌓인 것이 보여야 다시 한다.** 회귀가 지우지 못하는 것이 이 줄 하나뿐이라,
        // 회차가 도는 동안 이 숫자가 올라가는 것이 「헛돌지 않았다」의 증거다.
        const noted = notedCount(m.chronicle);
        if (noted > 0) rows.push(["연대기", `${noted}턴 / ${TOTAL_TURNS}턴`, S.neon]);
        if (m.escaped) rows.push(["빚 완납", "해낸 적 있다", S.gold]);
        const rowsTop = this.crtRows(body, rows);

        const { side, top } = this.artFit(body, rowsTop, 0.62,
            FS.sm + 12 + TradingScene.HOW.length * (FS.xs + 6));
        this.placeArt("title", body.x + (body.w - side) / 2, top, side, "IMF", S.gold);

        let y = top + side + 12;
        const line = first
            ? "증권사를 나온 지 한 달이 됐다."
            : m.escaped
                ? "한 번 빠져나온 적이 있다. 다시 들어간다."
                : "또 1997년이다. 이번에는 다르게 해 본다.";
        if (y + FS.sm <= rowsTop) {
            this.textFit(body.x + body.w / 2, y, line, FS.sm, S.faceInk, 0.5, body.w - 16);
            y += FS.sm + 12;
        }

        // **무엇을 하는 게임인가.** 여기 말고 이것을 적을 자리가 없었다 — 회사 화면은
        // 판이 굴러가는 중이라 설명을 읽을 자리가 아니고, 처음 켠 사람은 규칙을 모른 채
        // 「하루를 넘긴다」만 누르게 된다. 시작 화면의 이 빈 자리가 그 몫이다.
        for (const how of TradingScene.HOW) {
            if (y + FS.xs > rowsTop - 4) break;
            this.textFit(body.x + body.w / 2, y, how, FS.xs, S.faceDim, 0.5, body.w - 16);
            y += FS.xs + 6;
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

        this.drawBanner("2000년 겨울 · 끝", false);
        const body = this.paper("끝");
        if (body.h <= 0) return;

        const rowsTop = this.crtRows(body, [
            ["걸린 회차", `${m.cycle}회차`, S.gold],
            ["여태 갚은 빚", money(m.career.repaid), S.up],
            ["남은 빚", "0", S.up],
        ]);

        const { side, top } = this.artFit(body, rowsTop, 0.54, FS.lg + 20 + 3 * (FS.xs + 6));
        this.placeArt("park-debtCleared", body.x + (body.w - side) / 2, top, side,
            "공원", S.up, "갚았다");

        let y = top + side + 10;
        // 이 한 줄이 이 화면의 전부다. **색이 곧 뜻이라** 검은 화면 안으로 들여보낸다.
        if (y + FS.lg + 12 <= rowsTop) y += this.crtLine(body, y, "빚을 다 갚았다", FS.lg, S.up);

        for (const line of [
            "2000년의 겨울을 빚 없이 넘겼다.",
            "공원을 지나 어디로든 갈 수 있다.",
            "이 회차는 여기서 끝난다.",
        ]) {
            if (y + FS.xs > rowsTop - 4) break;
            this.textFit(body.x + body.w / 2, y, line, FS.xs, S.faceDim, 0.5, body.w - 16);
            y += FS.xs + 6;
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
        this.drawBanner(`집 · ${ch.year}   ${this.memory.cycle}회차`);
        const bar = this.placeBar;
        const body = this.paper("집");
        if (body.h <= 0) return;

        // 요약 줄은 창 바닥에 못 박는다 — 무엇을 갖고 있는지는 늘 보여야 한다.
        // **지갑이 맡은 돈 옆에 선다.** 집은 챕터 사이에 들르는 자리라, 여기서 「얼마를
        // 벌어 왔나」를 보고 사무실에 나간다. 맡은 돈은 챕터마다 0 에서 다시 쌓이지만
        // 지갑은 이어지므로, 둘이 나란히 있어야 어느 쪽이 내 것인지가 보인다.
        const rowsTop = this.crtRows(body, [
            ["회차", `${this.memory.cycle}회차`, S.ink],
            ["맡은 돈", money(this.engine.equity), S.ink],
            ["지갑", money(this.engine.player.wallet),
                this.engine.player.wallet < LIVING_COST ? S.down : S.up],
        ]);

        // 정사각은 남는 세로의 절반까지만. 그래야 아래 글이 설 자리가 남는다.
        const { side, top } = this.artFit(body, rowsTop, 0.64,
            ch.narration.length * (FS.sm + 7));
        this.placeArt("home", body.x + (body.w - side) / 2, top, side, "집");

        // 내레이션 — 들어가는 줄만. **이 화면의 이유라 마지막까지 지킨다.**
        let y = top + side + 12;
        for (const line of ch.narration) {
            if (y + FS.sm > rowsTop - 4) break;
            this.textFit(body.x + body.w / 2, y, line, FS.sm, S.faceInk, 0.5, body.w - 16);
            y += FS.sm + 7;
        }

        // **버튼 하나.** 「여섯 장 고른다」는 상황카드를 걷어 내면서 같이 없앴다 —
        // 고를 것이 없는데 버튼만 남으면 눌러 보고 나서야 안다.
        this.buttons([
            { label: "사무실로 나간다", sub: `${ch.year}년 · ${ch.title}`, primary: true,
              on: () => this.leaveHome() },
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
        // **반기는 안 적는다.** 상장이 반기마다 일어나지만 그건 로그가 말하고,
        // 「상반기」라는 말로 이번 턴에 무엇을 할지가 갈리지 않는다.
        this.drawBanner(`${ch.year}년 · ${e.player.maxTurns}턴 중 ${e.player.currentTurn}턴째`,
            true, () => { this.place = "ledger"; this.redraw(); });
        this.drawLog();
        this.drawSheet();
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

        // 창 하나 — 제목 표시줄이 이 창이 무엇을 말하는지를 적는다.
        const win = this.frame(b, "뉴스");
        const body = win.body;
        if (body.h <= 0) return;

        // 고객은 **회색 면 위**다. 값이 아니라 사람이라, 검은 화면에 넣을 것이 아니다.
        const c = this.client;
        const rowH = Math.min(CLIENT_ROW, body.h);
        // 왼쪽 끝의 색 막대 하나가 「사람이 앉아 있다」를 말한다. 상자를 두르지 않는다.
        this.rect(body.x + 4, body.y + 3, 3, rowH - 6, c ? C.bar : C.down, 1);

        // **얼굴.** 이 게임은 사람에게 설명하는 이야기인데, 그 사람이 여태 글자 두 줄이었다.
        // 그림이 없으면 아무것도 안 그리고 글자가 원래 자리에 선다 — 자리표시를 두지
        // 않는 이유는, 여기 빈 네모가 서면 「누가 앉았다」보다 「뭔가 빠졌다」로 읽혀서다.
        const faceH = rowH - 6;
        const face = c && rowH >= 34
            ? drawArt(this, `client-${c.id as ClientId}`, body.x + 10, body.y + 3, faceH, faceH,
                { veil: 0, tint: C.panel })
            : null;
        for (const o of face ?? []) this.keep(o);

        // **이름과 한마디는 각자 한 줄씩이다.** 한 줄에 붙이면 폭이 몇 픽셀 모자라
        // 한마디가 통째로 빠지는데, 고객을 사람으로 만드는 것이 그 한마디다.
        // 한 줄에 넣고 `textFit` 으로 줄이는 길도 있었지만 그러면 로그보다 작아진다.
        const tx = body.x + 13 + (face ? faceH + 6 : 0);
        const room = body.x + body.w - 4 - tx;
        if (!c) {
            this.text(tx, body.y + rowH / 2 - FS.xs / 2, "오늘은 아무도 앉지 않았다.", FS.xs, "#7a2f2f");
        } else if (rowH >= 34) {
            this.textClip(tx, body.y + 2, c.name, FS.xs, S.faceInk, 0, room);
            this.textClip(tx, body.y + 19, c.blurb, FS.xs, S.faceDim, 0, room);
        } else {
            this.textClip(tx, body.y + rowH / 2 - FS.xs / 2, c.name, FS.xs, S.faceInk, 0, room);
        }

        // 기록은 **검은 화면 안**이다. 지나간 값들이 흐르는 자리니까.
        const logY = body.y + rowH;
        const logH = body.h - rowH;
        if (logH <= 4) return;
        this.keep(crt(this, body.x, logY, body.w, logH));

        // **사무실 그림이 이 화면 안에 있다.** 한때는 화면 전체의 바탕이었는데, 창 둘이
        // 화면을 거의 다 덮으면서 가장자리 몇 픽셀로만 남았다 — 그릴 값어치가 없어진
        // 것이다. 여기라면 보인다: 로그는 아래에서부터 쌓이므로 위쪽이 늘 비고,
        // 그 빈 자리에 1997년의 사무실이 어렴풋이 있다.
        const art = drawArt(this, "office", body.x + 1, logY + 1, body.w - 2, logH - 2,
            { veil: ART_VEIL_BACK, cover: true });
        for (const o of art ?? []) this.keep(o);
        this.logView = new GameLog(this, { x: body.x, y: logY, width: body.w, height: logH });
        this.add.existing(this.logView);
        this.logView.setEntries(this.entries.slice(-LOG_KEEP));
    }

    /**
     * 띠 하나를 창으로 만든다. 그린 것은 여기서 챙기고 **속살만** 돌려준다.
     *
     * **세로로는 한 픽셀도 안 남긴다.** 띠 예산(`bandsOf`)이 창 껍데기 29px 을 이미
     * 세어 두었고, 여기서 위아래로 1px 씩 더 먹으면 제일 짧은 격자에서 고른 종목 판의
     * 버튼이 잘린다. 창끼리는 베벨이 맞닿아 갈리므로 틈이 없어도 두 창으로 보인다.
     */
    private frame(b: Band, title: string, note?: { text: string; color?: string }): { body: Band } {
        const win = winFrame(this, b.x + 2, b.y, b.w - 4, b.h, title, note);
        for (const o of win.parts) this.keep(o);
        return { body: win.body };
    }

    /**
     * 무엇을 고를까 — **화면의 본체.** 근거·계좌 한 줄 위에 종목 목록이 선다.
     *
     * 예전에는 이 자리에 손패가 있었고, 그 전에는 회사 정보판이 있었다. 종목 목록은
     * 「시세판」이라는 별도 화면에 있었는데 — 버튼을 눌러 화면을 옮기고 → 줄을 눌러
     * 판을 열고 → 다시 눌러 체결하는 세 단계였고, **애초에 종목을 골라야 하는지가
     * 화면에 안 적혀 있었다.** 목록이 늘 떠 있으면 그 질문이 사라진다.
     */
    private drawSheet(): void {
        const b = this.bands.market;
        if (b.h <= 0) return;

        const eq = this.engine.equity;

        // **계좌는 제목 표시줄 안이다.** 늘 보여야 하지만 판을 하나 더 세울 값어치는 없다.
        //
        // 종목 이름은 여기 없다 — 바로 아래 머리줄이 그것을 말한다. 보유 종목 수도 뺐다:
        // 이번 턴에 무엇을 할지가 그 숫자로 갈리는 자리가 없다.
        // **견주는 값은 챕터 시작이다.** 예전에는 `SEED_CASH`(2,500만) 고정이었는데,
        // 이제 계좌는 0 에서 열리고 고객이 맡길 때마다 커진다 — 고정값에 견주면
        // 1998 내내 빨간 숫자가 떠 있고, 그건 「잃고 있다」는 거짓말이다.
        // `chapterStart` 는 맡은 돈이 들어올 때 같이 올라가므로(`entrust`), 이 비교는
        // 정확히 **내가 굴려서 늘렸는가**를 말한다.
        const win = this.frame(b, "주식 현황", {
            text: money(eq),
            color: eq >= this.engine.chapterStart ? S.barInk : S.down,
        });

        this.sheet = new StockSheet({
            scene: this,
            band: win.body,
            row: () => this.rowOf(this.engine.focus),
            read: () => this.readOf(this.engine.focus),
            recall: () => this.recallNow(),
            researchBlock: () => this.researchBlock(),
            otherThesis: () => this.otherThesis(),
            researchCost: () => RESEARCH_COST,
            block: () => this.orderBlock(),
            clientName: () => this.client?.name ?? "아무도",
            incomingSay: () => {
                const got = this.client
                    ? entrustAmount(this.client, this.engine.player.energy, this.buff().thesis !== null)
                    : 0;
                // 이미 굴리던 돈이 있으면 그것도 함께 들어간다 — 그 사실을 감추지 않는다.
                return this.engine.player.cash > 0
                    ? `${money(got)} 맡긴다 + 현금`
                    : `${money(got)} 맡긴다`;
            },
            onResearch: (id: string) => this.research(id),
            onBuy: (id: string) => this.recommend(id),
            onSell: (id: string) => this.sell(id),
        });
        this.sheet.draw();
    }

    /**
     * 이 종목에 대해 **지금 알고 있는 것.**
     *
     * 알아본 그 종목만 열린다. 예전에는 `this.read` 를 어느 종목의 판에나 그대로
     * 넘겼는데, 국면은 시장 하나짜리라 **3 에너지로 아홉 종목이 다 열렸다.**
     * 종목을 가르는 것은 국면이 아니라 그 국면에 베타를 먹인 기울기이고,
     * `this.read` 의 기울기는 알아볼 때 포커스였던 종목의 것이다.
     */
    private readOf(id: string): MarketRead | null {
        return this.researched === id ? this.read : null;
    }

    /* ── 종목 목록 화면 ────────────────────────────────── */

    /**
     * 아홉 종목을 견주는 자리. **화면 하나를 통째로 쓴다.**
     *
     * 목록이 회사 화면 안에 있던 동안에는 고른 종목 판이 세로의 절반을 먹어서 두세
     * 줄밖에 안 남았다 — 폰에서 견줄 수가 없다는 말을 들은 자리다. 여기서는 아홉이
     * 다 선다. 줄을 한 번 누르면 골라지고 **곧장 회사로 돌아간다.**
     */
    private drawStockList(): void {
        const e = this.engine;
        this.drawBanner(`${e.chapter.year}년 · ${e.player.maxTurns}턴 중 ${e.player.currentTurn}턴째`);

        const bar = this.placeBar;
        const top = this.bands.strip.h;
        const th = this.buff().thesis;
        // 근거는 **있을 때만** 적는다. 「근거 없음」은 읽어도 아무것도 안 알려 준다.
        const win = winFrame(this, 2, top, this.W - 4, Math.max(0, bar.y - top),
            "종목 — 하나를 고른다",
            th ? { text: `근거 ${th}`, color: S.up } : undefined);
        for (const o of win.parts) this.keep(o);

        this.list = new StockList({
            scene: this,
            band: win.body,
            rows: () => this.stockRows(),
            selectedId: () => this.engine.focus,
            researchedId: () => this.researched,
            onPick: (id: string) => {
                this.engine.setFocus(id);
                this.place = "office";
                this.redraw();
            },
        });
        this.list.open();

        this.buttons([
            { label: "회사로 돌아간다", sub: `지금 고른 것 — ${e.focusStock.name}`,
              primary: false, on: () => { this.place = "office"; this.redraw(); } },
        ], bar);
    }

    /* ── 장부 화면 ─────────────────────────────────────── */

    /**
     * 돈 셋이 어떻게 이어지는가. **화면 하나를 통째로 쓴다.**
     *
     * 여태 화면에 뜬 돈은 둘이었다 — 「주식 현황」 옆의 자산과 배너의 빚. 그런데 실제로
     * 도는 돈은 셋이고 주인이 각각 다르다(`core/ledger.ts`). 그리고 **셋을 잇는 화살표가
     * 화면에 한 번도 없었다**: 늘린 것에서 보수를 떼고, 그 보수가 빚을 깎고, 남은 빚에
     * 이자가 붙는다.
     *
     * 그래서 플레이 중에는 「지금 347만을 벌어 놨는데 빚이 얼마나 깎이지?」 를 알 수
     * 없었고, 답은 챕터가 끝나야 나왔다 — 에너지를 올릴 턴이 다 지난 뒤에.
     *
     * ── 왜 사무실이 아니라 여기인가 ──────────────────────────
     * 이 열세 줄을 사무실에 얹으면 화면이 무너진다. 사무실은 **이번 턴에 무엇을 할까**만
     * 말하는 자리고, 장부는 **여태 어떻게 됐나**를 말한다. 종목 목록이 화면 하나로 나간
     * 것과 같은 이유다.
     */
    private drawLedger(): void {
        const e = this.engine;
        const ch = e.chapter;
        this.drawBanner(`${ch.year}년 · ${e.player.maxTurns}턴 중 ${e.player.currentTurn}턴째`);

        const bar = this.placeBar;
        const top = this.bands.strip.h;
        const win = winFrame(this, 2, top, this.W - 4, Math.max(0, bar.y - top), "장부");
        for (const o of win.parts) this.keep(o);
        const body = win.body;
        if (body.h <= 0) {
            this.buttons([{ label: "회사로 돌아간다", sub: "", on: () => this.leaveLedger() }], bar);
            return;
        }

        const L = ledgerOf({
            startEquity: e.chapterStart,
            equity: e.equity,
            cash: e.player.cash,
            peakEquity: e.peakEquity,
            energy: e.player.energy,
            debt: e.player.debt,
            interest: ch.interest,
            debtOnEnd: ch.debtOnEnd ?? 0,
            feePaid: this.memory.career.feePaid,
            wallet: e.player.wallet,
            livingCost: LIVING_COST,
            repaid: this.memory.career.repaid,
        });

        const signed = (v: number) => `${v >= 0 ? "+" : "−"}${money(Math.abs(v))}`;
        const tone = (v: number) => (v >= 0 ? S.up : S.down);
        const { entrusted: en, earned: ea, held: he, owed: ow } = L;

        // **부제가 흐름을 말한다.** 숫자만 늘어놓으면 표가 되고, 표는 셋이 서로
        // 무슨 사이인지를 안 알려 준다.
        const blocks: LedgerBlock[] = [
            // **머리의 한마디는 「누구 돈인가」만 말한다.** 흐름은 덩이 사이의 화살표가
            // 말하므로, 여기서 또 적으면 같은 말이 한 화면에 두 번 선다.
            {
                head: "맡은 돈", note: "고객 것이다", tint: C.steel,
                rows: [
                    ["챕터 시작", money(en.start), S.inkDim, false],
                    ["지금", money(en.now), S.ink, true],
                    ["이번 챕터", `${signed(en.delta)} · ${en.pct >= 0 ? "+" : ""}${en.pct.toFixed(1)}%`,
                        tone(en.delta), true],
                    ["현금 · 주식", `${money(en.cash)} · ${money(en.invested)}`, S.inkDim, false],
                    ["이번 판 최고", money(en.peak), S.inkDim, false],
                ],
                flow: `↓ 늘린 것에서 ${Math.round(ea.rate * 100)}% 를 뗀다`,
            },
            {
                head: "얻은 돈", note: "내 것이다", tint: C.gold,
                rows: [
                    ["보수율", `${Math.round(ea.rate * 100)}% · 에너지 ${e.player.energy}`, S.gold, true],
                    // **이 한 줄이 이 화면의 이유다.** 지금 끝나면 내 몫이 얼마인가.
                    ["지금 끝나면", ea.fee > 0 ? money(ea.fee) : "없다 — 못 늘렸다",
                        ea.fee > 0 ? S.up : S.inkDim, true],
                    ["여태 받은", money(ea.paid), S.inkDim, false],
                ],
                flow: "↓ 보수는 지갑으로 들어온다",
            },
            {
                head: "지갑", note: "내 것이다", tint: C.up,
                rows: [
                    ["지금", money(he.now), he.now > 0 ? S.ink : S.down, true],
                    // **「몇 턴치」가 액수보다 결정에 쓰인다.** 한 자리면 알바를 해야 하고,
                    // 두 자리면 영업에 쓸 턴이 남았다는 뜻이다.
                    [`생활비 ${money(he.cost)}`,
                        he.turns > 0 ? `${he.turns}턴치 남았다` : "이번 턴을 못 낸다",
                        he.turns > 2 ? S.inkDim : S.down, true],
                    ...(ea.fee > 0
                        ? [["챕터 끝에", money(he.afterFee), S.up, false] as LedgerRow]
                        : []),
                ],
                flow: "↓ 갚는 것은 내가 정한다",
            },
            {
                head: "갚을 돈", note: "내 빚이다", tint: C.down,
                // **빚이 없으면 이자도 없다.** 프롤로그가 그 상태인데, 거기서
                // 「이자 0% —」를 세워 두면 줄이 아무 말도 안 하고 자리만 차지한다.
                // 얹히는 빚 3천만만 남기는 편이 훨씬 아프게 읽힌다.
                rows: [
                    ["지금", ow.now > 0 ? money(ow.now) : "없다", ow.now > 0 ? S.down : S.up, true],
                    ...(ow.now > 0 && ch.interest > 0
                        // **이 줄이 「지금 갚을 이유」다.** 이자는 챕터 끝에 남은 빚에만
                        // 붙으므로, 그 전에 넣은 돈은 이 숫자를 그만큼 깎는다.
                        ? [[`이자 ${Math.round(ch.interest * 100)}%`, `+${money(ow.interest)}`,
                            S.down, true] as LedgerRow]
                        : []),
                    ...(ow.added > 0
                        ? [["새로 지는 빚", `+${money(ow.added)}`, S.down, true] as LedgerRow]
                        : []),
                    ...(ow.repaid > 0
                        ? [["여태 갚은", money(ow.repaid), S.up, false] as LedgerRow]
                        : []),
                    ["챕터 끝에", ow.end > 0 ? money(ow.end) : "다 갚는다",
                        ow.end > 0 ? S.down : S.gold, true],
                ],
            },
        ];

        // **연대기가 맨 위다.** 돈 셋보다 먼저 읽어야 하는 것이라서가 아니라, 이 화면에서
        // 유일하게 **다음 턴에 무엇을 할지**를 바꾸는 줄이라서다.
        //
        // 높이를 먼저 재서 블록 쌓기에 넘긴다 — 따로 그리면 가운데 맞춤이 띠를 빼고
        // 계산해서 띠와 첫 덩이 사이에 구멍이 하나 생긴다. 실제로 그랬다.
        const stripH = this.chronicleH(body);
        this.drawLedgerBlocks(body, blocks, stripH, y => this.drawChronicleStrip(body, y));

        // **갚는 자리는 장부 안이다.** 「지금 갚으면 이자가 얼마나 줄까」를 보고 있는 바로
        // 그 화면에서 누르지 않으면, 그 숫자를 다른 화면까지 들고 가야 한다.
        this.buttons([
            ...(he.canRepay > 0
                ? [{
                    label: "빚을 갚는다", short: "갚는다",
                    sub: `지갑에서 ${money(he.canRepay)}`,
                    primary: true, on: () => this.repayAll(),
                }]
                : []),
            { label: "회사로 돌아간다", sub: `${ch.year}년 ${e.player.currentTurn}턴째`,
              primary: he.canRepay <= 0, on: () => this.leaveLedger() },
        ], bar);
    }

    /**
     * 지갑에 있는 것을 **전부** 빚에 넣는다.
     *
     * ── 왜 액수를 안 고르게 하나 ───────────────────────────
     * 액수 조절은 슬라이더나 숫자판이 필요하고, 그건 이 게임에서 제일 비싼 화면이다.
     * 그런데 고를 값어치가 있는 선택은 **얼마를 갚나**가 아니라 **언제 갚나**다 — 이자가
     * 챕터 끝에 한 번 붙으므로, 끝나기 직전에 넣은 돈이 가장 값어치가 크다. 남겨 둘
     * 생활비가 필요하면 **안 누르면** 된다. 그 둘이면 결정은 충분히 선다.
     */
    private repayAll(): void {
        const r = this.engine.repayDebt(this.engine.player.wallet);
        if (r.paid <= 0) return;
        this.memory.career = recordRepay(this.memory.career, r.paid);
        saveMemory(this.memory);
        this.pushLog(`빚을 ${money(r.paid)} 갚았다. 남은 빚 ${money(r.debt)}.`,
            r.debt > 0 ? "fee" : "up");
        this.redraw();
    }

    /**
     * 이번 챕터의 턴 띠 — **겪어서 아는 것.**
     *
     * 열두 칸이 한 줄로 선다. 초록은 올랐던 턴, 빨강은 떨어졌던 턴, 금색은 흐렸던 턴,
     * 검은 칸은 **아직 안 가 본 곳**이다. 지금 턴에는 흰 눈금이 선다.
     *
     * 이 한 줄이 이 게임에서 회귀가 헛돌지 않게 하는 자리다(`core/chronicle.ts`).
     * 떨어질 턴이 보이면 3 에너지를 안 쓰고 넘기고, 그 에너지가 보수율이 되고,
     * 보수가 빚을 깎는다.
     *
     * @returns 이 띠가 먹은 세로. 0 이면 아무것도 안 그렸다.
     */
    private chronicleH(body: Band): number {
        // 자리가 없으면 접는다 — 돈 셋이 먼저다.
        return body.h < CHRON_H + 40 ? 0 : CHRON_H;
    }

    private drawChronicleStrip(body: Band, top: number): void {
        const e = this.engine;
        const turns = e.player.maxTurns;
        const strip = chapterStrip(this.memory.chronicle, e.chapter.id, turns);
        const known = strip.filter(r => r !== null).length;

        const HEAD = 18, CELL = 16;
        this.rect(body.x + 4, top + 5, 3, HEAD - 6, C.neon, 1);
        this.text(body.x + 12, top + 4, "연대기", FS.xs, S.faceInk);
        // **모르면 모른다고 적는다.** 「0/12」 는 「여기는 처음이다」를 세는 말이다.
        this.textFit(body.x + body.w - 6, top + 4,
            known > 0 ? `겪어서 아는 턴 ${known}/${turns}` : "이 해는 처음이다",
            FS.xs, known > 0 ? S.faceDim : "#8b6a3a", 1, body.w * 0.6);

        const y = top + HEAD;
        this.keep(crt(this, body.x + 3, y, body.w - 6, CELL + 8));
        const x0 = body.x + 8;
        const room = body.w - 16;
        const cw = room / turns;
        for (let i = 0; i < turns; i++) {
            const r = strip[i];
            const col = r === "bull" ? C.up : r === "bear" ? C.down : r === "chop" ? C.gold : C.grid;
            this.rect(Math.round(x0 + i * cw), y + 4, Math.max(1, Math.round(cw) - 2), CELL, col, 1);
            // 지금 턴에 눈금 하나. 열두 칸 중 어디에 서 있는지를 이것으로 센다.
            if (i + 1 === e.player.currentTurn) {
                this.rect(Math.round(x0 + i * cw), y + 4 + CELL - 3, Math.max(1, Math.round(cw) - 2), 3, C.lit, 1);
            }
        }
    }

    private leaveLedger(): void {
        this.place = "office";
        this.redraw();
    }

    /**
     * 세 덩이를 세로로 쌓는다. **안 들어가면 줄을 버린다** — 눌러 담지 않는다.
     *
     * 격자 세로는 398 까지 짧아질 수 있고 가로로 눕히면 창이 245px 밖에 안 된다. 열세
     * 줄을 그 안에 억지로 넣으면 줄 높이가 12px 이 되어 아무것도 안 읽힌다. 그래서
     * **덜 중요한 줄부터 버린다**(`keep` 이 false 인 것). 그것도 모자라면 뒤에서부터
     * 버린다 — 어차피 안 그려지는 줄이라면 자리라도 어긋나지 않는 편이 낫다.
     */
    private drawLedgerBlocks(
        body: Band, blocks: LedgerBlock[], headH = 0, drawHead?: (y: number) => void,
    ): void {
        // 치수와 셈은 `ui/theme.ts` 가 낸다 — 사이(gap)의 개수를 한 번 잘못 세어
        // 마지막 덩이가 버튼 띠 밑으로 밀린 적이 있고, 스크린샷으로는 그때그때만
        // 잡히는 고장이라 값으로 빼서 테스트가 붙잡게 했다(`stackPlan`).
        const { ROW, HEAD, INNER } = STACK;
        const height = () => stackH(blocks.map(b => b.rows.length), headH);

        // 버릴 순서: **먼저 「없어도 되는」 줄, 그 다음에 가운데부터.**
        //
        // 지켜야 할 줄까지 버려야 할 때 **덩이의 마지막 줄은 맨 나중에** 버린다. 각
        // 덩이의 마지막 줄이 그 덩이의 결론이라서다 — 「챕터 끝에 3,000만」을 버리고
        // 「새로 지는 빚 +3,000만」만 남기면, 결국 얼마가 되는지가 화면에서 사라진다.
        // 눕힌 폰에서 실제로 그렇게 나왔다.
        const dropOne = (pass: "optional" | "middle" | "last"): boolean => {
            for (let i = blocks.length - 1; i >= 0; i--) {
                const rows = blocks[i]!.rows;
                // 「없어도 되는」 줄은 어디 있든 먼저 버린다. 마지막 줄을 아끼는 것은
                // **지켜야 할 줄끼리** 견줄 때의 이야기다.
                const from = pass === "middle" ? rows.length - 2 : rows.length - 1;
                const to = pass === "last" ? rows.length - 1 : 0;
                for (let j = from; j >= to; j--) {
                    if (pass === "optional" && rows[j]![3]) continue;
                    rows.splice(j, 1);
                    return true;
                }
            }
            return false;
        };
        const room = body.h - 4;
        for (const pass of ["optional", "middle", "last"] as const) {
            while (height() > room && dropOne(pass)) { /* 다 버릴 때까지 */ }
        }

        // **남는 세로는 나눠 갖는다.** 위에서부터 쌓기만 하면 긴 폰에서 아래 3분의 1이
        // 통째로 빈 은색 판이 된다 — 시작 화면이 한 번 그랬고, 여기서도 그랬다.
        // 사이를 먼저 벌리고(너무 벌어지면 덩이들이 남남이 되므로 상한을 둔다),
        // 그러고도 남으면 통째로 가운데로 내린다.
        const { gap, top } = stackPlan(blocks.map(b => b.rows.length), headH, room);

        let y = body.y + 2 + top;
        if (drawHead && headH > 0) { drawHead(y); y += headH + gap; }
        for (const blk of blocks) {
            if (blk.rows.length === 0) continue;
            // 머리는 **회색 면 위**라 검은 글자다. 왼쪽 색 조각이 어느 갈래인지를 먼저 말한다.
            this.rect(body.x + 4, y + 3, 3, HEAD - 6, blk.tint, 1);
            this.text(body.x + 12, y + 2, blk.head, FS.xs, S.faceInk);
            this.textFit(body.x + body.w - 6, y + 2, blk.note, FS.xs, S.faceDim, 1, body.w * 0.6);
            y += HEAD;

            // 값은 **검은 화면 안.** 이 팔레트의 규칙이다.
            const h = blk.rows.length * ROW + INNER * 2;
            this.keep(crt(this, body.x + 3, y, body.w - 6, h));
            let ry = y + INNER + 2;
            for (const [k, v, ink] of blk.rows) {
                this.text(body.x + 11, ry, k, FS.xs, S.inkDim);
                this.textFit(body.x + body.w - 11, ry, v, FS.xs, ink, 1, body.w * 0.62);
                ry += ROW;
            }
            y += h;

            // 사이가 넉넉할 때만. 좁은 데 끼워 넣으면 위아래 덩이에 달라붙어
            // 어느 쪽 말인지 모르게 된다.
            if (blk.flow && gap >= 26) {
                this.textFit(body.x + body.w / 2, y + Math.round(gap / 2) - FS.xs / 2 - 1,
                    blk.flow, FS.xs, S.faceDim, 0.5, body.w - 20);
            }
            y += gap;
        }
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
        const done = this.recommendedThisTurn;
        const focus = this.engine.focus;

        // **지금 눌러야 하는 것은 화면에 하나뿐이다.** 그 하나가 턴을 따라 옮겨 다니는데,
        // 어디에 있는지는 판이 정한다 — 아직 안 알아봤으면 판의 「알아본다」에 있고,
        // 알아봤는데 살 자리가 아니면 여기 「하루를 넘긴다」로 온다.
        //
        // 예전에는 이 셈에 판정이 안 들어가 있었다. 그래서 「이 종목은 아니다」가 뜬 턴에는
        // **화면 어디에도 밝은 버튼이 없었다** — 다음에 뭘 해야 하는지를 화면이 말하지 않았다.
        const canStillResearch = this.researchBlock() === "none";
        // **못 누르는 것은 「할 일」이 아니다.** 앞에 아무도 없거나 현금이 모자라면
        // 아무리 좋은 판정이 떠도 이번 턴에 권할 수는 없다.
        const worthBuying = !done
            && this.orderBlock() === "none"
            && this.researched === focus
            && worthRecommending(verdictOf(this.readOf(focus)));
        // **겪어서 아는 턴은 알아볼 값어치가 없을 수 있다.** 떨어졌던 턴인 걸 아는데
        // 3 에너지를 쓰는 것은 낭비고, 그 낭비를 줄이는 것이 회귀의 유일한 보상이다
        // (`core/chronicle.ts`). 그래서 기억이 「아니다」라고 말하면 알아보기는
        // **할 일에서 빠지고** 「하루를 넘긴다」가 밝아진다.
        //
        // 막지는 않는다 — 뉴스는 시드가 굴리므로 기억이 다 맞지는 않고, 무엇보다
        // 아는 것을 이유로 버튼을 잠그면 「내가 정한다」가 없어진다.
        const memoSaysSkip = this.researched !== focus && !worthResearching(this.recallNow());

        // **무름은 「남은 일」이 아니라 고치는 자리다.** 그것 때문에 「하루를 넘긴다」를
        // 안 밝히면, 사고 난 뒤에 다음 걸음이 화면에서 사라진다.
        const nothingLeft = (!canStillResearch || memoSaysSkip) && !worthBuying;

        // **버튼 둘, 무를 것이 있으면 셋.**
        //
        // 「무른다」가 여기 있는 이유: 무름은 한 턴을 통째로 되돌리는 **턴 단위 행동**이다.
        // 한때 종목 판의 체결 칸이 체결 뒤에 「무른다」로 바뀌었는데, 그러면 **팔아서
        // 현금을 만든 다음 권하는 길이 막혔다** — 바로 위 칸이 「팔아야 권할 현금이
        // 생긴다」고 말해 놓고 팔고 나면 권하는 버튼이 사라졌다. 매매 칸은 매매만 진다.
        //
        // 셋이 서면 칸이 118px 로 줄어 부제가 눌린다. 그래서 부제를 짧게 둔다 — 고른
        // 종목의 이름은 바로 위 창 제목이 이미 말하고 있어서 여기서 뺐다.
        const acts: ButtonDef[] = [
            {
                label: "종목 고르기", short: "고르기", sub: "", primary: false,
                on: () => { this.place = "market"; this.redraw(); },
            },
        ];
        if (this.traded) {
            acts.push({ label: "무른다", sub: "아침으로", primary: false, on: () => this.undoTrades() });
        }
        // **알바와 무름은 한 화면에 같이 설 수 없다.** 무를 것이 있다는 건 이미 권했다는
        // 뜻이고, 하루는 하나뿐이라 권한 날에 하루를 팔 수는 없다. 그래서 버튼은
        // 어느 쪽이든 셋을 넘지 않는다 — 넷이 서면 칸이 좁아져 부제가 눌린다.
        else if (!done) {
            // 지갑이 이번 턴 생활비에 못 미치면 **이 버튼이 그날의 유일한 할 일이다.**
            const broke = this.engine.player.wallet < LIVING_COST;
            acts.push({
                label: "하루를 판다", short: "알바",
                sub: `+${money(PARTTIME_PAY)} · 에너지 −${PARTTIME_ENERGY}`,
                primary: broke,
                on: () => this.workShift(),
            });
        }
        acts.push({
            label: "하루를 넘긴다", short: "넘긴다",
            // 안 권하고 넘기면 그것이 곧 기다리는 것이다. 대가를 누르기 전에 말한다.
            sub: done ? `권했다 · −${ENERGY_DECAY}` : `에너지 −${ENERGY_DECAY}`,
            primary: nothingLeft && this.engine.player.wallet >= LIVING_COST,
            on: () => this.endTurn(),
        });
        this.buttons(acts);
    }

    /**
     * 하루를 판다. **알바도 턴을 끝낸다** — 하루는 하나뿐이다.
     *
     * 이것이 이 게임에서 유일하게 **근거 없이도 확실한** 수입이다. 그래서 값이 비싸다:
     * 에너지 9 는 알아보기 세 번 값이고, 그 에너지가 곧 고객이 맡기는 돈의 크기이자
     * 보수율이다(`core/clients.ts` · `core/energy.ts`). 굶지 않으려고 판 하루가
     * 벗어날 힘을 그만큼 깎는다 — 그 저울이 이 버튼의 전부다.
     */
    private workShift(): void {
        const pay = this.engine.workShift(PARTTIME_PAY, PARTTIME_ENERGY);
        this.memory.career = recordWage(this.memory.career, pay);
        saveMemory(this.memory);
        this.actedThisTurn = true;
        this.pushLog(`하루를 팔았다. ${money(pay)}. 에너지 −${PARTTIME_ENERGY}`, "fee");
        this.endTurn();
    }

    /**
     * 버튼 띠 — **이 띠도 창이다.**
     *
     * ── 왜 제목을 다나 ─────────────────────────────────────
     * 화면의 다른 판은 전부 제 이름을 달고 있다(「뉴스」·「주식 현황」·「장부」·「집」).
     * 그런데 버튼만 **이름 없는 회색 판**이었다. 그래서 이 자리가 무엇을 하는 곳인지
     * 화면이 한 번도 말하지 않았다 — 다른 판은 「무엇을 보는 곳」이고 여기만
     * 「무엇을 하는 곳」인데, 그 차이가 생김새에 안 나타나 있었다.
     *
     * 제목 표시줄이 서면 그 차이가 한눈에 보인다. 그 시절 대화상자가 실제로 그랬다 —
     * 아래쪽 버튼 줄도 창의 일부였지 허공에 뜬 단추가 아니었다.
     *
     * **자리가 모자라면 제목을 접는다.** 짧은 격자(398)에서는 껍데기 29px 이 버튼을
     * 15px 로 눌러 버린다 — 그때는 이름보다 누를 수 있는 것이 먼저다.
     *
     * @param band 어느 띠에 세울까. 안 주면 회사 화면의 버튼 띠.
     *   **집·공원은 두 칸 배치를 안 쓴다** — 장소가 곧 화면이라 가로에서도 전폭이다.
     * @param title 이 띠가 무엇을 하는 곳인가. 기본은 「할 일」 — 어느 화면에서든
     *   이 자리의 뜻은 같으므로, 화면마다 다른 이름을 붙이면 같은 것이 달라 보인다.
     */
    private buttons(defs: ButtonDef[], band?: Band, title = "할 일"): void {
        const outer = band ?? this.bands.action;
        // **버튼이 놓인 판.** 그 시절 대화상자의 아래쪽이 이렇게 생겼다 — 버튼은 회색
        // 판 위에 놓이지, 허공에 떠 있지 않다. (한때 이 띠를 안 칠하고 위 선 하나로만
        // 갈랐는데, 그건 화면이 어두운 터미널이었을 때의 궁리다.)
        let b = outer;
        if (outer.h >= ACTION_FRAMED_MIN) {
            const win = winFrame(this, outer.x + 2, outer.y, outer.w - 4, outer.h, title);
            for (const o of win.parts) this.keep(o);
            b = win.body;
        } else {
            this.keep(bevel(this, outer.x, outer.y, outer.w, outer.h));
        }

        const gap = 8;
        // **몇 개를 세우느냐로 칸을 나눈다.** 4칸 격자에 둘만 넣으면 왼쪽 절반에 몰리고
        // 칸이 87px 로 좁아져 「여섯 장 고른다」가 줄어든다.
        const live = defs.filter(d => d.label).length;
        const cols = Math.max(1, live);
        const rowHasSub = defs.some(d => d.sub) && b.h - PAD * 2 >= 40;
        const cw = (b.w - PAD * 2 - gap * (cols - 1)) / cols;
        const chh = b.h - PAD * 2;

        defs.forEach((d, i) => {
            if (!d.label) return;
            const x = b.x + PAD + i * (cw + gap);
            const y = b.y + PAD;
            const on = d.on !== null;
            const skin = skinOf(on, Boolean(d.primary));

            // **면이 셋을 가른다** — 밝고 테를 두른 것 / 여느 회색 / 가라앉은 것.
            const faces = btnFace(this, x, y, cw, chh, skin);
            for (const g of faces) this.keep(g);

            // **부제 자리는 줄 전체가 함께 정한다.** 한 칸만 부제가 없다고 그 이름만
            // 가운데로 올라가면 나란한 이름들의 높이가 어긋난다.
            const showSub = rowHasSub;
            // **한 줄의 글자 크기는 칸 폭 하나로 정해진다.** 칸마다 다른 크기가 되면
            // 같은 줄에 크기가 둘셋 섞인다.
            const size = cw < 124 ? FS.sm : FS.md;
            const room = cw - 14;
            // 긴 이름은 **줄이기 전에 짧은 이름으로 바꾼다.** 줄이는 것은 마지막 수단이다.
            const label = this.text(x + cw / 2, y + chh / 2 - (showSub ? 13 : size / 2),
                d.label, size, skin.ink, 0.5);
            if (d.short && label.displayWidth > room) label.setText(d.short);
            if (label.displayWidth > room) {
                setSize(this, label, Math.max(MIN_FS, Math.floor(size * (room / label.displayWidth))));
            }
            const subT = showSub && d.sub
                ? this.textFit(x + cw / 2, y + chh / 2 + 7, d.sub, FS.xs, skin.sub, 0.5, room)
                : null;
            if (!on) return;
            // 버튼은 **얼굴과 글자가 같이 내려간다** — 실제로 눌러 들어가는 느낌이 난다.
            const parts = subT ? [...faces, label, subT] : [...faces, label];
            const { zone, shade } = pressable(this, x, y, cw, chh, parts, d.on!);
            this.keep(shade);
            this.keep(zone);
        });
    }

    /* ── 종목 목록 ─────────────────────────────────────── */

    private stockRows(): StockRow[] {
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

    /** 고른 종목 한 줄. 판이 이것 하나만 그린다. */
    private rowOf(id: string): StockRow | null {
        return this.stockRows().find(r => r.stock.id === id) ?? null;
    }

    /* ── 권한다 · 거둔다 · 기다린다 ───────────────────── */

    /**
     * 권한다. **한 턴에 한 번뿐이다** — 고객이 한 명이니까.
     *
     * 근거가 없으면 고객이 거절할 수 있다. 박 대리는 거의 거절하고 어머니는 무조건 받는다.
     * 거절당하면 아무 일도 안 일어나고 에너지만 자연 감소한다.
     */
    private recommend(id: string): void {
        // **막힌 이유가 있으면 여기까지 오지 않는다.** 화면이 이미 버튼을 잠그고 그
        // 이유를 적어 두었으므로(`orderBlock`), 이 줄은 두 번째 자물쇠다.
        if (this.recommendedThisTurn || this.orderBlock() !== "none") return;
        if (!this.client) return;
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

        // **받아들였다는 것은 돈을 맡긴다는 뜻이다.** 여기가 맡은 돈이 생기는 유일한
        // 자리다 — 1998 은 계좌 0 원으로 열리므로, 첫 턴의 이 한 번이 없으면 살 것이 없다.
        // 액수는 에너지와 그 사람의 형편이 정한다(`core/clients.ts`).
        const got = this.engine.entrust(entrustAmount(c, this.engine.player.energy, thesis !== null));
        if (got > 0) {
            this.pushLog(`${c.name}이(가) ${money(got)}을 맡겼다.`, "up");
        }

        const before = this.engine.player.cash;
        const r = this.engine.buyHalf(id, buff);
        if (!r.ok) { this.pushLog(r.error, "warn"); this.closeBoardAndRedraw(); return; }

        this.engine.setFocus(id);
        this.recommendedThisTurn = true;
        this.actedThisTurn = true;
        this.traded = true;
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
        this.traded = true;
        // 권한 종목을 그 턴에 도로 팔면 정산은 그 결과로 한다.
        if (this.pending?.id === id) this.pending = null;
        this.closeBoardAndRedraw();
    }

    /** 체결한 뒤 화면을 다시 세운다. 목록도 여기서 새 값으로 다시 그려진다. */
    private closeBoardAndRedraw(): void {
        this.redraw();
    }

    /**
     * **방금 한 체결을 되돌린다.** 턴이 열린 자리로 돌아간다.
     *
     * 주가는 `endTurn` 에서만 움직이므로, 턴이 넘어가기 전이라면 되돌리는 데 값이
     * 없다 — 되돌리고 다시 사면 값도 수수료도 똑같다. 그래서 무름으로 이득을 볼 수
     * 없고, 오직 잘못 누른 것을 고치는 데만 쓰인다.
     *
     * **알아본 것은 안 되돌린다.** 에너지를 써서 안 것을 도로 모르게 만들 수는 없고,
     * 그걸 허용하면 알아보고 → 마음에 안 들면 무르고 → 다른 걸 알아보는 것이 공짜가 된다.
     *
     * 로그도 턴이 열린 자리로 잘라 낸다. 무른 것은 일어나지 않은 일이라 기록에 남을
     * 이유가 없다 — 대신 **무른 사실 한 줄**은 남는다. 그것은 실제로 일어난 일이다.
     */
    private undoTrades(): void {
        const m = this.mark;
        if (!m || !this.traded) return;

        this.engine.restoreTrades(m.trades);
        this.recommendedThisTurn = m.recommended;
        this.actedThisTurn = m.acted;
        this.pending = m.pending;
        this.facts = { ...m.facts };
        this.traded = false;
        this.entries.length = Math.min(this.entries.length, m.logLen);
        this.pushLog("방금 한 것을 무르고 아침으로 돌렸다.", "system");
        this.redraw();
    }

    /** 이번 턴에 다른 종목을 알아봤으면 그 이름. */
    private otherThesis(): string | null {
        if (!this.researched || this.researched === this.engine.focus) return null;
        return this.engine.stockOf(this.researched)?.name ?? null;
    }

    /** 지금 알아보는 것을 막는 것. 없으면 `"none"`. */
    private researchBlock(): ResearchBlock {
        return researchBlock({
            researchedThis: this.researched === this.engine.focus,
            otherThesis: this.otherThesis(),
            recommended: this.recommendedThisTurn,
            energy: this.engine.player.energy,
            cost: RESEARCH_COST,
        });
    }

    /** 지금 권하는 것을 막는 것. 없으면 `"none"`. */
    private orderBlock(): OrderBlock {
        return recommendBlock({
            hasClient: this.client !== null,
            recommended: this.recommendedThisTurn,
            // 거절당한 턴은 체결이 없으므로 `traded` 가 false 다 — 그 상태가 곧 거절이다.
            traded: this.traded,
            cash: this.engine.player.cash,
            // 지금 권하면 앞에 앉은 사람이 맡길 돈. **근거를 댔는지까지 본다** —
            // 근거 없이 권하면 받아 주더라도 훨씬 적게 맡긴다(`BLIND_ENTRUST`).
            incoming: this.client
                ? entrustAmount(this.client, this.engine.player.energy, this.buff().thesis !== null)
                : 0,
            equity: this.engine.equity,
            price: this.engine.priceOf(this.engine.focus),
        });
    }

    /* ── 턴 ───────────────────────────────────────────── */

    private beginTurn(): void {
        this.client = clientAt(this.memory.cycle, this.engine.chapter.id, this.engine.player.currentTurn, this.gone);
        this.recommendedThisTurn = false;
        this.actedThisTurn = false;
        this.traded = false;
        // 알아본 것은 **그 턴에만** 유효하다. 하루가 지나면 다시 알아봐야 한다.
        this.researched = null;
        this.read = this.engine.read(this.buff());
        // **여기가 「무른다」의 목적지다.** 턴이 열린 자리를 떠 둔다.
        this.mark = {
            trades: this.engine.markTrades(),
            recommended: false,
            acted: false,
            pending: null,
            facts: { ...this.facts },
            logLen: this.entries.length,
        };

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

        // **생활비는 매 턴 빠진다.** 굶는 것이 조용히 넘어가지 않게 하는 자리다 —
        // 못 내면 최 사장에게 급전을 당기고, 그만큼 빚이 늘어 이자가 붙을 몸통이 커진다.
        const live = this.engine.payLivingCost(LIVING_COST);
        if (live.short) {
            this.pushLog(`생활비를 못 냈다. 급전 ${money(SHORTFALL_DEBT)}을 당겼다.`, "warn");
        } else {
            this.pushLog(`생활비 ${money(live.paid)}.`, "fee");
        }

        this.settleEnergy(buff);
        this.pending = null;

        // **겪은 턴을 연대기에 적는다.** `advanceTurn()` 앞이라야 지금 막 지나간 턴의
        // 국면이 적힌다. 다음 회차에 이 턴으로 돌아오면 기억 쪽에서 읽는다
        // (`core/chronicle.ts`) — 회귀가 헛돌지 않게 하는 자리가 여기 하나다.
        this.noteChronicle();
        this.engine.advanceTurn();

        if (this.engine.isOver) { this.finishChapter(); return; }
        this.beginTurn();
    }

    /**
     * 방금 지나간 턴의 국면을 기억에 남긴다. **적힌 것이 없을 때만 저장한다** —
     * 뼈대가 회차를 넘어 같으므로 두 번째로 겪는 턴은 이미 같은 값이 적혀 있다.
     */
    private noteChronicle(): void {
        const regime = this.engine.regimeNow;
        if (!regime) return;
        const next = noteTurn(this.memory.chronicle, this.engine.chapter.id,
            this.engine.player.currentTurn, regime);
        if (next === this.memory.chronicle) return;
        this.memory = { ...this.memory, chronicle: next };
        saveMemory(this.memory);
    }

    /**
     * 이번 턴을 겪은 적이 있는가. **알아본 것과는 다른 값이다** —
     * 이건 기억이고 저건 근거다(`core/chronicle.ts` 의 「아는 것은 근거가 아니다」).
     */
    private recallNow(): Regime | null {
        return recallAt(this.memory.chronicle, this.engine.chapter.id,
            this.engine.player.currentTurn);
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
        this.drawBanner(`공원 · ${this.engine.chapter.year}   ${this.memory.cycle}회차`);
        const bar = this.placeBar;
        const body = this.paper("공원");
        if (body.h <= 0) return;

        const rowsTop = this.crtRows(body, [
            ["남은 빚", this.engine.player.debt > 0 ? `−${money(this.engine.player.debt)}` : "0",
                this.engine.player.debt > 0 ? S.down : S.up],
            ["떠난 사람", this.gone.length
                ? this.gone.map(id => CLIENTS.find(c => c.id === id)?.name ?? id).join(" · ") : "없다", S.down],
            ["모은 상황카드", `${this.memory.situations.length} — 남는다`, S.up],
        ]);

        const { side, top } = this.artFit(body, rowsTop, 0.56,
            FS.md + 20 + info.lines.length * (FS.xs + 6));
        // **끝난 방식에 따라 그림이 갈린다** — 아직 굴러가는 둘은 벤치, 무너진 둘은 그 인물.
        this.placeArt(`park-${reason}`, body.x + (body.w - side) / 2, top, side,
            "공원", won ? S.up : S.danger, info.title);

        // 어떻게 끝났는가 — **색이 곧 뜻이라** 검은 화면 안이다. 예전에는 끝나는 방법
        // 넷을 늘어놓고 걸린 것만 켰는데, 판 하나에 못 누르는 칸이 셋이나 서는 셈이었다.
        // 지금 걸린 하나만 말한다.
        let y = top + side + 10;
        if (y + FS.md + 12 <= rowsTop) {
            y += this.crtLine(body, y, info.title, FS.md, won ? S.up : S.danger);
        }

        for (const line of info.lines) {
            if (y + FS.xs > rowsTop - 4) break;
            this.textFit(body.x + body.w / 2, y, line, FS.xs, S.faceDim, 0.5, body.w - 16);
            y += FS.xs + 6;
        }

        // 「도감」은 눌러도 아무 일이 없는 죽은 버튼이었다. 도감으로 가는 길은 캔버스
        // 아래의 「카드 도감」 링크에 이미 있고, 모은 장수는 위 요약 줄이 말한다.
        //
        // **이기면 회귀하지 않는다.** 예전에는 라벨만 「여기서 끝」이고 하는 일은 똑같이
        // `goBack()` 이라, 빚을 다 갚아도 1997 로 되돌아갔다. `breaksLoop` 가 코드에
        // 있는데 화면이 그걸 안 봤다.
        this.buttons([
            won
                ? { label: "여기서 끝낸다", sub: `${this.memory.cycle}회차 만에 갚았다`, primary: true,
                    on: () => this.go("ending", cutEnded(this.memory.cycle)) }
                : { label: "눈을 감는다", sub: "다시 1997년으로", primary: true,
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
