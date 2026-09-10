// 고른 종목 — **회사 화면의 본체.** 차트 · 알아본 것 · 체결.
//
// ── 이 판이 하는 일 ────────────────────────────────────────────
// 목록이 별도 화면으로 나가면서(`StockList`) 회사 화면에는 **고른 종목 하나**만 남았다.
// 그래서 이 판이 세로를 넉넉히 쓴다 — 예전에는 목록과 자리를 나눠 쓰느라 차트가
// 64px 로 눌리고 알아본 결과가 구석의 한 줄이었다.
//
// ── 알아본 것이 여기서 말을 한다 ───────────────────────────────
// 「알아본다에 효과가 없다」는 말을 들은 자리가 이곳이다. 값은 제대로 계산되고 있었는데
// **차트 오른쪽 위 12px 짜리 금색 한 줄**이 3 에너지의 보상 전부였다. 지금은 판정이
// 검은 화면 한 칸을 차지하고(`verdictSay`), 그 판정이 **어느 버튼을 밝힐지까지 정한다.**
//
// 판정을 내리는 것은 `core/research.ts` 다. 화면이 「하락이면 사지 마라」를 다시 적으면
// 규칙이 두 군데가 되고, 어느 날 한쪽만 바뀐다.

import Phaser from "phaser";
import type { MarketRead } from "@/lib/game/core/types";
import { verdictOf, verdictSay, worthRecommending } from "@/lib/game/core/research";
import {
    blockSay, researchSay, type OrderBlock, type ResearchBlock,
} from "@/lib/game/core/orders";
import { PixelCandleChart } from "@/lib/game/components/PixelCandleChart";
import type { StockRow } from "@/lib/game/components/StockList";
import { C, FS, PAD, S, type Band, fontOf, mkText, price, pressable } from "@/lib/game/ui/theme";
import { btnFace, crt, skinOf } from "@/lib/game/ui/win95";

/** 이보다 얇으면 봉의 몸통과 꼬리가 안 갈린다 — 그때는 차트를 안 그린다. */
const CHART_MIN = 60;
/** 체결 버튼 한 칸의 높이. */
const BTN_H = 44;
/** 판정 칸 — 머리 한 줄과 부제 한 줄. */
const VERDICT_H = 40;
/** 「알아본다」 줄. */
const ACT_H = 26;
/** 머리 — 이름·베타와 시세. */
const HEAD_H = 22;

export interface StockSheetDeps {
    scene: Phaser.Scene;
    band: Band;
    /** 지금 고른 종목의 줄. 없으면 아무것도 안 그린다. */
    row(): StockRow | null;
    /**
     * 이 종목에 대해 **읽어 낸 것.** 안 알아봤으면 null.
     *
     * **다른 종목을 알아본 것을 여기 넘기지 말 것** — 국면은 시장 하나짜리라
     * 그러면 3 에너지로 아홉 종목이 다 열린다.
     */
    read(): MarketRead | null;
    /** 지금 알아보는 것을 막는 것. `"thisStock"` 이면 이미 알아본 것이다(`core/orders.ts`). */
    researchBlock(): ResearchBlock;
    /** 이번 턴에 이미 다른 종목을 알아봤으면 그 이름. */
    otherThesis(): string | null;
    researchCost(): number;
    /** 지금 권하는 것을 막는 것. `"none"` 이면 누를 수 있다(`core/orders.ts`). */
    block(): OrderBlock;
    /** 지금 앞에 앉은 사람의 이름. */
    clientName(): string;
    onResearch(id: string): void;
    onBuy(id: string): void;
    onSell(id: string): void;
}

export class StockSheet {
    private readonly d: StockSheetDeps;
    private root: Phaser.GameObjects.Container | null = null;

    constructor(deps: StockSheetDeps) { this.d = deps; }

    close(): void {
        this.root?.destroy(true);
        this.root = null;
    }

    draw(): void {
        const { scene, band } = this.d;
        const row = this.d.row();
        if (!row || band.h <= 0) return;

        const root = scene.add.container(0, 0);
        this.root = root;

        const f = fontOf(scene);
        const up = row.changePct >= 0;
        const x0 = band.x + 3;
        const inW = band.w - 6;

        /* ── 자리 잡기 ─────────────────────────────────────────────
           아래에서부터 잡는다. 버튼과 「알아본다」는 반드시 서고, 차트가 남는 것을 쓴다.

           **판정 칸은 알아봤을 때만 선다.** 안 알아본 턴에는 「아직 안 알아봤다 /
           알아봐야 국면이 열린다」가 떴는데, 바로 아래 줄이 「이 종목을 알아본다」라
           **같은 말을 두 번** 하는 셈이었다. 지금은 그 칸이 아예 없고, 차트가 그만큼
           커진다 — 그리고 판정 칸이 뜨는 것 자체가 3 에너지를 쓴 표시가 된다. */
        const read = this.d.read();
        const hasVerdict = read?.regime != null;

        const btnY = band.y + band.h - BTN_H - 4;
        const actY = btnY - ACT_H - 6;
        const verdictY = actY - VERDICT_H - 6;
        const headY = band.y + 3;
        const chartY = headY + HEAD_H + 4;
        const chartH = (hasVerdict ? verdictY : actY) - 6 - chartY;
        const hasChart = chartH >= CHART_MIN;

        /* ── 머리 — 이름과 시세. 값이라 검은 화면 안이다.
           **베타는 여기 없다.** 종목을 *고를 때* 쓰는 값이라 목록에 있고(`StockList`),
           이미 고른 뒤에는 판정의 「턴당 −6.7%」가 그 베타를 먹인 값을 준다. ── */
        const headH = hasChart ? HEAD_H : Math.max(HEAD_H, (hasVerdict ? verdictY : actY) - 6 - headY);
        root.add(crt(scene, x0, headY, inW, headH));
        const mid = headY + Math.min(headH, HEAD_H) / 2;
        root.add(mkText(scene, x0 + 6, mid, row.stock.name, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: S.gold,
        }).setOrigin(0, 0.5));
        root.add(mkText(scene, x0 + inW - 6, mid,
            `${price(row.price)}  ${up ? "+" : ""}${row.changePct.toFixed(1)}%`, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: up ? S.up : S.down,
        }).setOrigin(1, 0.5));

        if (hasChart) {
            const chart = new PixelCandleChart(scene, {
                x: x0, y: chartY, width: inW, height: chartH,
            });
            scene.add.existing(chart);
            chart.render(row.stock.history, this.d.read());
            root.add(chart);
        }

        /* ── 판정 — **3 에너지가 사 온 것.** 알아봤을 때만 선다. ── */
        const v = verdictOf(read);
        if (hasVerdict) {
            const say = verdictSay(v);
            const tone = v === "buy" ? S.up : v === "avoid" ? S.down : S.gold;

            root.add(crt(scene, x0, verdictY, inW, VERDICT_H));
            root.add(mkText(scene, x0 + 8, verdictY + 5, say.head, {
                fontFamily: f, fontSize: `${FS.sm}px`, color: tone,
            }));
            // 숫자는 오른쪽에. 「턴당 −6.7%」 가 판정의 근거다.
            if (read?.regimeDrift != null) {
                const d = read.regimeDrift;
                root.add(mkText(scene, x0 + inW - 8, verdictY + 5,
                    `턴당 ${d >= 0 ? "+" : ""}${d.toFixed(1)}%`, {
                    fontFamily: f, fontSize: `${FS.sm}px`, color: tone,
                }).setOrigin(1, 0));
            }
            const subT = mkText(scene, x0 + 8, verdictY + 23, say.sub, {
                fontFamily: f, fontSize: `${FS.xs}px`, color: S.inkDim,
            });
            // 부제가 칸을 넘으면 잘라 낸다 — 줄이면 머리와 크기가 어긋난다.
            if (subT.displayWidth > inW - 16) {
                let cut = say.sub;
                while (cut.length > 1 && subT.displayWidth > inW - 16) {
                    cut = cut.slice(0, -1);
                    subT.setText(`${cut}…`);
                }
            }
            root.add(subT);
        }

        /* ── 알아본다 ──────────────────────────────────────────────
           **근거는 권하기 전에 만들어야 붙는다.** 권한 뒤에 알아보면 에너지만 나가고
           이번 턴에는 아무 값도 안 하는데, 이 줄은 그때도 멀쩡히 열려 있었다. */
        const rb = this.d.researchBlock();
        const other = this.d.otherThesis();
        const cost = this.d.researchCost();
        const mine = rb === "thisStock";
        const can = rb === "none";
        const label = researchSay(rb, { other, cost });

        // **아직 안 알아봤으면 이 줄이 이번 턴의 다음 걸음이다.**
        const actSkin = skinOf(can, true);
        const actParts = btnFace(scene, x0, actY, inW, ACT_H, actSkin);
        for (const g of actParts) root.add(g);
        const actT = mkText(scene, x0 + 8, actY + ACT_H / 2, label, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: actSkin.ink,
        }).setOrigin(0, 0.5);
        root.add(actT);
        if (can) {
            const { zone, shade } = pressable(scene, x0, actY, inW, ACT_H, [...actParts, actT],
                () => this.d.onResearch(row.stock.id));
            root.add(shade); root.add(zone);
        }

        /* ── 체결 ─────────────────────────────────────────────────
           **이 칸 둘은 언제나 사고파는 자리다.** 「무른다」는 여기 안 온다 — 아래 버튼
           띠에 있다(`TradingScene.drawActions`).

           한때 왼쪽 칸이 체결 뒤에 「무른다」로 바뀌었는데, 그러면 **팔아서 현금을 만든
           다음 권하는 길이 막힌다.** 바로 그 위 칸이 「팔아야 권할 현금이 생긴다」고
           말해 놓고, 팔고 나면 권하는 버튼이 사라지는 셈이었다. 무름은 한 턴을 통째로
           되돌리는 **턴 단위 행동**이라 종목 판이 아니라 버튼 띠가 질 일이다.

           왼쪽 칸은 **둘 중 하나**다 — 막혔으면 이유를 적고 잠그거나, 「권한다」거나. */
        const half = (inW - 6) / 2;
        const who = this.d.clientName();
        const block = this.d.block();

        if (block !== "none") {
            const say = blockSay(block);
            this.cell(root, x0, btnY, half, BTN_H, say.label, say.sub, null, false);
        } else {
            // **판정이 어느 버튼을 밝힐지 정한다.** 「이 종목은 아니다」라고 말해 놓고
            // 「권한다」를 제일 밝게 두면 화면이 스스로와 싸운다 — 실제로 그랬다.
            this.cell(root, x0, btnY, half, BTN_H,
                mine ? "근거를 대고 권한다" : "근거 없이 권한다",
                mine ? `${who}에게 · 현금 절반` : "틀리면 에너지가 크게 준다",
                () => this.d.onBuy(row.stock.id), mine && worthRecommending(v));
        }

        this.cell(root, x0 + half + 6, btnY, half, BTN_H,
            row.shares > 0 ? "지금 판다" : "가진 것이 없다",
            // 안 들고 있으면 부제가 없다 — 이름이 이미 그 말을 하고 있다.
            row.shares > 0
                ? `${row.shares}주 · ${row.pnlPct >= 0 ? "+" : ""}${row.pnlPct.toFixed(0)}%`
                : "",
            row.shares > 0 ? () => this.d.onSell(row.stock.id) : null, false);
    }

    private cell(
        parent: Phaser.GameObjects.Container,
        x: number, y: number, w: number, h: number,
        label: string, sub: string, onTap: (() => void) | null, primary: boolean,
    ): void {
        const { scene } = this.d;
        const f = fontOf(scene);
        const skin = skinOf(onTap !== null, primary);
        const faces = btnFace(scene, x, y, w, h, skin);
        for (const g of faces) parent.add(g);

        const labelT = mkText(scene, x + w / 2, y + 8, label, {
            fontFamily: f, fontSize: `${FS.sm}px`, color: skin.ink,
        }).setOrigin(0.5, 0);
        parent.add(labelT);
        const subT = mkText(scene, x + w / 2, y + 27, sub, {
            fontFamily: f, fontSize: `${FS.xs}px`, color: skin.sub,
        }).setOrigin(0.5, 0);
        parent.add(subT);

        if (!onTap) return;
        const { zone, shade } = pressable(scene, x, y, w, h, [...faces, labelT, subT], onTap);
        parent.add(shade); parent.add(zone);
    }
}

/**
 * 이 판이 제 몫을 하려면 최소 이만큼. `bandsOf` 의 바닥값이 이 값을 센다.
 *
 * **차트는 안 센다.** 차트는 남는 것을 쓰고 자리가 모자라면 아예 안 선다(`hasChart`).
 * 차트까지 바닥값에 넣으면 제일 짧은 격자에서 띠 예산이 41px 모자라 — 넷을 쌓을 수가
 * 없어진다. 반드시 서야 하는 것은 머리 · 판정 · 알아본다 · 체결 넷이다.
 */
export const SHEET_MIN = HEAD_H + 4 + VERDICT_H + 6 + ACT_H + 6 + BTN_H + 7;
