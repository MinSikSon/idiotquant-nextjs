// 판이 도는 화면 — 도트 스타일 기본 틀.
//
// **여기에 규칙을 쓰지 않는다.** 주가도 체결도 카드 효과도 전부 lib/game/core 에서 온다.
// 이 파일에 `price * 1.1` 같은 식이 생기면 그건 코어로 가야 할 것이 새어 나온 것이다.
//
// ── 한 턴의 순서 ────────────────────────────────────────────────
//   턴 열림 → 손패 세 장 → 유물(onTurnStart) → [매매] → [NEXT TURN]
//   → 카드+유물을 합친 buff 로 tick → 유물(onTurnEnd) → 다음 턴
//
// 매매가 tick 앞에 오는 것이 이 게임의 전부다. **주가가 움직이기 전에** 살지 말지를
// 정해야 해서, 카드로 읽은 것을 손에 쥐고 거는 판이 된다.
//
// ── 자리는 씬이 정하지 않는다 ───────────────────────────────────
// 네 칸의 좌표는 `bandsOf(w, h)` 가 준다. 세로면 위에서 아래로 넷, 가로면 왼쪽·오른쪽
// 두 칸이다. 이 파일은 **받은 사각형 안에** 그릴 뿐이라, 배치를 하나 더 만들 때 여기를
// 안 고친다. 그래서 아래 build* 들은 `W` 같은 모듈 상수를 절대 안 쓴다 — 자기 띠의
// `b.x`·`b.w` 만 본다.
//
// ── 늘릴 자리 ───────────────────────────────────────────────────
//   · 종목을 여럿으로   → StockEngine 을 배열로 들고 chart 를 자리마다
//   · 상점·이벤트 턴    → Scene 을 하나 더 만들고 config.ts 의 scene 배열에 얹는다
//   · 연출(체결 이펙트) → this.tweens. 엔진은 안 건드린다

import Phaser from "phaser";
import { StockEngine } from "@/lib/game/core/StockEngine";
import { CARD_LIST, OPENING_DECK_SIZE, RELIC_POOL, RoguelikeManager } from "@/lib/game/core/RoguelikeManager";
import type { MarketRead, Relic, RunSummary, StrategyCard, TradeResult } from "@/lib/game/core/types";
import { MAX_TIER, MAX_TURNS, RUIN_LINE, SEED_CASH } from "@/lib/game/core/StockEngine";
import {
    loadProgress, newlyUnlocked, recordRun, resetProgress, unlockedIds, UNLOCKS, type Progress,
} from "@/lib/game/core/progress";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { CardHandContainer } from "@/lib/game/components/CardHandContainer";
import { GameLog, type LogEntry } from "@/lib/game/components/GameLog";
import { PAD, C, S, FS, bandsOf, designSize, fontOf, money, pct, tone, type LogKind } from "@/lib/game/ui/theme";
import type { Bands } from "@/lib/game/ui/theme";

/* ── 버튼 ───────────────────────────────────────────────────── */

interface BtnOpts {
    tone?: "plain" | "buy" | "sell" | "go";
    size?: number;
}

interface Btn {
    root: Phaser.GameObjects.Container;
    setEnabled(v: boolean): void;
    setLabel(s: string): void;
}

const BTN_FACE = {
    plain: { face: C.panel, edge: C.line, ink: S.ink },
    buy: { face: 0x14361f, edge: C.up, ink: S.up },
    sell: { face: 0x3a1a14, edge: C.down, ink: S.down },
    go: { face: 0x123a2a, edge: C.neon, ink: S.neon },
} as const;

function makeButton(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number,
    text: string, onClick: () => void, o: BtnOpts = {},
): Btn {
    const skin = BTN_FACE[o.tone ?? "plain"];
    const root = scene.add.container(x, y);
    const g = scene.add.graphics();
    const t = scene.add.text(w / 2, h / 2, text, {
        fontFamily: fontOf(scene), fontSize: `${o.size ?? FS.md}px`, color: skin.ink, align: "center",
    }).setOrigin(0.5);

    let enabled = true;
    const draw = (pressed: boolean) => {
        g.clear();
        g.fillStyle(skin.face, 1).fillRect(0, 0, w, h);
        g.lineStyle(pressed ? 3 : 2, skin.edge, 1).strokeRect(1, 1, w - 2, h - 2);
        // 눌린 동안 안쪽에 선을 하나 더 — 손끝 말고 눈으로도 눌린 것이 보여야 한다.
        if (pressed) g.lineStyle(1, skin.edge, 0.5).strokeRect(5, 5, w - 10, h - 10);
    };
    draw(false);

    const zone = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    root.add([g, t, zone]);

    zone.on("pointerdown", () => { if (enabled) draw(true); });
    zone.on("pointerout", () => { if (enabled) draw(false); });
    zone.on("pointerup", () => {
        if (!enabled) return;
        draw(false);
        onClick();
    });

    return {
        root,
        setEnabled(v: boolean) { enabled = v; root.setAlpha(v ? 1 : 0.35); draw(false); },
        setLabel(s: string) { t.setText(s); },
    };
}

/** 해금된 것의 이름. 카드든 유물이든 한자리에서 찾는다. */
function nameOfUnlock(id: string): string {
    return CARD_LIST.find(c => c.id === id)?.name
        ?? RELIC_POOL.find(r => r.id === id)?.name
        ?? id;
}

/** 다음 해금까지 얼마 남았는가. 없으면 다 모았다고 말한다. */
function nextUnlockNote(careerIP: number): string {
    const next = UNLOCKS.find(u => careerIP < u.at);
    return next ? `${nameOfUnlock(next.id)}까지 ${next.at - careerIP}` : "모두 열림";
}

/** 오버레이 안쪽 칸이 이보다 낮으면 세로로 늘어놓을 자리가 없다 — 눕혀서 편다. */
const TALL_ENOUGH = 420;

/**
 * 로그를 몇 줄까지 들고 있을까.
 *
 * 한 판이 열두 턴이라 백 줄을 넘길 일이 드물지만, 자금과 덱이 판을 넘어 이어지므로
 * 계속 굴리면 언젠가는 넘는다. 되감아 볼 수 있는 만큼만 남기고 앞에서 버린다.
 */
const LOG_KEEP = 300;

/* ── 씬 ─────────────────────────────────────────────────────── */

export class TradingScene extends Phaser.Scene {
    private engine!: StockEngine;
    private rogue!: RoguelikeManager;
    private chart!: PixelCandleChart;
    private hand!: CardHandContainer;

    // HUD
    private equityText!: Phaser.GameObjects.Text;
    private cashText!: Phaser.GameObjects.Text;
    private turnText!: Phaser.GameObjects.Text;
    private ipText!: Phaser.GameObjects.Text;
    private posText!: Phaser.GameObjects.Text;
    private deckText!: Phaser.GameObjects.Text;
    private totalLabel!: Phaser.GameObjects.Text;
    private activeLabel!: Phaser.GameObjects.Text;

    private logView!: GameLog;
    /**
     * 쌓인 로그. **컨테이너가 아니라 씬이 들고 있다** — 화면을 돌리면 그린 것이 통째로
     * 부서지므로, 뷰가 들고 있으면 판이 도는 중에 지나온 기록이 날아간다.
     */
    private logs: LogEntry[] = [];

    private relicRow!: Phaser.GameObjects.Container;
    private buyHalfBtn!: Btn;
    private allInBtn!: Btn;
    private sellBtn!: Btn;
    private nextBtn!: Btn;

    /** 턴을 넘기는 동안 두 번 눌리지 않게. */
    private busy = false;
    /** 결산에서 바로 이어 굴리는 길. 첫 화면을 건너뛴다. */
    private skipIntro = false;
    /** 판을 열 때 넘어온 덱에서 일어난 합성. 첫 턴의 뉴스 줄이 이걸 말한다. */
    private openingMerges: string[] = [];
    /** 판을 넘어 남는 것. 재시작할 때 이 값만 들고 간다. */
    private carriedIP = 0;

    /** 이 기기에서의 설계 격자. 모듈 상수가 아니라 **자기 크기**를 보고 자리를 잡는다. */
    private designW = 0;
    private designH = 0;
    private band!: Bands;

    /**
     * 지금 떠 있는 오버레이의 **내용**. 그린 것이 아니라 그릴 재료다.
     *
     * 화면을 돌리면 그리던 것을 전부 부수고 다시 세우는데, 그때 보상 후보를 다시 뽑거나
     * 성적을 다시 저장하면 안 된다. 그래서 재료만 들고 있다가 같은 것으로 다시 그린다.
     */
    private offer: StrategyCard[] | null = null;
    /** 카드 보상 바로 뒤에 뜨는 유물 고르기. 고를 때까지 다음 턴이 안 열린다. */
    private relicOffer: Relic[] | null = null;
    /**
     * 판을 열기 전 첫 화면. **이어하기인지 새 게임인지**를 여기서 가른다.
     *
     * 자금과 덱이 판을 넘어 이어지게 되면서, 캔버스를 열자마자 1턴이 시작되면 지금 굴리는
     * 것이 지난 판의 이어짐인지 처음부터인지 알 길이 없어졌다. 시작 자금이 1,000만이
     * 아닌 것을 보고 나서야 눈치채는 것은 화면이 말해 준 것이 아니다.
     */
    private intro: { saved: Progress; confirmReset: boolean } | null = null;
    private ended: {
        sum: RunSummary; progress: Progress; newBest: boolean;
        /** 이번 판으로 새로 열린 카드·유물. 다시 켤 이유를 그 자리에서 보여 준다. */
        unlocked: { id: string; kind: "card" | "relic"; at: number }[];
    } | null = null;
    /** 지금 화면에 떠 있는 오버레이. 다시 그릴 때 이것부터 걷어 낸다. */
    private overlay: Phaser.GameObjects.Container | null = null;

    /**
     * 이번 턴에 **읽어 낸 것**. 카드를 고르는 순간 채워지고 턴이 넘어가면 지워진다.
     *
     * 뉴스 줄이 아니라 차트에 그리는 이유: 뉴스 줄은 매매 한 번에 덮인다. 예보는
     * "얼마나 걸지" 를 정하는 내내 눈앞에 있어야 하는 정보다.
     */
    private marketRead: MarketRead | null = null;

    constructor() { super("trading"); }

    init(data: { insightPoints?: number; skipIntro?: boolean }) {
        // 이어서 굴리는 판(restart)은 넘겨받은 값을, 새로 켠 판은 저장된 진행을 쓴다.
        // config 가 값을 준 경우(임베드·테스트)는 그것이 이긴다.
        this.carriedIP =
            data?.insightPoints
            ?? (this.game.registry.get("insightPoints") as number | undefined)
            ?? loadProgress().insightPoints;
        // 결산에서 바로 이어 굴릴 때는 첫 화면을 다시 안 띄운다 — 방금 그 자리에서
        // 무엇을 들고 가는지 읽고 누른 참이다.
        this.skipIntro = data?.skipIntro === true;
        this.busy = false;
        this.offer = null;
        this.relicOffer = null;
        this.intro = null;
        this.marketRead = null;
        this.ended = null;
        this.overlay = null;
    }

    create() {
        this.cameras.main.setBackgroundColor(C.bg);
        this.measure();

        const seed = (Math.random() * 0xffffffff) >>> 0;
        const saved = loadProgress();
        // 자금도 덱도 지난 판에서 그대로 넘어온다 — 판은 끝이 아니라 장이 넘어가는 자리다.
        this.engine = new StockEngine(seed, saved.tier, saved.bankroll);
        this.engine.player.insightPoints = this.carriedIP;
        this.rogue = new RoguelikeManager(seed, saved.deck, unlockedIds(saved.careerIP));
        this.rogue.grantStartingRelics(this.carriedIP);

        // 넘어온 덱에 이미 셋이 모여 있었으면 판을 여는 자리에서 합쳐진다. 무엇이
        // 무엇이 되었는지는 첫 턴의 뉴스 줄에서 말해 준다.
        this.openingMerges = this.rogue.takeMerges()
            .map(m => m.to ? `${m.from} ×3 → ${m.to}` : `${m.from} ×3 소멸`);

        this.buildAll();

        // 화면을 돌리면 React 껍데기가 새 격자로 scale.resize 를 부른다. 그 순간 판을
        // 버리면 안 되므로, 엔진은 그대로 두고 그림만 다시 세운다.
        this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
        });

        // 로그는 판을 넘어 이어진다. 어디서 새 판이 열렸는지가 안 보이면 지난 판의 줄과
        // 섞여 읽힌다.
        this.log(saved.runs > 0
            ? `▶ ${saved.runs + 1}판째 — ${money(saved.bankroll)} · 덱 ${this.rogue.deckState.total}장 · 차수 ${saved.tier}`
            : `▶ 새 게임 — ${money(saved.bankroll)}`, "system", true);

        // 이어하기인지 새 게임인지를 먼저 말한다. 결산에서 바로 이어 굴릴 때는 건너뛴다.
        if (this.skipIntro) this.beginTurn();
        else { this.intro = { saved, confirmReset: false }; this.drawIntro(); }
    }

    /** 지금 격자를 재고 띠를 나눈다. 켤 때 한 번, 돌릴 때마다 한 번. */
    private measure() {
        this.designW = this.scale.width;
        this.designH = this.scale.height;
        this.band = bandsOf(this.designW, this.designH);
    }

    private buildAll() {
        this.drawDotGrid();
        this.buildLog();
        this.buildChart();
        this.buildFirm();
        this.buildActions();
    }

    /**
     * 화면이 돌아갔다. **판은 그대로 두고 그림만 다시 세운다.**
     *
     * 엔진과 매니저는 안 건드리므로 턴 수도, 보유도, 덱도 그대로다. 손패는 고른 카드까지
     * 되살린다 — 골라 둔 것이 화면에서 풀리면 한 장 더 고를 수 있는 것처럼 보인다.
     */
    private relayout() {
        if (!this.engine) return;           // create 중에 먼저 불릴 수 있다
        this.measure();

        this.children.removeAll(true);
        this.overlay = null;
        this.buildAll();

        this.renderRelics();
        // 첫 화면이 떠 있는 동안은 아직 한 턴도 안 깔았다. 손패를 세우면 빈 손패의
        // 안내("이번 턴은 카드 없이")가 뒤에 찍혀 없는 사실을 말한다.
        if (!this.intro) {
            this.hand.setHand(this.rogue.hand, this.idleCheck);
            const picked = this.rogue.pickedCard;
            if (picked) this.hand.lock(picked.uid);
        }
        this.refresh();

        // 떠 있던 오버레이는 같은 재료로 다시 그린다 — 후보를 다시 뽑지 않는다.
        if (this.intro) this.drawIntro();
        else if (this.ended) this.drawResult();
        else if (this.relicOffer) this.drawRelicOffer();
        else if (this.offer) this.drawReward();
    }

    /** 화면 전체에 깔리는 도트. 이게 있어야 어두운 바탕이 "꺼진 화면" 이 아니라 기기가 된다. */
    private drawDotGrid() {
        const g = this.add.graphics();
        g.fillStyle(C.line, 0.22);
        for (let y = 6; y < this.designH; y += 14) {
            for (let x = 6; x < this.designW; x += 14) g.fillRect(x, y, 1, 1);
        }
    }

    /* ── ① 로그 ───────────────────────────────────────────── */

    private buildLog() {
        const b = this.band.log;
        this.logView = new GameLog(this, { x: b.x, y: b.y, width: b.w, height: b.h });
        // 화면을 돌려도 쌓인 것은 그대로다 — 목록은 씬이 들고 있고 이 칸은 그리기만 한다.
        this.logView.setEntries(this.logs);
    }

    /* ── ② 차트 ───────────────────────────────────────────── */

    private buildChart() {
        const b = this.band.chart;
        this.chart = new PixelCandleChart(this, {
            x: b.x + PAD, y: b.y + PAD, width: b.w - PAD * 2, height: b.h - PAD * 2,
        });

        // 종목 이름은 차트 위에 겹쳐 둔다 — 칸을 따로 만들면 차트가 그만큼 준다.
        this.add.text(b.x + b.w - PAD - 6, b.y + b.h - PAD - FS.xs - 4,
            `${this.engine.stock.name} ${this.engine.stock.ticker}`, {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        }).setOrigin(1, 0);
    }

    /* ── ③ 운용 상황 — 나는 지금 어떤 상태인가 ─────────────── */

    /**
     * 자산·현금·보유·덱·유물, 그리고 손패를 한 칸에 모은다.
     *
     * 예전에는 자산이 맨 위(HUD), 유물과 손패가 아래에 따로 있었다. 그러면 "지금 내가
     * 무엇을 들고 있나" 를 보려고 눈이 화면을 두 번 오간다. 로그가 맨 위로 올라온 김에
     * **나에 대한 것을 한자리에** 모았다 — 로그(무슨 일이) → 차트(시장은) → 여기(나는)
     * → 버튼(무엇을 할까) 순으로 읽힌다.
     */
    private buildFirm() {
        const b = this.band.firm;
        const L = b.x + PAD, R = b.x + b.w - PAD;

        const g = this.add.graphics();
        g.lineStyle(1, C.line, 1);
        g.beginPath(); g.moveTo(b.x, b.y + 0.5); g.lineTo(b.x + b.w, b.y + 0.5); g.strokePath();

        const mk = (x: number, y: number, size: number, color: string, origin = 0) =>
            this.add.text(x, y, "", { fontFamily: fontOf(this), fontSize: `${size}px`, color })
                .setOrigin(origin, 0);

        this.totalLabel = this.add.text(L, b.y + 6, "TOTAL", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });
        this.equityText = mk(L, b.y + 18, FS.xl, S.ink);
        this.posText = mk(L, b.y + 52, FS.sm, S.inkDim);

        // 오른쪽 넉 줄은 서로 1~2px 차이로 붙어 있다. 글자 크기를 올리면 아래 줄부터
        // 밀리므로 여기 숫자는 FS 를 바꿀 때 같이 본다.
        this.turnText = mk(R, b.y + 5, FS.sm, S.neon, 1);
        this.ipText = mk(R, b.y + 24, FS.sm, S.gold, 1);
        this.cashText = mk(R, b.y + 43, FS.xs, S.inkDim, 1);
        // 덱이 지금 몇 장이고 그중 저주가 몇인가. 보상을 받을지 말지가 이 줄에서 갈린다 —
        // 센 카드를 계속 집으면 덱이 두꺼워져 정작 그 카드가 안 잡힌다.
        this.deckText = mk(R, b.y + 59, FS.xs, S.inkDim, 1);

        this.relicRow = this.add.container(L, b.y + 70);

        // 지금 무엇이 켜져 있고 **언제까지 가는지**. 카드가 한 턴짜리라는 것도, 예보가
        // 몇 턴 남았는지도 화면 어디에도 없었다.
        this.activeLabel = this.add.text(L, b.y + 100, "", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });

        const handTop = b.y + 116;
        this.hand = new CardHandContainer(this, {
            x: L, y: handTop, width: b.w - PAD * 2,
            height: Math.max(56, b.y + b.h - 6 - handTop),
            onPick: uid => this.onPickCard(uid),
        });
    }

    /** 유물 뱃지 — 작은 사각형에 첫 글자. 이름 전체를 쓰면 다섯 개가 안 들어간다. */
    private renderRelics() {
        this.relicRow.removeAll(true);
        const size = 26, gap = 6;

        if (this.rogue.relics.length === 0) {
            this.relicRow.add(this.add.text(0, 6, "없음", {
                fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
            }));
            return;
        }

        this.rogue.relics.forEach((relic: Relic, i: number) => {
            const x = i * (size + gap);
            const g = this.add.graphics();
            g.fillStyle(C.panelHi, 1).fillRect(x, 0, size, size);
            g.lineStyle(1, C.gold, 1).strokeRect(x + 0.5, 0.5, size - 1, size - 1);

            const ch = this.add.text(x + size / 2, size / 2, relic.name.slice(0, 1), {
                fontFamily: fontOf(this), fontSize: `${FS.md}px`, color: S.gold,
            }).setOrigin(0.5);

            // 폰에는 hover 가 없다 — 누르면 설명이 뉴스 줄에 뜬다.
            const zone = this.add.zone(x, 0, size, size).setOrigin(0, 0)
                .setInteractive({ useHandCursor: true });
            zone.on("pointerup", () => this.log(`유물 ${relic.name} — ${relic.description}`, "relic"));

            this.relicRow.add([g, ch, zone]);
        });
    }

    /* ── ④ 엄지 영역 ──────────────────────────────────────── */

    private buildActions() {
        const b = this.band.action;
        const gap = 8;
        const w = b.w - PAD * 2;
        const L = b.x + PAD;

        if (this.band.portrait) {
            // 세로 — 매매 셋을 한 줄에, NEXT 를 그 아래 넓게. 엄지가 아래에서 올라온다.
            //
            // 높이를 62·72 로 못박으면 세로가 짧은 폰에서 띠(최소 148) 밖으로 밀려 나간다.
            // 아래 24px 은 홈 인디케이터 자리로 비워 둔다.
            const avail = b.h - 10 - 12 - 24;
            const rowH = Math.round(Math.min(66, Math.max(50, avail * 0.45)));
            const nextH = Math.max(52, avail - rowH);
            const third = Math.floor((w - gap * 2) / 3);
            const rowY = b.y + 10;

            this.buyHalfBtn = makeButton(this, L, rowY, third, rowH,
                "50%\nBUY", () => this.doTrade("half"), { tone: "buy", size: FS.md });
            this.allInBtn = makeButton(this, L + third + gap, rowY, third, rowH,
                "ALL-IN", () => this.doTrade("all"), { tone: "buy", size: FS.md });
            this.sellBtn = makeButton(this, L + (third + gap) * 2, rowY, third, rowH,
                "ALL\nSELL", () => this.doTrade("sell"), { tone: "sell", size: FS.md });

            this.nextBtn = makeButton(this, L, rowY + rowH + 12, w, nextH,
                "NEXT TURN >", () => this.endTurn(), { tone: "go", size: FS.lg });
            return;
        }

        // 가로 — 넷을 한 줄로. 눕힌 폰은 폭이 남고 세로가 모자란 자리라, 쌓으면 어느
        // 버튼도 손가락이 닿을 높이가 안 나온다. 라벨도 좁은 칸에 맞춰 줄인다.
        const quarter = Math.floor((w - gap * 3) / 4);
        const y = b.y + 8;
        const h = Math.max(48, b.h - 16);

        // 넷으로 쪼갠 칸은 60px 남짓이라 md(16px) 로는 "ALL-IN" 이 테두리를 넘는다.
        const size = FS.sm;

        this.buyHalfBtn = makeButton(this, L, y, quarter, h,
            "50%\nBUY", () => this.doTrade("half"), { tone: "buy", size });
        this.allInBtn = makeButton(this, L + quarter + gap, y, quarter, h,
            "ALL-IN", () => this.doTrade("all"), { tone: "buy", size });
        this.sellBtn = makeButton(this, L + (quarter + gap) * 2, y, quarter, h,
            "ALL\nSELL", () => this.doTrade("sell"), { tone: "sell", size });
        this.nextBtn = makeButton(this, L + (quarter + gap) * 3, y, quarter, h,
            "NEXT >", () => this.endTurn(), { tone: "go", size });
    }

    /* ── 턴 ─────────────────────────────────────────────── */

    private beginTurn() {
        // 순서가 중요하다: 손패를 **먼저** 깔고 유물을 터뜨린다. 파쇄기는 손에 잡힌 저주를
        // 보고 태우는 유물이라, 반대로 하면 태울 것이 아직 없다.
        this.rogue.dealHand();
        const fired = this.rogue.onTurnStart(this.engine.player);
        this.hand.setHand(this.rogue.hand, this.idleCheck);
        this.renderRelics();
        this.busy = false;

        // 유물만으로도 보이는 것이 있다(낡은 나침반·증권가 핫라인). 카드를 고르기 전에
        // 이미 읽혀 있어야 그 카드를 쓸지 말지를 정할 수 있다.
        // 지난 턴에 정밀 예보로 봐 둔 것이 남아 있으면 buildBuff 가 그 턴 수를 얹어 준다.
        this.marketRead = this.engine.read(this.rogue.buildBuff());
        this.refresh();
        // 판을 열 때 넘어온 덱에서 합쳐진 것이 있으면 그것부터 말한다 — 덱 장수가 왜
        // 줄었는지 모른 채 첫 턴을 맞으면 카드가 사라진 것처럼 보인다.
        const opening = this.openingMerges;
        this.openingMerges = [];

        // 턴의 마디를 먼저 찍는다 — 로그가 쌓이면 이 줄이 눈금이 된다.
        this.log(`— ${this.engine.player.currentTurn}턴 · ${this.engine.stock.name} ${this.engine.stock.currentPrice.toLocaleString()}원`,
            "turn", true);
        for (const m of opening) this.log(m, "system");
        for (const f of fired) this.log(f, "relic");
    }

    /**
     * 지금 이 계좌에서 아무 일도 못 하는 카드인가. 손패가 흐리게 칠할 근거다.
     * 화살표 함수라 setHand 에 그대로 넘길 수 있다.
     */
    private idleCheck = (card: StrategyCard): boolean => this.rogue.isIdle(card.id, {
        shares: this.engine.player.shares,
        cash: this.engine.player.cash,
        price: this.engine.stock.currentPrice,
    });

    /** @param uid 그 **장**의 번호. 덱에 같은 카드가 여러 장이라 id 로는 못 짚는다. */
    private onPickCard(uid: string) {
        if (this.busy) return;
        const card = this.rogue.hand.find(c => c.uid === uid);
        if (!this.rogue.playCard(uid) || !card) return;

        // 정보 카드는 **고른 즉시** 값어치가 나와야 한다. 턴을 넘겨야 보이면 그건 정보가
        // 아니라 도박이다.
        //
        // 여기서 다시 읽는 것이 중요하다. 고른 카드가 정보 카드가 아니어도(헤지·벙커)
        // 이번 턴의 등락이 달라지므로, 이미 떠 있던 예보를 **그 카드가 반영된 값으로**
        // 다시 그려야 한다. 안 그러면 −8% 라 적힌 봉을 보고 겁먹었는데 −4% 가 온다.
        const buff = this.rogue.buildBuff();
        this.rogue.rememberPeek(buff.peekTurns);
        this.marketRead = this.engine.read(buff);

        // 효과만 되뇌면 "그래서 지금 이걸 왜 골랐나" 가 안 남는다. 지금 소용이 없는
        // 카드면 그 사실을, 아니면 언제 쓰는 카드인지를 말해 준다.
        if (this.idleCheck(card)) {
            this.log(`카드 ${card.name} — 지금은 아무 일도 안 합니다`, "warn");
        } else {
            this.log(`카드 ${card.name} — ${card.shortDescription}`,
                card.kind === "curse" ? "warn" : "card");
        }

        // 읽은 것을 그 자리에서 그린다. 이게 없으면 예보도 국면도 "켜짐" 줄도 다음 턴이
        // 되어서야 나타난다 — 정보 카드를 고른 보람이 한 턴 늦게 온다.
        this.refresh();
    }

    /**
     * 사고판다. **한 번의 매매가 여러 줄로 남는다** — 체결, 현금이 얼마에서 얼마가
     * 되었는지, 수수료를 얼마 냈는지, 판 것이면 실현 손익까지.
     *
     * 한 줄로 뭉치면 "얼마 벌었나" 를 매번 머리로 빼야 한다. 갈라 두면 로그를 훑는 것만
     * 으로 이번 판에서 수수료로 얼마가 나갔는지가 보인다.
     */
    private doTrade(kind: "half" | "all" | "sell") {
        if (this.busy) return;
        const buff = this.rogue.buildBuff();
        const p = this.engine.player;
        // 체결이 상태를 바꾸기 전에 찍어 둔다. 뒤에서는 이 값을 다시 못 만든다.
        const before = { cash: p.cash, avg: p.avgPrice };

        let res: TradeResult;
        if (kind === "half") res = this.engine.buyHalf(buff);
        else if (kind === "all") res = this.engine.buyAll(buff);
        else res = this.engine.sellAll(buff);

        if (!res.ok) { this.log(res.error, "warn"); return; }

        const won = (v: number) => `${Math.round(v).toLocaleString()}원`;
        const lines: [string, LogKind][] = [
            [`${res.side === "buy" ? "매수" : "매도"} ${res.qty.toLocaleString()}주 @ ${res.price.toLocaleString()}원`,
                res.side === "buy" ? "buy" : "sell"],
        ];

        // 판 것이면 이번 거래로 실제로 번 돈. 수수료를 뺀 뒤의 값이라 손에 남는 것과 같다.
        if (res.side === "sell") {
            const realized = (res.price - before.avg) * res.qty - res.fee;
            lines.push([`실현 손익 ${realized >= 0 ? "+" : "−"}${won(Math.abs(realized))}`,
                realized >= 0 ? "up" : "down"]);
        }

        lines.push([`현금 ${money(before.cash)} → ${money(p.cash)}`, "cash"]);
        lines.push([res.fee === 0
            ? "수수료·거래세 면제 — 0원"
            : `수수료·거래세 −${won(res.fee)}`, "fee"]);

        this.logAll(lines);
        this.refresh();
    }

    /** 다음 턴으로. 여기서 주가가 움직인다. */
    private endTurn() {
        if (this.busy) return;
        this.busy = true;

        // advanceTurn 뒤에는 이미 다음 턴 번호다. 보상은 **끝낸** 턴을 보고 뜬다.
        const finished = this.engine.player.currentTurn;
        const buff = this.rogue.buildBuff();
        const tickRes = this.engine.tick(buff);
        const endFired = this.rogue.onTurnEnd(this.engine.player, tickRes.changePct);

        // 주가가 움직인 것은 **끝낸 턴의 일**이다. advanceTurn 뒤에 적으면 로그의 턴
        // 번호가 하나씩 밀려, 다음 턴이 열리기도 전에 그 턴의 등락이 있었던 것처럼 읽힌다.
        const moved: [string, LogKind][] = [[
            `시장 ${pct(tickRes.changePct)} → ${this.engine.stock.currentPrice.toLocaleString()}원`,
            tickRes.changePct >= 0 ? "up" : "down",
        ]];
        if (tickRes.news) moved.push([`뉴스 ${tickRes.news}`, tickRes.changePct >= 0 ? "up" : "down"]);
        if (this.engine.stoppedOut) moved.push(["손절 예약 발동 — 전량 매도", "warn"]);
        for (const f of endFired) moved.push([f, "relic"]);
        this.logAll(moved);

        this.engine.advanceTurn();
        this.rogue.consumePeek();
        // **읽은 것을 먼저 지우고 나서 그린다.** 순서가 반대면 방금 결판난 턴의 유령 봉이
        // 새 봉 옆에 한 번 더 그려져, 이미 온 등락을 아직 올 것처럼 가리킨다.
        this.marketRead = null;
        this.refresh();

        // 봉이 하나 자라는 것을 눈이 따라갈 시간을 준다. 바로 넘기면 무엇이 변했는지 모른다.
        this.time.delayedCall(420, () => {
            if (this.engine.isOver) this.finish();
            // 3턴마다 한 번, 카드와 유물을 **이어서** 고른다. 예전에는 카드가 3·6·9턴,
            // 유물이 4·8턴이라 무언가 뜨는 턴이 다섯이었고 언제 무엇이 오는지 셀 수 없었다.
            else if (this.rogue.isRewardTurn(finished)) this.showReward();
            else this.beginTurn();
        });
    }

    /** "지금 켜짐" 한 줄. 무엇이 켜져 있고 언제까지 가는지. */
    private refreshActive() {
        const picked = this.rogue.pickedCard;
        const peekLeft = this.marketRead?.next.length ?? 0;

        const bits: string[] = [];
        if (picked) bits.push(`${picked.name} · 이번 턴까지`);
        if (peekLeft > 0) bits.push(`예보 ${peekLeft}턴치`);

        this.activeLabel
            .setText(bits.length > 0 ? `켜짐 — ${bits.join(" · ")}` : "STRATEGY — 한 턴에 한 장")
            .setColor(bits.length > 0 ? S.gold : S.inkDim);
    }

    /* ── 오버레이 공통 ────────────────────────────────────── */

    /**
     * 어두운 막 + 가운데 칸. 가로에서는 격자가 1400px 까지 넓어지므로 칸의 폭을 가둔다 —
     * 안 그러면 글 한 줄이 화면을 가로질러 읽는 눈이 되돌아올 자리를 잃는다.
     */
    private openOverlay(pw: number, ph: number, edge: number) {
        const box = this.add.container(0, 0);
        const px = Math.round((this.designW - pw) / 2);
        const py = Math.round((this.designH - ph) / 2);

        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.82).fillRect(0, 0, this.designW, this.designH);
        g.fillStyle(C.panel, 1).fillRect(px, py, pw, ph);
        g.lineStyle(2, edge, 1).strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        box.add(g);
        // 오버레이 뒤를 못 누르게. busy 가 아직 true 라 눌려도 아무 일이 없지만, 눌린
        // 것처럼 보이는 것만으로도 화면이 거짓말을 한다.
        box.add(this.add.zone(0, 0, this.designW, this.designH).setOrigin(0, 0).setInteractive());

        this.overlay = box;
        return { box, px, py };
    }

    private closeOverlay() {
        this.overlay?.destroy(true);
        this.overlay = null;
    }

    /* ── 첫 화면 — 이어하기인가 새 게임인가 ───────────────── */

    /**
     * 판을 열기 전에 **무엇을 들고 시작하는지** 말한다.
     *
     * 자금과 덱이 판을 넘어 이어지게 되면서 이 화면이 필요해졌다. 캔버스가 열리자마자
     * 1턴이 뜨면 지금 굴리는 것이 지난 판의 이어짐인지 처음부터인지 알 수 없고, HUD 의
     * 시작 자금이 1,000만이 아닌 것을 보고 눈치채는 것은 화면이 말해 준 것이 아니다.
     */
    private drawIntro() {
        const it = this.intro;
        if (!it) return;
        const { saved } = it;
        // 판을 한 번이라도 굴렸고 처음 상태가 아니면 이어하기다.
        const resuming = saved.runs > 0;

        const tight = this.designH < TALL_ENOUGH;
        const pw = Math.min(this.designW - 40, tight ? 460 : 350);
        const btnH = tight ? 44 : 54;
        const ph = (tight ? 150 : 190) + btnH + (resuming ? 44 : 0);

        const { box, px, py } = this.openOverlay(pw, ph, resuming ? C.gold : C.neon);
        const mid = px + pw / 2;

        const t = (y: number, s: string, size: number, color: string) =>
            box.add(this.add.text(mid, y, s, {
                fontFamily: fontOf(this), fontSize: `${size}px`, color, align: "center",
                wordWrap: { width: pw - 30 },
            }).setOrigin(0.5, 0));

        // [머리, 제목, 자금, 덱, 아래줄] 의 y 오프셋
        const at = tight ? [12, 30, 62, 94, 118] : [18, 40, 82, 120, 148];

        t(py + at[0]!, resuming ? "CONTINUE" : "NEW GAME", FS.xs, resuming ? S.gold : S.neon);
        t(py + at[1]!, resuming ? "이어하기" : "새 게임", tight ? FS.lg : FS.xl, S.ink);
        t(py + at[2]!, money(saved.bankroll), tight ? FS.lg : FS.xl,
            resuming ? tone(saved.bankroll - SEED_CASH) : S.ink);
        t(py + at[3]!,
            resuming
                ? `덱 ${this.rogue.deckState.total}장 · 차수 ${saved.tier}/${MAX_TIER}`
                : `카드 무작위 ${OPENING_DECK_SIZE}장으로 시작합니다`,
            FS.sm, S.inkDim);
        t(py + at[4]!,
            resuming
                ? `${saved.runs}판째 · 경력 ${saved.careerIP} · 자본잠식 ${saved.ruins}회`
                : `${MAX_TURNS}턴 · 자금이 ${money(RUIN_LINE)} 아래로 가면 끝`,
            FS.xs, S.inkDim);

        const go = makeButton(this, px + 20, py + ph - btnH - (resuming ? 58 : 16), pw - 40, btnH,
            resuming ? "이어하기 >" : "시작 >", () => {
                this.intro = null;
                this.closeOverlay();
                this.beginTurn();
            }, { tone: "go", size: FS.lg });
        box.add(go.root);

        if (!resuming) return;

        // 처음부터 다시는 쌓아 둔 것을 전부 지운다 — 경력까지. 한 번 더 눌러야 실제로
        // 지워진다. 오버레이를 하나 더 띄우는 대신 버튼 자신이 되묻는다.
        const reset = makeButton(this, px + 20, py + ph - 48, pw - 40, 36,
            it.confirmReset ? "정말 지웁니다 — 한 번 더" : "처음부터 다시",
            () => {
                if (!it.confirmReset) {
                    it.confirmReset = true;
                    this.closeOverlay();
                    this.drawIntro();
                    return;
                }
                resetProgress();
                this.intro = null;
                this.closeOverlay();
                this.scene.restart({ insightPoints: 0, skipIntro: true });
            },
            { tone: it.confirmReset ? "sell" : "plain", size: FS.sm });
        box.add(reset.root);
    }

    /* ── 유물 고르기 (카드 보상 바로 다음) ─────────────────── */

    /**
     * 유물은 판이 끝날 때까지 남는 **패시브**다. 카드가 한 턴짜리라면 유물은 판 전체의
     * 기울기를 바꾼다 — 그 차이가 안 보이면 유물이 왜 있는지 알 수 없다.
     *
     * 그래서 셋을 내밀어 읽고 고르게 한다. 고른 순간 무엇을 들고 가는지 알게 되고,
     * 남은 턴 내내 그 선택이 따라온다.
     *
     * 카드를 고르고 **바로 이어서** 뜬다. 카드 보상은 남은 판에 쓸 손을 정하고 유물은
     * 판 전체의 기울기를 정하니, 같은 자리에서 둘을 나란히 보는 편이 읽힌다.
     */
    private showRelicOffer() {
        const offer = this.rogue.offerRelics();
        if (offer.length === 0) { this.beginTurn(); return; }   // 다 모았다
        this.relicOffer = offer;
        this.drawRelicOffer();
    }

    private drawRelicOffer() {
        const offer = this.relicOffer;
        if (!offer) return;

        const stacked = this.designH < TALL_ENOUGH;
        const n = offer.length;
        const gap = 8;
        const pw = Math.min(this.designW - 40, stacked ? 660 : 350);
        const cellH = stacked ? 96 : 72;
        const rows = stacked ? 1 : n;
        const ph = 58 + rows * cellH + (rows - 1) * gap + 20;

        const { box, px, py } = this.openOverlay(pw, ph, C.gold);
        const mid = px + pw / 2;

        box.add(this.add.text(mid, py + 16, "RELIC — 판이 끝날 때까지", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold,
        }).setOrigin(0.5, 0));
        box.add(this.add.text(mid, py + 32, "하나를 고르세요", {
            fontFamily: fontOf(this), fontSize: `${FS.sm}px`, color: S.ink,
        }).setOrigin(0.5, 0));

        const inner = pw - 32;
        const cellW = stacked ? Math.floor((inner - gap * (n - 1)) / n) : inner;

        offer.forEach((relic, i) => {
            const x = px + 16 + (stacked ? i * (cellW + gap) : 0);
            const y = py + 58 + (stacked ? 0 : i * (cellH + gap));
            box.add(this.makeInfoCell(x, y, cellW, cellH, relic.name, relic.description, C.gold, () => {
                this.rogue.takeRelic(relic.id);
                this.relicOffer = null;
                this.closeOverlay();
                this.beginTurn();
                this.log(`유물 획득 ${relic.name} — ${relic.description}`, "relic");
            }));
        });
    }

    /** 이름 한 줄 + 설명 한 덩이짜리 고르기 칸. 유물처럼 저주가 없는 것에 쓴다. */
    private makeInfoCell(
        x: number, y: number, w: number, h: number,
        title: string, body: string, edge: number, onPick: () => void,
    ): Phaser.GameObjects.Container {
        const root = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(C.panelHi, 1).fillRect(0, 0, w, h);
        g.lineStyle(1, edge, 1).strokeRect(0.5, 0.5, w - 1, h - 1);

        const name = this.add.text(10, 9, title, {
            fontFamily: fontOf(this), fontSize: `${FS.md}px`, color: S.gold,
        });
        const desc = this.add.text(10, name.y + name.height + 4, body, {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
            wordWrap: { width: w - 20 }, lineSpacing: 2,
        });
        const zone = this.add.zone(0, 0, w, h).setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });
        zone.on("pointerup", onPick);

        root.add([g, name, desc, zone]);
        return root;
    }

    /* ── 카드 보상 (3·6·9턴을 끝냈을 때) ──────────────────── */

    /**
     * 덱에 넣을 카드를 고르는 자리. **건너뛸 수 있다** — 그게 이 화면의 요점이다.
     *
     * 센 카드는 덱을 두껍게 만들고(원하는 카드가 덜 잡힌다) 어떤 것은 저주까지 끌고 온다.
     * 그래서 "안 고르는 것" 이 늘 손해가 아니고, 그 판단이 로그라이크의 몸통이다.
     */
    private showReward() {
        const offer = this.rogue.offerCards();
        // 보상 풀이 마르는 일은 없지만, 비면 유물 자리로 바로 넘긴다.
        if (offer.length === 0) { this.showRelicOffer(); return; }
        this.offer = offer;
        this.drawReward();
    }

    /**
     * 보상 칸을 그린다. 후보는 이미 뽑혀 있다(`this.offer`) — 돌려도 다시 안 뽑는다.
     *
     * 세로로 늘어놓을 높이가 안 나오면 셋을 **가로로 편다**. 눕힌 폰은 세로 300px 남짓이라
     * 세로 배치(360px)가 통째로 안 들어간다.
     */
    private drawReward() {
        const offer = this.offer;
        if (!offer) return;

        const stacked = this.designH < TALL_ENOUGH;
        const n = offer.length;
        const gap = 8;

        const pw = Math.min(this.designW - 40, stacked ? 660 : 350);
        const cellH = stacked ? 96 : 72;
        const rows = stacked ? 1 : n;
        const ph = 58 + rows * cellH + (rows - 1) * gap + 62;

        const { box, px, py } = this.openOverlay(pw, ph, C.gold);
        const mid = px + pw / 2;

        box.add(this.add.text(mid, py + 16, "CARD REWARD — 이어서 유물", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold,
        }).setOrigin(0.5, 0));
        box.add(this.add.text(mid, py + 32, "한 장을 덱에 넣습니다", {
            fontFamily: fontOf(this), fontSize: `${FS.sm}px`, color: S.ink,
        }).setOrigin(0.5, 0));

        // 카드를 고르든 건너뛰든 **유물 고르기로 이어진다.** 3턴마다 한 번, 이 자리에서
        // 손(카드)과 기울기(유물)를 나란히 정한다.
        const close = (lines: [string, LogKind][]) => {
            this.offer = null;
            this.closeOverlay();
            this.logAll(lines);
            this.showRelicOffer();
        };

        const inner = pw - 32;
        const cellW = stacked ? Math.floor((inner - gap * (n - 1)) / n) : inner;

        offer.forEach((card, i) => {
            const x = px + 16 + (stacked ? i * (cellW + gap) : 0);
            const y = py + 58 + (stacked ? 0 : i * (cellH + gap));
            // 이 한 장이 셋째 장이면 **고르기 전에** 말해 준다. 그래야 "약한 카드를
            // 모아 강화한다" 가 선택이 된다.
            const merge = this.rogue.mergePreview(card.id);
            box.add(this.makeOfferCell(x, y, cellW, cellH, card, stacked, merge, () => {
                const curse = this.rogue.takeReward(card.id);
                // 셋째 장이 들어오면 그 자리에서 합쳐진다. 조용히 바뀌면 덱에서 카드가
                // 사라진 것처럼 보이므로 무엇이 무엇이 되었는지 말해 준다.
                const lines: [string, LogKind][] = [
                    [`카드 획득 ${card.name}`, "card"],
                ];
                if (curse) lines.push([`저주 ${curse} 도 함께 덱에`, "warn"]);
                for (const m of this.rogue.takeMerges()) {
                    lines.push([m.to ? `합성 ${m.from} ×3 → ${m.to}` : `합성 ${m.from} ×3 소멸`, "system"]);
                }
                close(lines);
            }));
        });

        const skip = makeButton(this, px + 16, py + ph - 62, inner, 46,
            "건너뛰기 — 덱을 얇게", () => close([["카드를 안 받았습니다 — 덱을 그대로", "turn"]]),
            { tone: "plain", size: FS.sm });
        box.add(skip.root);
    }

    /**
     * 보상 카드 한 칸. 딸린 저주와 **합성**을 고르기 전에 보여 준다.
     *
     * @param stacked 가로로 편 좁은 칸인가. 그러면 저주 표시가 이름 옆에 못 들어가서
     *                아래로 내려간다.
     * @param merge   이 한 장이 셋째 장이면 무엇이 되는가(`mergePreview`). 없으면 null.
     */
    private makeOfferCell(
        x: number, y: number, w: number, h: number,
        card: StrategyCard, stacked: boolean, merge: string | null, onTake: () => void,
    ): Phaser.GameObjects.Container {
        const root = this.add.container(x, y);
        const cursed = !!card.curseName;
        // 합성이 걸린 칸은 금색으로 — 셋째 장이라는 것이 색으로 먼저 온다.
        const edge = merge !== null ? C.gold : cursed ? C.danger : C.neon;

        const g = this.add.graphics();
        g.fillStyle(C.panelHi, 1).fillRect(0, 0, w, h);
        g.lineStyle(merge !== null ? 2 : 1, edge, 1).strokeRect(0.5, 0.5, w - 1, h - 1);

        const name = this.add.text(10, 9, card.name, {
            fontFamily: fontOf(this), fontSize: `${FS.md}px`, color: cursed ? S.danger : S.neon,
        });
        const desc = this.add.text(10, 32, card.effectDescription, {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
            wordWrap: { width: w - 20 }, lineSpacing: 2,
        });

        const zone = this.add.zone(0, 0, w, h).setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });
        zone.on("pointerup", onTake);

        root.add([g, name, desc, zone]);

        // 칸 바닥에서 위로 쌓는다. 좁은 칸에서 저주와 합성이 같은 줄에 앉으면 겹친다.
        let bottom = h - 10 - FS.xs;
        if (merge !== null) {
            root.add(this.add.text(10, bottom,
                merge === "" ? `모으면 ×3 → 사라짐` : `모으면 ×3 → ${merge}`,
                { fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold },
            ));
            bottom -= FS.xs + 3;
        }
        if (cursed) {
            // 저주는 좁은 칸(가로 배치)에서만 아래로 내려온다. 넓으면 이름 옆이 비어 있다.
            const wide = !stacked && merge === null;
            const tag = this.add.text(
                wide ? w - 10 : 10,
                wide ? 11 : bottom,
                `+저주 ${card.curseName}`,
                { fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.danger },
            ).setOrigin(wide ? 1 : 0, 0);
            root.add(tag);
        }
        return root;
    }

    /* ── 결산 ─────────────────────────────────────────────── */

    private finish() {
        this.engine.liquidate();
        // 판이 끝났으니 예보가 가리킬 다음 턴이 없다. 안 지우면 성적표 뒤의 차트가
        // 오지 않을 봉을 계속 그린다.
        this.marketRead = null;
        // 덱을 함께 넘긴다 — 이 목록이 그대로 다음 판의 시작 덱이 된다.
        const sum = this.engine.summarize(this.rogue.deck);
        // 여기서 한 번만 저장한다. summarize 가 이미 player.insightPoints 를 올려 뒀지만
        // 그건 이 판 안의 값이고, 판을 넘어 남는 것은 progress 가 들고 있다.
        const before = loadProgress().careerIP;
        const { progress, newBest } = recordRun(sum);
        this.ended = { sum, progress, newBest, unlocked: newlyUnlocked(before, progress.careerIP) };

        this.logMark([
            [sum.ruined ? "■ GAME OVER — 자본잠식" : "■ 판 종료", sum.ruined ? "warn" : "system"],
            [`${money(sum.startEquity)} → ${money(sum.finalEquity)} (${pct(sum.returnPct)})`,
                sum.returnPct >= 0 ? "up" : "down"],
            [sum.ruined ? "자금과 덱이 처음으로 돌아갑니다"
                : sum.idle ? "한 주도 사지 않았습니다 — 인사이트 없음"
                    : `인사이트 +${sum.earnedIP}`,
                sum.ruined || sum.idle ? "warn" : "fee"],
        ]);
        this.refresh();
        this.drawResult();
    }

    /** 성적표. 다시 그려도 저장은 안 한다 — 값은 `this.ended` 에 이미 있다. */
    private drawResult() {
        const r = this.ended;
        if (!r) return;
        const { sum, progress, newBest } = r;

        // 세로가 모자라면 줄 간격과 큰 숫자를 줄여 접는다. 눕힌 폰에서 348px 은 안 들어간다.
        const tight = this.designH < TALL_ENOUGH;
        const pw = Math.min(this.designW - 40, tight ? 460 : 350);
        const ph = tight ? 246 : 348;

        const { box, px, py } = this.openOverlay(pw, ph, sum.ruined ? C.danger : C.neon);
        const mid = px + pw / 2;

        const t = (y: number, s: string, size: number, color: string) =>
            box.add(this.add.text(mid, y, s, {
                fontFamily: fontOf(this), fontSize: `${size}px`, color, align: "center",
                wordWrap: { width: pw - 30 },
            }).setOrigin(0.5, 0));

        // [제목, 수익률, 자산, 인사이트, 누적, 최고, 유물] 의 y 오프셋
        const at = tight ? [12, 32, 74, 100, 122, 144, 164] : [20, 50, 108, 142, 172, 196, 220];

        const ruined = sum.ruined;
        t(py + at[0]!,
            ruined ? "GAME OVER — 자본잠식" : newBest ? "다음 판으로 — 새 기록" : "다음 판으로",
            tight ? FS.sm : FS.md, ruined ? S.danger : newBest ? S.neon : S.inkDim);
        t(py + at[1]!, pct(sum.returnPct), tight ? FS.xl : FS.xxl, tone(sum.returnPct));
        t(py + at[2]!, `${money(sum.startEquity)} → ${money(sum.finalEquity)}`, FS.sm, S.ink);
        // 자본잠식은 못 번 것이 아니라 **끝난 것**이다. 무엇이 사라졌는지 그 자리에서 말한다.
        t(py + at[3]!,
            ruined ? "자금과 덱이 처음으로 돌아갑니다"
                : sum.idle ? "한 주도 사지 않았습니다 — 인사이트 없음"
                    : `인사이트 +${sum.earnedIP}`,
            tight ? FS.sm : FS.md, ruined || sum.idle ? S.danger : S.gold);
        // 다음 판이 무엇을 들고 시작하는지. 자금과 덱이 이어지는 것이 이 게임의 뼈대다.
        const carryNote = ruined
            ? `다시 ${money(progress.bankroll)} · 카드 3장으로`
            : `다음 판 ${money(progress.bankroll)} · 덱 ${progress.deck.length}장`;
        t(py + at[4]!, carryNote, FS.sm, ruined ? S.danger : S.gold);
        t(py + at[5]! - 2, [
            `IP ${progress.insightPoints}`,
            `차수 ${progress.tier}/${MAX_TIER}`,
            progress.bestReturn !== null ? `최고 ${pct(progress.bestReturn)}` : "",
        ].filter(Boolean).join(" · "), FS.xs, newBest ? S.neon : S.inkDim);
        // 경력 인사이트는 청산돼도 안 깎이는 유일한 값이다. 못한 판 뒤에 이 줄이
        // 그래도 올라 있어야 다시 켤 마음이 생긴다.
        const unlockNote = r.unlocked.length > 0
            ? `새로 열림 — ${r.unlocked.map(u => nameOfUnlock(u.id)).join(" · ")}`
            : `경력 ${progress.careerIP} · ${nextUnlockNote(progress.careerIP)}`;
        t(py + at[6]!, unlockNote, FS.xs, r.unlocked.length > 0 ? S.gold : S.inkDim);

        const btnH = tight ? 44 : 54;
        const restart = makeButton(this, px + 20, py + ph - btnH - (tight ? 14 : 20), pw - 40, btnH,
            sum.ruined ? "다시 처음부터 >" : "NEXT RUN >", () => {
                this.closeOverlay();
                // 인사이트만 들고 다음 런으로. 유물도 카드도 새로 뽑힌다.
                // 첫 화면은 건너뛴다 — 무엇을 들고 가는지 이 성적표가 방금 말했다.
                this.scene.restart({ insightPoints: progress.insightPoints, skipIntro: true });
            }, { tone: "go", size: FS.lg });
        box.add(restart.root);
    }

    /* ── 그리기 ─────────────────────────────────────────── */

    private refresh() {
        const e = this.engine;
        const p = e.player;

        this.chart.render(e.stock.history, this.marketRead);
        this.refreshActive();

        this.equityText.setText(money(e.equity)).setColor(tone(e.totalReturnPct));

        // 자본잠식선이 눈에 보여야 그 선을 피할 수 있다. 가까워졌을 때만 띄운다 — 늘 떠
        // 있으면 읽히지 않는 배경이 된다.
        const near = e.equity < e.ruinLine * 1.5;
        this.totalLabel
            .setText(near ? `TOTAL · 잠식선 ${money(e.ruinLine)}`
                : e.tier > 0 ? `TOTAL · 차수 ${e.tier}` : "TOTAL")
            .setColor(near ? S.danger : e.tier > 0 ? S.gold : S.inkDim);
        this.cashText.setText(`현금 ${money(p.cash)}`);
        this.turnText.setText(`TURN ${Math.min(p.currentTurn, p.maxTurns)}/${p.maxTurns}`);
        this.ipText.setText(`IP ${p.insightPoints}`);

        // 남은 장 / 덱 전체. 저주가 섞이면 그 수를 붙이고 색을 바꾼다 — 덱이 더러워진 것을
        // 숫자 하나로 알아야 다음 보상에서 건너뛸 마음이 생긴다.
        const d = this.rogue.deckState;
        this.deckText
            .setText(d.curses > 0 ? `DECK ${d.draw}/${d.total} · 저주 ${d.curses}` : `DECK ${d.draw}/${d.total}`)
            .setColor(d.curses > 0 ? S.danger : S.inkDim);

        // 가로에서는 운용 상황이 오른쪽 칸만 쓴다(390 이 아니라 300 남짓). 긴 형태를 그대로
        // 쓰면 오른쪽 끝의 DECK 줄과 부딪히므로, 좁을 때는 평단을 접고 주수와 손익만 남긴다.
        const narrowHud = this.band.firm.w < 360;
        this.posText.setText(
            p.shares === 0 ? "보유 없음"
                : narrowHud
                    ? `${p.shares.toLocaleString()}주 · ${pct(e.unrealizedPct)}`
                    : `보유 ${p.shares.toLocaleString()}주 · 평단 ${Math.round(p.avgPrice).toLocaleString()} · ${pct(e.unrealizedPct)}`,
        ).setColor(p.shares > 0 ? tone(e.unrealizedPct) : S.inkDim);

        // 못 하는 것은 잠근다 — 눌러 보고 나서 안 된다고 듣는 것보다 낫다.
        const canBuy = p.cash >= e.stock.currentPrice && !this.busy;
        this.buyHalfBtn.setEnabled(canBuy);
        this.allInBtn.setEnabled(canBuy);
        this.sellBtn.setEnabled(p.shares > 0 && !this.busy);
        this.nextBtn.setEnabled(!this.busy);
    }

    /* ── 로그 ───────────────────────────────────────────── */

    /**
     * 로그에 한 줄. **덮이지 않고 쌓인다.**
     *
     * 예전의 한 줄짜리 뉴스는 다음 일이 일어나면 덮였다. 매수 결과와 수수료를 같은 줄에
     * 욱여넣어야 했고, 그마저도 다음 매매 한 번에 사라졌다. 지금은 각각이 제 줄로 남는다.
     */
    private log(text: string, kind: LogKind, bare = false) {
        this.logs.push({ turn: bare ? 0 : this.engine?.player.currentTurn ?? 0, kind, text });
        // 한 판에 백 줄을 넘길 일이 없지만, 판을 이어 굴리면 언젠가는 넘는다.
        if (this.logs.length > LOG_KEEP) this.logs.splice(0, this.logs.length - LOG_KEEP);
        this.logView?.setEntries(this.logs);
    }

    /** 여러 줄을 한꺼번에. 앞의 줄이 뒤에 밀려 사라지지 않게 순서대로 쌓는다. */
    private logAll(lines: [string, LogKind][]) {
        for (const [text, kind] of lines) this.log(text, kind);
    }

    /** 판이 열리고 닫히는 마디. 턴 번호를 안 붙이고, 줄 자체가 눈금이 된다. */
    private logMark(lines: [string, LogKind][]) {
        for (const [text, kind] of lines) this.log(text, kind, true);
    }
}
