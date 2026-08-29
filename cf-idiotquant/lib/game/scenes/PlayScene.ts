// ② 시작 — 하루씩 넘기며 사고판다.
//
// 규칙은 여기 없다. 체결·수수료·청산은 lib/paper/localRound.ts 의 advanceLocal 이 그대로
// 한다(화면 판과 같은 함수, 같은 테스트). 이 파일이 하는 일은 **누른 것을 수량으로 바꿔
// 넘기고, 돌아온 판을 다시 그리는 것**뿐이다.
//
// 그래서 나중에 공매도나 예약을 붙일 때도 규칙은 저쪽에서 오고 여기는 버튼 한 줄만 는다.

import Phaser from "phaser";
import { C, S, W, H, FS, PAD } from "../theme";
import { label, win, sunken, crt, statLine, button, money, pct, pnlColor, phaseBar, type Btn } from "../ui";
import { drawCandles, type Mark } from "../chart";
import { advanceLocal, giveUpLocal } from "@/lib/paper/localRound";
import { CONTEXT_DAYS, type ReplayRound } from "@/lib/paper/round";
import { partBuyQty, sellPartQty } from "@/lib/paper/sizing";

/** 살 때는 내 돈의 몇 %, 팔 때는 보유의 몇 %. 주식 수를 손으로 적는 것보다 이쪽이 실제로
 *  하는 생각("반은 실어 보자")에 가깝고, 폰에서 한 손으로 굴러간다. */
const BUY_PARTS = [25, 50, 100];
const SELL_PARTS = [50, 100];

export class PlayScene extends Phaser.Scene {
    private round!: ReplayRound;
    private busy = false;

    private chart!: Phaser.GameObjects.Graphics;
    private day!: Phaser.GameObjects.Text;
    private price!: Phaser.GameObjects.Text;
    private acct: Phaser.GameObjects.Text[] = [];
    private buys: Btn[] = [];
    private sells: Btn[] = [];
    private toast?: Phaser.GameObjects.Text;

    // 차트가 앉는 자리. 하루가 지날 때마다 이 안만 다시 그린다.
    private cx = 0; private cy = 0; private cw = 0; private ch = 0;

    constructor() { super("play"); }

    init(data: { round: ReplayRound }) {
        this.round = data.round;
        this.busy = false;
        this.acct = []; this.buys = []; this.sells = [];
    }

    create() {
        this.cameras.main.setBackgroundColor(C.bg);
        const x = PAD, w = W - PAD * 2;

        const top = phaseBar(this, x, 6, w, "play");

        // ── 차트 창 ───────────────────────────────────────
        // 이 화면의 주인공이라 남는 세로를 여기에 몰아준다.
        const chartH = 252;
        const inner = win(this, x, top, w, chartH, "블라인드 차트", "");
        this.day = label(this, x + w - PAD - 4, top + 6, "", {
            size: FS.md, color: S.neon, align: "right", bold: true,
        });

        this.cx = x + PAD; this.cy = inner; this.cw = w - PAD * 2;
        this.ch = top + chartH - PAD - inner + 2;
        crt(this, this.cx, this.cy, this.cw, this.ch);
        this.chart = this.add.graphics();

        // ── 계좌 ─────────────────────────────────────────
        const accY = top + chartH + 8;
        const accH = 98;
        let ay = win(this, x, accY, w, accH, "계좌 / ACCOUNT");
        this.price = label(this, x + w - PAD - 4, accY + 6, "", {
            size: FS.md, color: S.neon, align: "right", bold: true,
        });
        sunken(this, x + PAD, ay, w - PAD * 2, 66);
        ay += 7;
        const lx = x + PAD + 4, lw = w - (PAD + 4) * 2;
        // 줄 간격은 글자 크기보다 넉넉해야 한다 — 딱 맞추면 마지막 줄이 파인 칸을 넘는다.
        const ROW = 18;
        for (let i = 0; i < 3; i++) {
            this.acct.push(label(this, lx, ay + i * ROW, "", { size: FS.md, color: S.inkDim }));
            this.acct.push(label(this, lx + lw, ay + i * ROW, "", {
                size: FS.md, color: S.ink, bold: true, align: "right",
            }));
        }

        // ── 매매 ─────────────────────────────────────────
        const btnY = accY + accH + 8;
        const bh = 36, gap = 4;
        const CAP = 17;   // 작은 이름줄이 차지하는 높이

        label(this, x, btnY, "사기", { size: FS.sm, color: S.inkDim });
        const rowY = btnY + CAP;
        const bw = Math.floor((w - gap * (BUY_PARTS.length - 1)) / BUY_PARTS.length);
        BUY_PARTS.forEach((p, i) => {
            this.buys.push(button(this, x + (bw + gap) * i, rowY, bw, bh,
                p === 100 ? "전부" : `${p}%`, () => this.trade("buy", p)));
        });

        label(this, x, rowY + bh + 8, "팔기", { size: FS.sm, color: S.inkDim });
        const row2 = rowY + bh + 8 + CAP;
        const sw = Math.floor((w - gap) / 2);
        SELL_PARTS.forEach((p, i) => {
            this.sells.push(button(this, x + (sw + gap) * i, row2, sw, bh,
                p === 100 ? "전부" : "절반", () => this.trade("sell", p)));
        });

        // 관망 — 시간이 흐르는 유일한 다른 길. 가장 크게 둔다.
        button(this, x, row2 + bh + 8, w, 44, "관망 — 하루 넘기기 ▶",
            () => this.trade(null, 0), { tone: "go", size: FS.lg });

        // 판을 버리고 나가는 문. 눈에 띄면 안 되지만 없어도 안 된다.
        button(this, x, H - PAD - 24, w, 24, "그만두고 결과 보기", () => this.giveUp(), { size: FS.sm });

        this.paint();
    }

    /** 지금 보이는 마지막 캔들의 종가 — 모든 체결이 이 값으로 난다. */
    private get today(): number {
        return this.round.candles[this.round.cursor - 1]?.c ?? 0;
    }

    private paint() {
        const r = this.round;
        const price = this.today;
        const equity = r.cash + r.qty * price;
        const rate = ((equity - r.seed) / r.seed) * 100;

        const marks: Mark[] = r.orders.map(o => ({
            index: o.day_index, side: o.side === "sell" ? "sell" : "buy",
        }));
        drawCandles(this.chart, r.candles, r.cursor, this.cx, this.cy, this.cw, this.ch,
            { ctxDays: CONTEXT_DAYS, marks });

        const total = r.total_days ?? r.candles.length;
        this.day.setText(`DAY ${r.cursor - CONTEXT_DAYS + 1}/${total - CONTEXT_DAYS + 1}`);
        this.price.setText(`₩${price.toLocaleString()}`);

        const rows: [string, string, string][] = [
            ["내 돈", `${money(equity)}원`, S.ink],
            ["현금", `${money(r.cash)}원`, S.ink],
            ["보유", r.qty > 0 ? `${r.qty}주 · ${pct(rate)}` : "없음", r.qty > 0 ? pnlColor(rate) : S.inkDim],
        ];
        rows.forEach(([k, v, col], i) => {
            this.acct[i * 2].setText(k);
            this.acct[i * 2 + 1].setText(v).setColor(col);
        });

        // 못 하는 것은 잠근다 — 눌러 보고 나서 안 된다고 듣는 것보다 낫다.
        for (const b of this.buys) b.setDisabled(this.busy || r.cash < price || price <= 0);
        for (const b of this.sells) b.setDisabled(this.busy || r.qty <= 0);
    }

    private say(msg: string, tone: string = S.pink) {
        this.toast?.destroy();
        this.toast = label(this, W / 2, H - PAD - 46, msg, {
            size: FS.md, color: tone, align: "center", bold: true,
        });
        this.time.delayedCall(1600, () => { this.toast?.destroy(); this.toast = undefined; });
    }

    /** part 가 0 이면 관망이다 — 매매 없이 하루만 넘긴다. */
    private trade(side: "buy" | "sell" | null, part: number) {
        if (this.busy) return;
        const r = this.round;
        const price = this.today;

        let order: { side: "buy" | "sell"; qty: number } | null = null;
        if (side === "buy") {
            const qty = partBuyQty({ pct: part, price, cash: r.cash, totalAssets: r.cash + r.qty * price });
            if (qty < 1) { this.say("살 수 있는 수량이 없습니다."); return; }
            order = { side, qty };
        } else if (side === "sell") {
            const qty = sellPartQty(r.qty, part);
            if (qty < 1) { this.say("팔 수 있는 수량이 없습니다."); return; }
            order = { side, qty };
        }

        this.busy = true;
        const res = advanceLocal(r, order);
        if (!res.ok) { this.busy = false; this.say(res.error); return; }

        this.round = res.round;
        if (res.done) { this.scene.start("result", { round: res.round }); return; }

        this.busy = false;
        this.paint();
        if (order) {
            this.say(`${order.qty}주 ${order.side === "buy" ? "샀습니다" : "팔았습니다"}.`,
                order.side === "buy" ? "#ff6b6b" : "#7aa2ff");
        }
    }

    /**
     * 중도 포기도 판이 끝난 것이다 — **그날 종가로** 청산하고 같은 결과 화면으로 간다.
     *
     * 커서를 마지막 날로 밀어 advanceLocal 을 부르면 안 된다. 그건 포기가 아니라 남은 날을
     * 건너뛰고 마지막 종가에 파는 것이라, 아직 안 본 캔들의 값으로 청산된다.
     */
    private giveUp() {
        if (this.busy) return;
        this.busy = true;
        this.scene.start("result", { round: giveUpLocal(this.round) });
    }
}
