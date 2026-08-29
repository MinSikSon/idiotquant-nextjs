// ③ 종료 — 가려 뒀던 것이 열린다.
//
// 60일을 가린 끝에 이름이 나오는 자리라, 이 화면이 이 게임의 보상이다. 성적보다 이름을
// 먼저 크게 둔 것도 그래서다 — 숫자는 이미 계좌에서 보고 있었고, 종목은 여기서 처음 본다.

import Phaser from "phaser";
import { C, S, W, H, FS, PAD } from "../theme";
import { label, win, sunken, crt, statLine, button, money, pct, pnlColor, phaseBar } from "../ui";
import { drawCandles, type Mark } from "../chart";
import { CONTEXT_DAYS, type ReplayRound } from "@/lib/paper/round";
import { saveBest } from "../data";

/** "20190104" → "2019년 1월" */
function ym(d: string | null): string {
    if (!d || d.length < 6) return "";
    return `${d.slice(0, 4)}년 ${Number(d.slice(4, 6))}월`;
}

export class ResultScene extends Phaser.Scene {
    private round!: ReplayRound;

    constructor() { super("result"); }

    init(data: { round: ReplayRound }) { this.round = data.round; }

    create() {
        this.cameras.main.setBackgroundColor(C.bg);
        const r = this.round;
        const x = PAD, w = W - PAD * 2;

        const mine = r.final_return ?? 0;
        const bh = r.bh_return ?? 0;
        const edge = mine - bh;
        const isBest = saveBest(mine);

        // ── 성적 ─────────────────────────────────────────
        const top = phaseBar(this, x, 6, w, "result");
        const scoreH = 96;
        let sy = win(this, x, top, w, scoreH, "GAME OVER", isBest ? "새 기록" : "");
        crt(this, x + PAD, sy, w - PAD * 2, 62);
        label(this, x + PAD + 8, sy + 8, "내 수익률", { size: FS.sm, color: "#8fa39b" });
        label(this, x + PAD + 8, sy + 22, pct(mine), {
            size: FS.xl, color: mine >= 0 ? "#ff6b6b" : "#7aa2ff", bold: true,
        });
        label(this, x + w - PAD - 8, sy + 8, "그냥 들고 있기", { size: FS.sm, color: "#8fa39b", align: "right" });
        label(this, x + w - PAD - 8, sy + 26, pct(bh), {
            size: FS.lg, color: "#8fa39b", bold: true, align: "right",
        });

        // 이겼는지 졌는지를 한 줄로. 숫자 둘을 스스로 빼게 두면 아무도 안 뺀다.
        let y = top + scoreH + 8;
        const verdict = edge >= 0
            ? `그냥 들고 있는 것보다 ${edge.toFixed(2)}%p 더 벌었습니다.`
            : `그냥 들고 있는 편이 ${Math.abs(edge).toFixed(2)}%p 나았습니다.`;
        const vt = label(this, x + 2, y, verdict, {
            size: FS.md, color: pnlColor(edge), bold: true, wrap: w - 8,
        });
        y += vt.height + 8;

        // ── 열린 것 ───────────────────────────────────────
        const revealH = 84;
        let ry = win(this, x, y, w, revealH, "종목 공개 / REVEAL");
        sunken(this, x + PAD, ry, w - PAD * 2, 52);
        ry += 6;
        const lx = x + PAD + 4, lw = w - (PAD + 4) * 2;
        label(this, lx, ry, r.name ?? "이름 없음", { size: FS.lg, color: S.ink, bold: true });
        label(this, lx + lw, ry + 3, r.ticker ?? "", { size: FS.md, color: S.inkDim, align: "right" });
        ry += 22;
        statLine(this, lx, ry, lw, "시기", `${ym(r.start_date)} — ${ym(r.end_date)}`);
        y += revealH + 8;

        // ── 전체 차트 ─────────────────────────────────────
        // 이제 가릴 것이 없다. 내가 산 자리와 판 자리가 어디였는지를 전부 위에서 본다.
        const chartH = 240;
        const cy = win(this, x, y, w, chartH, "지나온 길");
        const cx = x + PAD, cw = w - PAD * 2, ch = y + chartH - PAD - cy + 2;
        crt(this, cx, cy, cw, ch);
        const marks: Mark[] = r.orders.map(o => ({
            index: o.day_index, side: o.side === "sell" ? "sell" : "buy",
        }));
        drawCandles(this.add.graphics(), r.candles, r.candles.length, cx, cy, cw, ch,
            { ctxDays: CONTEXT_DAYS, marks });
        y += chartH + 8;

        // ── 계산 ─────────────────────────────────────────
        sunken(this, x, y, w, 44);
        statLine(this, x + PAD, y + 6, w - PAD * 2, "굴린 돈", `${money(r.seed)}원 → ${money(r.cash)}원`);
        statLine(this, x + PAD, y + 22, w - PAD * 2, "낸 수수료·세금", `${money(r.fees_paid)}원`, S.inkDim);

        // ── 다시 ─────────────────────────────────────────
        button(this, x, H - PAD - 46, w, 46, "▶ 다시 한 판", () => this.scene.start("ready"),
            { tone: "go", size: FS.lg });
    }
}
