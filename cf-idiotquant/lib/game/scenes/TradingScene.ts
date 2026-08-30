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
import { RoguelikeManager } from "@/lib/game/core/RoguelikeManager";
import type { MarketRead, Relic, RunSummary, StrategyCard, TradeResult } from "@/lib/game/core/types";
import { MAX_TIER } from "@/lib/game/core/StockEngine";
import {
    canUpgrade, loadProgress, nextUpgradeCost, purchaseUpgrade, recordRun, type Progress,
} from "@/lib/game/core/progress";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { CardHandContainer } from "@/lib/game/components/CardHandContainer";
import { PAD, C, S, FS, bandsOf, designSize, fontOf, money, pct, tone } from "@/lib/game/ui/theme";
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

/** 오버레이 안쪽 칸이 이보다 낮으면 세로로 늘어놓을 자리가 없다 — 눕혀서 편다. */
const TALL_ENOUGH = 420;

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
    private newsText!: Phaser.GameObjects.Text;
    private posText!: Phaser.GameObjects.Text;
    private deckText!: Phaser.GameObjects.Text;
    private totalLabel!: Phaser.GameObjects.Text;

    private relicRow!: Phaser.GameObjects.Container;
    private buyHalfBtn!: Btn;
    private allInBtn!: Btn;
    private sellBtn!: Btn;
    private nextBtn!: Btn;

    /** 턴을 넘기는 동안 두 번 눌리지 않게. */
    private busy = false;
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
    /** 판을 열기 전 강화 고르기. 고르거나 넘길 때까지 판이 안 시작된다. */
    private upgradeOffer: StrategyCard[] | null = null;
    /** 네 턴마다 뜨는 유물 고르기. 고를 때까지 다음 턴이 안 열린다. */
    private relicOffer: Relic[] | null = null;
    private ended: { sum: RunSummary; progress: Progress; newBest: boolean } | null = null;
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

    init(data: { insightPoints?: number }) {
        // 이어서 굴리는 판(restart)은 넘겨받은 값을, 새로 켠 판은 저장된 진행을 쓴다.
        // config 가 값을 준 경우(임베드·테스트)는 그것이 이긴다.
        this.carriedIP =
            data?.insightPoints
            ?? (this.game.registry.get("insightPoints") as number | undefined)
            ?? loadProgress().insightPoints;
        this.busy = false;
        this.offer = null;
        this.upgradeOffer = null;
        this.relicOffer = null;
        this.marketRead = null;
        this.ended = null;
        this.overlay = null;
    }

    create() {
        this.cameras.main.setBackgroundColor(C.bg);
        this.measure();

        const seed = (Math.random() * 0xffffffff) >>> 0;
        const saved = loadProgress();
        this.engine = new StockEngine(seed, saved.tier);
        this.engine.player.insightPoints = this.carriedIP;
        this.rogue = new RoguelikeManager(seed, saved.upgrades);
        this.rogue.grantStartingRelics(this.carriedIP);

        this.buildAll();

        // 화면을 돌리면 React 껍데기가 새 격자로 scale.resize 를 부른다. 그 순간 판을
        // 버리면 안 되므로, 엔진은 그대로 두고 그림만 다시 세운다.
        this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
        });

        // 인사이트가 모였으면 판을 열기 전에 시작 덱을 손볼 기회를 준다.
        if (canUpgrade(saved)) this.showUpgrade();
        else this.beginTurn();
    }

    /** 지금 격자를 재고 띠를 나눈다. 켤 때 한 번, 돌릴 때마다 한 번. */
    private measure() {
        this.designW = this.scale.width;
        this.designH = this.scale.height;
        this.band = bandsOf(this.designW, this.designH);
    }

    private buildAll() {
        this.drawDotGrid();
        this.buildHud();
        this.buildChart();
        this.buildCardArea();
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
        this.hand.setHand(this.rogue.hand, this.idleCheck);
        const picked = this.rogue.pickedCard;
        if (picked) this.hand.lock(picked.uid);
        this.refresh();

        // 떠 있던 오버레이는 같은 재료로 다시 그린다 — 후보를 다시 뽑지 않는다.
        if (this.ended) this.drawResult();
        else if (this.upgradeOffer) this.drawUpgrade();
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

    /* ── ① HUD ────────────────────────────────────────────── */

    private buildHud() {
        const b = this.band.hud;
        const g = this.add.graphics();
        g.fillStyle(C.panel, 1).fillRect(b.x, b.y, b.w, b.h);
        g.lineStyle(1, C.line, 1);
        g.beginPath(); g.moveTo(b.x, b.y + b.h - 0.5); g.lineTo(b.x + b.w, b.y + b.h - 0.5); g.strokePath();

        const L = b.x + PAD, R = b.x + b.w - PAD;
        const mk = (x: number, y: number, size: number, color: string, origin = 0) =>
            this.add.text(x, y, "", { fontFamily: fontOf(this), fontSize: `${size}px`, color })
                .setOrigin(origin, 0);

        this.totalLabel = this.add.text(L, b.y + 8, "TOTAL", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });
        this.equityText = mk(L, b.y + 20, FS.xl, S.ink);

        this.turnText = mk(R, b.y + 8, FS.sm, S.neon, 1);
        this.ipText = mk(R, b.y + 26, FS.sm, S.gold, 1);
        this.cashText = mk(R, b.y + 44, FS.xs, S.inkDim, 1);
        this.posText = mk(L, b.y + 54, FS.sm, S.inkDim);

        // 덱이 지금 몇 장이고 그중 저주가 몇인가. 보상을 받을지 말지가 이 줄에서 갈린다 —
        // 센 카드를 계속 집으면 덱이 두꺼워져 정작 그 카드가 안 잡힌다.
        this.deckText = mk(R, b.y + 58, FS.xs, S.inkDim, 1);

        // 뉴스 티커 — 한 줄. 넘치면 잘리게 두고 줄바꿈하지 않는다(HUD 높이가 고정이다).
        this.newsText = this.add.text(L, b.y + 78, "", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold, fixedWidth: b.w - PAD * 2,
        });
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

    /* ── ③ 유물 + 카드 ────────────────────────────────────── */

    private buildCardArea() {
        const b = this.band.cards;
        const L = b.x + PAD;

        this.add.text(L, b.y + 4, "RELICS", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });
        this.relicRow = this.add.container(L, b.y + 18);

        this.add.text(L, b.y + 52, "STRATEGY — 한 턴에 한 장", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });

        this.hand = new CardHandContainer(this, {
            x: L, y: b.y + 68, width: b.w - PAD * 2, height: b.h - 76,
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
            zone.on("pointerup", () => this.say(`${relic.name} — ${relic.description}`, S.gold));

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
        this.marketRead = this.engine.read(this.rogue.buildBuff());
        this.refresh();
        if (fired.length > 0) this.say(fired.join(" · "), S.gold);
        else this.say(`${this.engine.player.currentTurn}턴 — 카드를 고르고 매매하세요.`, S.inkDim);
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
        this.marketRead = this.engine.read(this.rogue.buildBuff());

        // 효과만 되뇌면 "그래서 지금 이걸 왜 골랐나" 가 안 남는다. 지금 소용이 없는
        // 카드면 그 사실을, 아니면 언제 쓰는 카드인지를 말해 준다.
        if (this.idleCheck(card)) {
            this.say(`${card.name} — 지금은 아무 일도 안 합니다`, S.danger);
        } else {
            this.say(`${card.name} — ${this.rogue.whenOf(card.id)}`,
                card.kind === "curse" ? S.danger : S.neon);
        }
    }

    private doTrade(kind: "half" | "all" | "sell") {
        if (this.busy) return;
        const buff = this.rogue.buildBuff();

        let res: TradeResult;
        if (kind === "half") res = this.engine.buyHalf(buff);
        else if (kind === "all") res = this.engine.buyAll(buff);
        else res = this.engine.sellAll(buff);

        if (!res.ok) { this.say(res.error, S.danger); return; }

        const verb = res.side === "buy" ? "매수" : "매도";
        const feeNote = res.fee === 0 && res.side === "sell" ? " (수수료 면제)" : "";
        this.say(`${verb} ${res.qty.toLocaleString()}주 @ ${res.price.toLocaleString()}${feeNote}`,
            res.side === "buy" ? S.up : S.down);
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

        this.engine.advanceTurn();
        this.refresh();

        this.marketRead = null;
        this.say([
            tickRes.news ?? pct(tickRes.changePct),
            ...(this.engine.stoppedOut ? ["손절 예약 발동 — 전량 매도"] : []),
            ...endFired,
        ].join(" · "), tickRes.changePct >= 0 ? S.up : S.down);

        // 네 턴마다 유물 하나 — 다만 **고르게** 한다. 그냥 굴러들어오면 무엇을 들고
        // 있는지도 모른 채 판이 끝나고, 그래서 유물이 무슨 소용인지 알 길이 없었다.
        const relicTurn = !this.engine.isOver && (this.engine.player.currentTurn - 1) % 4 === 0;

        // 봉이 하나 자라는 것을 눈이 따라갈 시간을 준다. 바로 넘기면 무엇이 변했는지 모른다.
        this.time.delayedCall(420, () => {
            if (this.engine.isOver) this.finish();
            else if (this.rogue.isRewardTurn(finished)) this.showReward();
            else if (relicTurn) this.showRelicOffer();
            else this.beginTurn();
        });
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

    /* ── 유물 고르기 (4·8턴을 끝냈을 때) ──────────────────── */

    /**
     * 유물은 판이 끝날 때까지 남는 **패시브**다. 카드가 한 턴짜리라면 유물은 판 전체의
     * 기울기를 바꾼다 — 그 차이가 안 보이면 유물이 왜 있는지 알 수 없다.
     *
     * 그래서 셋을 내밀어 읽고 고르게 한다. 고른 순간 무엇을 들고 가는지 알게 되고,
     * 남은 턴 내내 그 선택이 따라온다.
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
                this.say(`유물 ${relic.name} — ${relic.description}`, S.gold);
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

    /* ── 시작 덱 강화 (판을 열기 전) ───────────────────────── */

    /**
     * 인사이트를 **쓰는** 유일한 자리.
     *
     * 유물은 IP 75 에서 여섯 개로 차 버려 그 뒤로 인사이트가 갈 곳이 없었다. 여기서는
     * 시작 덱 여섯 장 중 약한 앞자리를 영구히 갈아 끼운다 — 덱이 불어나지 않으므로
     * 원하는 카드가 잡히는 확률은 그대로고 질만 오른다.
     *
     * 그리고 이것이 **청산될 때 잃는 것**이다. 그래서 판마다 무겁게 굴리게 된다.
     */
    private showUpgrade() {
        this.upgradeOffer = this.rogue.offerUpgrades();
        if (this.upgradeOffer.length === 0) { this.upgradeOffer = null; this.beginTurn(); return; }
        this.drawUpgrade();
    }

    private drawUpgrade() {
        const offer = this.upgradeOffer;
        if (!offer) return;
        const saved = loadProgress();
        const cost = nextUpgradeCost(saved);
        if (cost === null) { this.upgradeOffer = null; this.beginTurn(); return; }

        const stacked = this.designH < TALL_ENOUGH;
        const n = offer.length;
        const gap = 8;
        const pw = Math.min(this.designW - 40, stacked ? 660 : 350);
        const cellH = stacked ? 96 : 72;
        const rows = stacked ? 1 : n;
        const ph = 58 + rows * cellH + (rows - 1) * gap + 62;

        const { box, px, py } = this.openOverlay(pw, ph, C.gold);
        const mid = px + pw / 2;

        box.add(this.add.text(mid, py + 16, `UPGRADE — 인사이트 ${cost}`, {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold,
        }).setOrigin(0.5, 0));
        box.add(this.add.text(mid, py + 32, "시작 덱의 약한 카드 한 장을 영구히 바꿉니다", {
            fontFamily: fontOf(this), fontSize: `${FS.sm}px`, color: S.ink,
        }).setOrigin(0.5, 0));

        const close = (note: string, color: string) => {
            this.upgradeOffer = null;
            this.closeOverlay();
            this.beginTurn();
            this.say(note, color);
        };

        const inner = pw - 32;
        const cellW = stacked ? Math.floor((inner - gap * (n - 1)) / n) : inner;

        offer.forEach((card, i) => {
            const x = px + 16 + (stacked ? i * (cellW + gap) : 0);
            const y = py + 58 + (stacked ? 0 : i * (cellH + gap));
            box.add(this.makeOfferCell(x, y, cellW, cellH, card, stacked, () => {
                const next = purchaseUpgrade(card.id);
                // 산 값이 실제로 반영됐을 때만 덱을 다시 세운다.
                this.rogue.applyUpgrades(next.upgrades);
                close(`시작 덱에 ${card.name} — 남은 인사이트 ${next.insightPoints}`, S.gold);
            }));
        });

        const skip = makeButton(this, px + 16, py + ph - 62, inner, 46,
            "아껴 두기", () => close("인사이트를 아꼈습니다", S.inkDim),
            { tone: "plain", size: FS.sm });
        box.add(skip.root);
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
        // 보상 풀이 마르는 일은 없지만, 비면 그냥 다음 턴으로 넘긴다.
        if (offer.length === 0) { this.beginTurn(); return; }
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

        box.add(this.add.text(mid, py + 16, "CARD REWARD", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold,
        }).setOrigin(0.5, 0));
        box.add(this.add.text(mid, py + 32, "한 장을 덱에 넣습니다", {
            fontFamily: fontOf(this), fontSize: `${FS.sm}px`, color: S.ink,
        }).setOrigin(0.5, 0));

        const close = (note: string, color: string) => {
            this.offer = null;
            this.closeOverlay();
            this.beginTurn();
            this.say(note, color);
        };

        const inner = pw - 32;
        const cellW = stacked ? Math.floor((inner - gap * (n - 1)) / n) : inner;

        offer.forEach((card, i) => {
            const x = px + 16 + (stacked ? i * (cellW + gap) : 0);
            const y = py + 58 + (stacked ? 0 : i * (cellH + gap));
            box.add(this.makeOfferCell(x, y, cellW, cellH, card, stacked, () => {
                const curse = this.rogue.takeReward(card.id);
                close(
                    curse ? `${card.name} 획득 — 저주 ${curse} 도 덱에` : `${card.name} 을(를) 덱에`,
                    curse ? S.danger : S.neon,
                );
            }));
        });

        const skip = makeButton(this, px + 16, py + ph - 62, inner, 46,
            "건너뛰기 — 덱을 얇게", () => close("덱을 그대로 뒀습니다", S.inkDim),
            { tone: "plain", size: FS.sm });
        box.add(skip.root);
    }

    /**
     * 보상 카드 한 칸. 딸린 저주가 있으면 **고르기 전에** 이름을 보여 준다.
     *
     * @param stacked 가로로 편 좁은 칸인가. 그러면 저주 표시가 이름 옆에 못 들어가서
     *                아래로 내려간다.
     */
    private makeOfferCell(
        x: number, y: number, w: number, h: number,
        card: StrategyCard, stacked: boolean, onTake: () => void,
    ): Phaser.GameObjects.Container {
        const root = this.add.container(x, y);
        const cursed = !!card.curseName;
        const edge = cursed ? C.danger : C.neon;

        const g = this.add.graphics();
        g.fillStyle(C.panelHi, 1).fillRect(0, 0, w, h);
        g.lineStyle(1, edge, 1).strokeRect(0.5, 0.5, w - 1, h - 1);

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
        if (cursed) {
            const tag = this.add.text(
                stacked ? 10 : w - 10,
                stacked ? h - 10 - FS.xs : 11,
                `+저주 ${card.curseName}`,
                { fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.danger },
            ).setOrigin(stacked ? 0 : 1, 0);
            root.add(tag);
        }
        return root;
    }

    /* ── 결산 ─────────────────────────────────────────────── */

    private finish() {
        this.engine.liquidate();
        const sum = this.engine.summarize();
        // 여기서 한 번만 저장한다. summarize 가 이미 player.insightPoints 를 올려 뒀지만
        // 그건 이 판 안의 값이고, 판을 넘어 남는 것은 progress 가 들고 있다.
        const { progress, newBest } = recordRun(sum);
        this.ended = { sum, progress, newBest };
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

        const { box, px, py } = this.openOverlay(pw, ph, r.sum.bankrupt ? C.danger : C.neon);
        const mid = px + pw / 2;

        const t = (y: number, s: string, size: number, color: string) =>
            box.add(this.add.text(mid, y, s, {
                fontFamily: fontOf(this), fontSize: `${size}px`, color, align: "center",
                wordWrap: { width: pw - 30 },
            }).setOrigin(0.5, 0));

        // [제목, 수익률, 자산, 인사이트, 누적, 최고, 유물] 의 y 오프셋
        const at = tight ? [12, 32, 74, 100, 122, 142, 162] : [20, 50, 108, 142, 172, 194, 218];

        const bust = sum.bankrupt;
        t(py + at[0]!,
            bust ? "LIQUIDATED — 청산" : newBest ? "RUN COMPLETE — 새 기록" : "RUN COMPLETE",
            tight ? FS.sm : FS.md, bust ? S.danger : newBest ? S.neon : S.inkDim);
        t(py + at[1]!, pct(sum.returnPct), tight ? FS.xl : FS.xxl, tone(sum.returnPct));
        t(py + at[2]!, `${money(sum.startEquity)} → ${money(sum.finalEquity)}`, FS.sm, S.ink);
        // 청산은 못 번 것이 아니라 **잃은 것**이다. 무엇이 사라졌는지 그 자리에서 말한다.
        t(py + at[3]!,
            bust ? "인사이트 절반 · 시작 덱 강화 초기화"
                : sum.idle ? "한 주도 사지 않았습니다 — 인사이트 없음"
                    : `인사이트 +${sum.earnedIP}`,
            tight ? FS.sm : FS.md, bust || sum.idle ? S.danger : S.gold);
        // 차수가 오른 것이 곧 "다시 켤 이유" 다. 성적보다 이 줄이 먼저 눈에 들어와야 한다.
        const tierNote = bust
            ? `차수 ${progress.tier} 로 내려갔습니다`
            : progress.tier >= MAX_TIER ? `차수 ${MAX_TIER} — 끝까지 올랐습니다`
                : `차수 ${progress.tier} — 다음 판은 청산선이 더 높습니다`;
        t(py + at[4]!, tierNote, FS.sm, bust ? S.danger : S.gold);
        t(py + at[5]! - 2, `누적 IP ${progress.insightPoints} · ${progress.runs}번째 판`,
            FS.xs, S.inkDim);
        t(py + at[6]!, [
            progress.bestReturn !== null ? `최고 ${pct(progress.bestReturn)}` : "",
            `강화 ${progress.upgrades.length}/4`,
        ].filter(Boolean).join(" · "), FS.xs, newBest ? S.neon : bust ? S.danger : S.inkDim);

        const btnH = tight ? 44 : 54;
        const restart = makeButton(this, px + 20, py + ph - btnH - (tight ? 14 : 20), pw - 40, btnH,
            r.sum.bankrupt ? "다시 처음부터 >" : "RESTART >", () => {
                this.closeOverlay();
                // 인사이트만 들고 다음 런으로. 유물도 카드도 새로 뽑힌다.
                this.scene.restart({ insightPoints: progress.insightPoints });
            }, { tone: "go", size: FS.lg });
        box.add(restart.root);
    }

    /* ── 그리기 ─────────────────────────────────────────── */

    private refresh() {
        const e = this.engine;
        const p = e.player;

        this.chart.render(e.stock.history, this.marketRead);

        this.equityText.setText(money(e.equity)).setColor(tone(e.totalReturnPct));

        // 청산선이 눈에 보여야 그 선을 피할 수 있다. 가까워졌을 때만 띄운다 — 늘 떠 있으면
        // 읽히지 않는 배경이 된다. 1.2 배는 시작 자금의 90% 언저리다.
        const near = e.equity < e.bustLine * 1.2;
        this.totalLabel
            .setText(near ? `TOTAL · 청산선 ${money(e.bustLine)}`
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

        // 가로에서는 HUD 가 왼쪽 칸만 쓴다(390 이 아니라 324 남짓). 긴 형태를 그대로 쓰면
        // 오른쪽 끝의 DECK 줄과 부딪히므로, 좁을 때는 평단을 접고 주수와 손익만 남긴다.
        const narrowHud = this.band.hud.w < 360;
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

    /** 뉴스 티커 한 줄. 길면 잘라 둔다 — HUD 높이는 고정이다. */
    private say(msg: string, color: string) {
        // 가로에서는 HUD 가 왼쪽 칸만 쓰므로 들어가는 글자 수가 다르다. 폭에서 낸다.
        const max = Math.max(24, Math.floor((this.band.hud.w - PAD * 2) / 7));
        this.newsText.setText(msg.length > max ? `${msg.slice(0, max - 1)}…` : msg).setColor(color);
    }
}
