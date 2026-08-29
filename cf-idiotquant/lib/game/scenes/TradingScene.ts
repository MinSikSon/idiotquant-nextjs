// 판이 도는 화면 — 도트 스타일 기본 틀.
//
// **여기에 규칙을 쓰지 않는다.** 주가도 체결도 카드 효과도 전부 lib/game/core 에서 온다.
// 이 파일에 `price * 1.1` 같은 식이 생기면 그건 코어로 가야 할 것이 새어 나온 것이다.
//
// ── 한 턴의 순서 ────────────────────────────────────────────────
//   턴 열림 → 유물(onTurnStart) → 카드 세 장 → [매매] → [NEXT TURN]
//   → 카드+유물을 합친 buff 로 tick → 유물(onTurnEnd) → 다음 턴
//
// 매매가 tick 앞에 오는 것이 이 게임의 전부다. **주가가 움직이기 전에** 살지 말지를
// 정해야 해서, 카드로 읽은 것을 손에 쥐고 거는 판이 된다.
//
// ── 늘릴 자리 ───────────────────────────────────────────────────
//   · 종목을 여럿으로   → StockEngine 을 배열로 들고 chart 를 자리마다
//   · 상점·이벤트 턴    → Scene 을 하나 더 만들고 config.ts 의 scene 배열에 얹는다
//   · 연출(체결 이펙트) → this.tweens. 엔진은 안 건드린다

import Phaser from "phaser";
import { StockEngine } from "@/lib/game/core/StockEngine";
import { RoguelikeManager } from "@/lib/game/core/RoguelikeManager";
import type { Relic, StrategyCard, TradeResult } from "@/lib/game/core/types";
import { loadProgress, recordRun } from "@/lib/game/core/progress";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { CardHandContainer } from "@/lib/game/components/CardHandContainer";
import { W, H, BAND, PAD, C, S, FS, fontOf, money, pct, tone } from "@/lib/game/ui/theme";

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

    private relicRow!: Phaser.GameObjects.Container;
    private buyHalfBtn!: Btn;
    private allInBtn!: Btn;
    private sellBtn!: Btn;
    private nextBtn!: Btn;

    /** 턴을 넘기는 동안 두 번 눌리지 않게. */
    private busy = false;
    /** 판을 넘어 남는 것. 재시작할 때 이 값만 들고 간다. */
    private carriedIP = 0;

    constructor() { super("trading"); }

    init(data: { insightPoints?: number }) {
        // 이어서 굴리는 판(restart)은 넘겨받은 값을, 새로 켠 판은 저장된 진행을 쓴다.
        // config 가 값을 준 경우(임베드·테스트)는 그것이 이긴다.
        this.carriedIP =
            data?.insightPoints
            ?? (this.game.registry.get("insightPoints") as number | undefined)
            ?? loadProgress().insightPoints;
        this.busy = false;
    }

    create() {
        this.cameras.main.setBackgroundColor(C.bg);

        const seed = (Math.random() * 0xffffffff) >>> 0;
        this.engine = new StockEngine(seed);
        this.engine.player.insightPoints = this.carriedIP;
        this.rogue = new RoguelikeManager(seed);
        this.rogue.grantStartingRelics(this.carriedIP);

        this.drawDotGrid();
        this.buildHud();
        this.buildChart();
        this.buildCardArea();
        this.buildActions();

        this.beginTurn();
    }

    /** 화면 전체에 깔리는 도트. 이게 있어야 어두운 바탕이 "꺼진 화면" 이 아니라 기기가 된다. */
    private drawDotGrid() {
        const g = this.add.graphics();
        g.fillStyle(C.line, 0.22);
        for (let y = 6; y < H; y += 14) {
            for (let x = 6; x < W; x += 14) g.fillRect(x, y, 1, 1);
        }
    }

    /* ── ① 상단 HUD (y 0~100) ─────────────────────────────── */

    private buildHud() {
        const b = BAND.hud;
        const g = this.add.graphics();
        g.fillStyle(C.panel, 1).fillRect(0, b.y, W, b.h);
        g.lineStyle(1, C.line, 1);
        g.beginPath(); g.moveTo(0, b.y + b.h - 0.5); g.lineTo(W, b.y + b.h - 0.5); g.strokePath();

        const mk = (x: number, y: number, size: number, color: string, origin = 0) =>
            this.add.text(x, y, "", { fontFamily: fontOf(this), fontSize: `${size}px`, color })
                .setOrigin(origin, 0);

        this.add.text(PAD, b.y + 8, "TOTAL", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });
        this.equityText = mk(PAD, b.y + 20, FS.xl, S.ink);

        this.turnText = mk(W - PAD, b.y + 8, FS.sm, S.neon, 1);
        this.ipText = mk(W - PAD, b.y + 26, FS.sm, S.gold, 1);
        this.cashText = mk(W - PAD, b.y + 44, FS.xs, S.inkDim, 1);
        this.posText = mk(PAD, b.y + 54, FS.sm, S.inkDim);

        // 덱이 지금 몇 장이고 그중 저주가 몇인가. 보상을 받을지 말지가 이 줄에서 갈린다 —
        // 센 카드를 계속 집으면 덱이 두꺼워져 정작 그 카드가 안 잡힌다.
        this.deckText = mk(W - PAD, b.y + 58, FS.xs, S.inkDim, 1);

        // 뉴스 티커 — 한 줄. 넘치면 잘리게 두고 줄바꿈하지 않는다(HUD 높이가 고정이다).
        this.newsText = this.add.text(PAD, b.y + 78, "", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold, fixedWidth: W - PAD * 2,
        });
    }

    /* ── ② 차트 (y 100~450) ───────────────────────────────── */

    private buildChart() {
        const b = BAND.chart;
        this.chart = new PixelCandleChart(this, {
            x: PAD, y: b.y + PAD, width: W - PAD * 2, height: b.h - PAD * 2,
        });

        // 종목 이름은 차트 위에 겹쳐 둔다 — 칸을 따로 만들면 차트가 그만큼 준다.
        this.add.text(W - PAD - 6, b.y + b.h - PAD - FS.xs - 4,
            `${this.engine.stock.name} ${this.engine.stock.ticker}`, {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        }).setOrigin(1, 0);
    }

    /* ── ③ 유물 + 카드 (y 450~650) ────────────────────────── */

    private buildCardArea() {
        const b = BAND.cards;

        this.add.text(PAD, b.y + 4, "RELICS", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });
        this.relicRow = this.add.container(PAD, b.y + 18);

        this.add.text(PAD, b.y + 52, "STRATEGY — 한 턴에 한 장", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.inkDim,
        });

        this.hand = new CardHandContainer(this, {
            x: PAD, y: b.y + 68, width: W - PAD * 2, height: b.h - 76,
            onPick: id => this.onPickCard(id),
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

    /* ── ④ 하단 엄지 영역 (y 650~844) ─────────────────────── */

    private buildActions() {
        const b = BAND.action;
        const w = W - PAD * 2;
        const gap = 8;
        const third = Math.floor((w - gap * 2) / 3);
        const rowY = b.y + 10;
        const rowH = 62;

        this.buyHalfBtn = makeButton(this, PAD, rowY, third, rowH,
            "50%\nBUY", () => this.doTrade("half"), { tone: "buy", size: FS.md });
        this.allInBtn = makeButton(this, PAD + third + gap, rowY, third, rowH,
            "ALL-IN", () => this.doTrade("all"), { tone: "buy", size: FS.md });
        this.sellBtn = makeButton(this, PAD + (third + gap) * 2, rowY, third, rowH,
            "ALL\nSELL", () => this.doTrade("sell"), { tone: "sell", size: FS.md });

        this.nextBtn = makeButton(this, PAD, rowY + rowH + 12, w, 72,
            "NEXT TURN >", () => this.endTurn(), { tone: "go", size: FS.lg });
    }

    /* ── 턴 ─────────────────────────────────────────────── */

    private beginTurn() {
        // 순서가 중요하다: 손패를 **먼저** 깔고 유물을 터뜨린다. 파쇄기는 손에 잡힌 저주를
        // 보고 태우는 유물이라, 반대로 하면 태울 것이 아직 없다.
        this.rogue.dealHand();
        const fired = this.rogue.onTurnStart(this.engine.player);
        this.hand.setHand(this.rogue.hand);
        this.renderRelics();
        this.busy = false;

        this.refresh();
        if (fired.length > 0) this.say(fired.join(" · "), S.gold);
        else this.say(`${this.engine.player.currentTurn}턴 — 카드를 고르고 매매하세요.`, S.inkDim);
    }

    /** @param uid 그 **장**의 번호. 덱에 같은 카드가 여러 장이라 id 로는 못 짚는다. */
    private onPickCard(uid: string) {
        if (this.busy) return;
        const card = this.rogue.hand.find(c => c.uid === uid);
        if (this.rogue.playCard(uid) && card) {
            this.say(`${card.name} — ${card.effectDescription}`,
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

        // 네 턴마다 유물 하나. 판이 길어질수록 세지는 감각이 여기서 나온다.
        let relicNote: string | null = null;
        if (!this.engine.isOver && (this.engine.player.currentTurn - 1) % 4 === 0) {
            const got = this.rogue.grantRandomRelic();
            if (got) relicNote = `유물 획득 — ${got.name}`;
        }

        this.say([
            tickRes.news ?? pct(tickRes.changePct),
            ...endFired,
            ...(relicNote ? [relicNote] : []),
        ].join(" · "), tickRes.changePct >= 0 ? S.up : S.down);

        // 봉이 하나 자라는 것을 눈이 따라갈 시간을 준다. 바로 넘기면 무엇이 변했는지 모른다.
        this.time.delayedCall(420, () => {
            if (this.engine.isOver) this.finish();
            else if (this.rogue.isRewardTurn(finished)) this.showReward();
            else this.beginTurn();
        });
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

        const rowH = 72, rowGap = 8;
        const pw = W - 40, px = 20;
        const ph = 58 + offer.length * (rowH + rowGap) + 62;
        const py = Math.round((H - ph) / 2);

        const box = this.add.container(0, 0);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.82).fillRect(0, 0, W, H);
        g.fillStyle(C.panel, 1).fillRect(px, py, pw, ph);
        g.lineStyle(2, C.gold, 1).strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        box.add(g);
        // 오버레이 뒤를 못 누르게. busy 가 아직 true 라 눌려도 아무 일이 없지만, 눌린
        // 것처럼 보이는 것만으로도 화면이 거짓말을 한다.
        box.add(this.add.zone(0, 0, W, H).setOrigin(0, 0).setInteractive());

        box.add(this.add.text(W / 2, py + 16, "CARD REWARD", {
            fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.gold,
        }).setOrigin(0.5, 0));
        box.add(this.add.text(W / 2, py + 32, "한 장을 덱에 넣습니다", {
            fontFamily: fontOf(this), fontSize: `${FS.sm}px`, color: S.ink,
        }).setOrigin(0.5, 0));

        const close = (note: string, color: string) => {
            box.destroy(true);
            this.beginTurn();
            this.say(note, color);
        };

        offer.forEach((card, i) => {
            box.add(this.makeOfferRow(
                px + 16, py + 58 + i * (rowH + rowGap), pw - 32, rowH, card,
                () => {
                    const curse = this.rogue.takeReward(card.id);
                    close(
                        curse ? `${card.name} 획득 — 저주 ${curse} 도 덱에` : `${card.name} 을(를) 덱에`,
                        curse ? S.danger : S.neon,
                    );
                },
            ));
        });

        const skip = makeButton(this, px + 16, py + ph - 62, pw - 32, 46,
            "건너뛰기 — 덱을 얇게", () => close("덱을 그대로 뒀습니다", S.inkDim),
            { tone: "plain", size: FS.sm });
        box.add(skip.root);
    }

    /** 보상 카드 한 줄. 딸린 저주가 있으면 **고르기 전에** 이름을 보여 준다. */
    private makeOfferRow(
        x: number, y: number, w: number, h: number,
        card: StrategyCard, onTake: () => void,
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
            root.add(this.add.text(w - 10, 11, `+저주 ${card.curseName}`, {
                fontFamily: fontOf(this), fontSize: `${FS.xs}px`, color: S.danger,
            }).setOrigin(1, 0));
        }
        return root;
    }

    /* ── 그리기 ─────────────────────────────────────────── */

    private refresh() {
        const e = this.engine;
        const p = e.player;

        this.chart.render(e.stock.history);

        this.equityText.setText(money(e.equity)).setColor(tone(e.totalReturnPct));
        this.cashText.setText(`현금 ${money(p.cash)}`);
        this.turnText.setText(`TURN ${Math.min(p.currentTurn, p.maxTurns)}/${p.maxTurns}`);
        this.ipText.setText(`IP ${p.insightPoints}`);

        // 남은 장 / 덱 전체. 저주가 섞이면 그 수를 붙이고 색을 바꾼다 — 덱이 더러워진 것을
        // 숫자 하나로 알아야 다음 보상에서 건너뛸 마음이 생긴다.
        const d = this.rogue.deckState;
        this.deckText
            .setText(d.curses > 0 ? `DECK ${d.draw}/${d.total} · 저주 ${d.curses}` : `DECK ${d.draw}/${d.total}`)
            .setColor(d.curses > 0 ? S.danger : S.inkDim);

        this.posText.setText(
            p.shares > 0
                ? `보유 ${p.shares.toLocaleString()}주 · 평단 ${Math.round(p.avgPrice).toLocaleString()} · ${pct(e.unrealizedPct)}`
                : "보유 없음",
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
        this.newsText.setText(msg.length > 46 ? `${msg.slice(0, 45)}…` : msg).setColor(color);
    }

    /* ── ⑤ 결산 오버레이 ─────────────────────────────────── */

    private finish() {
        this.engine.liquidate();
        const sum = this.engine.summarize();
        // 여기서 한 번만 저장한다. summarize 가 이미 player.insightPoints 를 올려 뒀지만
        // 그건 이 판 안의 값이고, 판을 넘어 남는 것은 progress 가 들고 있다.
        const { progress, newBest } = recordRun(sum);
        this.refresh();

        const box = this.add.container(0, 0);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.82).fillRect(0, 0, W, H);

        const pw = W - 40, ph = 320;
        const px = 20, py = Math.round((H - ph) / 2);
        g.fillStyle(C.panel, 1).fillRect(px, py, pw, ph);
        g.lineStyle(2, C.neon, 1).strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        box.add(g);

        // 오버레이 뒤쪽이 눌리면 안 된다. 판은 끝났다.
        box.add(this.add.zone(0, 0, W, H).setOrigin(0, 0).setInteractive());

        const mid = W / 2;
        const t = (y: number, s: string, size: number, color: string) =>
            box.add(this.add.text(mid, y, s, {
                fontFamily: fontOf(this), fontSize: `${size}px`, color, align: "center",
                wordWrap: { width: pw - 30 },
            }).setOrigin(0.5, 0));

        t(py + 22, newBest ? "RUN COMPLETE — 새 기록" : "RUN COMPLETE", FS.md,
            newBest ? S.neon : S.inkDim);
        t(py + 48, pct(sum.returnPct), FS.xxl, tone(sum.returnPct));
        t(py + 100, `${money(sum.startEquity)} → ${money(sum.finalEquity)}`, FS.sm, S.ink);
        t(py + 134, sum.idle
            ? "한 주도 사지 않았습니다 — 인사이트 없음"
            : `인사이트 +${sum.earnedIP}`, FS.md, sum.idle ? S.danger : S.gold);
        t(py + 162, `누적 IP ${progress.insightPoints} · ${progress.runs}번째 판`, FS.sm, S.inkDim);
        t(py + 182, progress.bestReturn !== null ? `최고 기록 ${pct(progress.bestReturn)}` : "",
            FS.sm, newBest ? S.neon : S.inkDim);
        t(py + 204, this.rogue.relics.length > 0
            ? `유물 ${this.rogue.relics.map(r => r.name).join(" · ")}`
            : "유물 없음", FS.xs, S.inkDim);

        const restart = makeButton(this, px + 20, py + ph - 74, pw - 40, 54,
            "RESTART >", () => {
                box.destroy(true);
                // 인사이트만 들고 다음 런으로. 유물도 카드도 새로 뽑힌다.
                this.scene.restart({ insightPoints: progress.insightPoints });
            }, { tone: "go", size: FS.lg });
        box.add(restart.root);
    }
}
