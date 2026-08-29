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
import type { Relic, TradeResult } from "@/lib/game/core/types";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import { CardHandContainer } from "@/lib/game/components/CardHandContainer";
import { W, H, BAND, PAD, C, S, FONT, FS, money, pct, tone } from "@/lib/game/ui/theme";

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
        fontFamily: FONT, fontSize: `${o.size ?? FS.md}px`, color: skin.ink, align: "center",
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
        // 첫 판은 config.ts 가 registry 에 넣어 준 값에서, 재시작은 restart(data) 에서 온다.
        this.carriedIP = data?.insightPoints ?? (this.game.registry.get("insightPoints") as number) ?? 0;
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
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color })
                .setOrigin(origin, 0);

        this.add.text(PAD, b.y + 8, "TOTAL", {
            fontFamily: FONT, fontSize: `${FS.xs}px`, color: S.inkDim,
        });
        this.equityText = mk(PAD, b.y + 20, FS.xl, S.ink);

        this.turnText = mk(W - PAD, b.y + 8, FS.sm, S.neon, 1);
        this.ipText = mk(W - PAD, b.y + 26, FS.sm, S.gold, 1);
        this.cashText = mk(W - PAD, b.y + 44, FS.xs, S.inkDim, 1);
        this.posText = mk(PAD, b.y + 54, FS.sm, S.inkDim);

        // 뉴스 티커 — 한 줄. 넘치면 잘리게 두고 줄바꿈하지 않는다(HUD 높이가 고정이다).
        this.newsText = this.add.text(PAD, b.y + 78, "", {
            fontFamily: FONT, fontSize: `${FS.xs}px`, color: S.gold, fixedWidth: W - PAD * 2,
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
            fontFamily: FONT, fontSize: `${FS.xs}px`, color: S.inkDim,
        }).setOrigin(1, 0);
    }

    /* ── ③ 유물 + 카드 (y 450~650) ────────────────────────── */

    private buildCardArea() {
        const b = BAND.cards;

        this.add.text(PAD, b.y + 4, "RELICS", {
            fontFamily: FONT, fontSize: `${FS.xs}px`, color: S.inkDim,
        });
        this.relicRow = this.add.container(PAD, b.y + 18);

        this.add.text(PAD, b.y + 52, "STRATEGY — 한 턴에 한 장", {
            fontFamily: FONT, fontSize: `${FS.xs}px`, color: S.inkDim,
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
                fontFamily: FONT, fontSize: `${FS.xs}px`, color: S.inkDim,
            }));
            return;
        }

        this.rogue.relics.forEach((relic: Relic, i: number) => {
            const x = i * (size + gap);
            const g = this.add.graphics();
            g.fillStyle(C.panelHi, 1).fillRect(x, 0, size, size);
            g.lineStyle(1, C.gold, 1).strokeRect(x + 0.5, 0.5, size - 1, size - 1);

            const ch = this.add.text(x + size / 2, size / 2, relic.name.slice(0, 1), {
                fontFamily: FONT, fontSize: `${FS.md}px`, color: S.gold,
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
        const fired = this.rogue.onTurnStart(this.engine.player);
        this.hand.setHand(this.rogue.dealHand());
        this.renderRelics();
        this.busy = false;

        this.refresh();
        if (fired.length > 0) this.say(fired.join(" · "), S.gold);
        else this.say(`${this.engine.player.currentTurn}턴 — 카드를 고르고 매매하세요.`, S.inkDim);
    }

    private onPickCard(id: string) {
        if (this.busy) return;
        const card = this.rogue.hand.find(c => c.id === id);
        if (this.rogue.playCard(id) && card) {
            this.say(`${card.name} — ${card.effectDescription}`, S.neon);
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
            else this.beginTurn();
        });
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
                fontFamily: FONT, fontSize: `${size}px`, color, align: "center",
                wordWrap: { width: pw - 30 },
            }).setOrigin(0.5, 0));

        t(py + 22, "RUN COMPLETE", FS.md, S.inkDim);
        t(py + 48, pct(sum.returnPct), FS.xxl, tone(sum.returnPct));
        t(py + 100, `${money(sum.startEquity)} → ${money(sum.finalEquity)}`, FS.sm, S.ink);
        t(py + 134, sum.idle
            ? "한 주도 사지 않았습니다 — 인사이트 없음"
            : `인사이트 +${sum.earnedIP}`, FS.md, sum.idle ? S.danger : S.gold);
        t(py + 162, `누적 IP ${this.engine.player.insightPoints}`, FS.sm, S.inkDim);
        t(py + 186, this.rogue.relics.length > 0
            ? `유물 ${this.rogue.relics.map(r => r.name).join(" · ")}`
            : "유물 없음", FS.xs, S.inkDim);

        const restart = makeButton(this, px + 20, py + ph - 74, pw - 40, 54,
            "RESTART >", () => {
                box.destroy(true);
                // 인사이트만 들고 다음 런으로. 유물도 카드도 새로 뽑힌다.
                this.scene.restart({ insightPoints: this.engine.player.insightPoints });
            }, { tone: "go", size: FS.lg });
        box.add(restart.root);
    }
}
