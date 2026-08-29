// ① 준비 — 무엇을 하는 게임인지 읽고 들어간다.
//
// 종목은 여기서 뽑는다. 뽑는 데 왕복이 둘 걸려서(후보 목록 → 일봉) 누르고 나면 잠깐 기다리는데,
// 그 사이를 빈 화면으로 두면 눌린 건지 아닌지 알 수 없다 — 버튼 글자가 대신 말한다.

import Phaser from "phaser";
import { C, S, W, H, FS, PAD } from "../theme";
import { label, win, sunken, statLine, button, money, pct, pnlColor, phaseBar } from "../ui";
import { loadRound, resumeRound, dropRound, bestReturn } from "../data";
import { SEED, BUY_FEE_NUM, SELL_FEE_NUM, SELL_TAX_NUM } from "@/lib/paper/engine";
import { TOTAL_DAYS, CONTEXT_DAYS } from "@/lib/paper/round";

const bp = (num: number) => (num / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");

export class ReadyScene extends Phaser.Scene {
    constructor() { super("ready"); }

    create() {
        this.cameras.main.setBackgroundColor(C.bg);

        const x = PAD, w = W - PAD * 2;

        // ── 표제 ──────────────────────────────────────────
        // 픽셀 폰트는 크기와 실제 줄 높이가 꽤 다르다. 눈대중으로 더하면 큰 글자에서
        // 겹치므로, 그린 것의 높이를 재서 쌓는다.
        let y = phaseBar(this, x, 6, w, "ready") + 16;
        y += label(this, W / 2, y, "블라인드 차트",
            { size: FS.xl, color: S.inkHi, bold: true, align: "center" }).height + 6;
        y += label(this, W / 2, y, "어느 종목인지 모르는 채로 굴린다",
            { size: FS.md, color: S.inkDim, align: "center" }).height + 28;

        // ── 이번 판 ───────────────────────────────────────
        const panelH = 132;
        let iy = win(this, x, y, w, panelH, "이번 판 / BRIEFING");
        const ix = x + PAD + 4, iw = w - (PAD + 4) * 2;
        sunken(this, x + PAD, iy, w - PAD * 2, 90);
        iy += 9;
        statLine(this, ix, iy, iw, "굴릴 돈", `${money(SEED)}원`);
        iy += 21;
        statLine(this, ix, iy, iw, "판 길이", `${TOTAL_DAYS - CONTEXT_DAYS + 1}일`);
        iy += 21;
        statLine(this, ix, iy, iw, "먼저 보는 구간", `앞 ${CONTEXT_DAYS}일`);
        iy += 21;
        statLine(this, ix, iy, iw, "가려진 것", "종목명 · 시기", S.ink);

        // ── 규칙 세 줄 ────────────────────────────────────
        y += panelH + 14;
        const rules = [
            `앞 ${CONTEXT_DAYS}일을 먼저 보고, 거기서부터 하루씩 넘깁니다.`,
            `사고파는 것도 하루가 지나갑니다. 그날 종가로 체결됩니다.`,
            `수수료 ${bp(BUY_FEE_NUM)}%, 매도 거래세 ${bp(SELL_TAX_NUM)}%. 마지막 날 자동 청산.`,
        ];
        for (const line of rules) {
            const t = label(this, x + 2, y, `· ${line}`, { size: FS.md, color: S.inkHi, wrap: w - 8 });
            y += t.height + 12;
        }

        // ── 최고 기록 ─────────────────────────────────────
        // 없을 때도 칸을 띄운다. 이 게임이 무엇을 재는지 알려 주는 자리라, 비어 있는 것도
        // 말이 된다 — 칸째로 없으면 겨룰 것이 있다는 사실 자체가 안 보인다.
        const best = bestReturn();
        y += 10;
        sunken(this, x, y, w, 26);
        statLine(this, x + PAD, y + 7, w - PAD * 2, "최고 기록",
            best === null ? "아직 없음" : pct(best),
            best === null ? S.inkDim : pnlColor(best));
        // 검은 바탕 위 글자다 — 몸통 위에서 쓰는 흐린 먹색(inkDim)은 여기서 안 보인다.
        y += 40;
        label(this, x + 2, y, "기록은 이 기기에만 남습니다.", { size: FS.sm, color: "#6f7d77" });

        // ── 시작 ─────────────────────────────────────────
        // 굴리다 만 판이 있으면 그걸 먼저 권한다 — 새로 뽑으면 그 판은 사라진다.
        const saved = resumeRound();
        const btnY = H - PAD - 52 - (saved ? 34 : 0);

        const go = button(this, x, btnY, w, 52,
            saved ? "▶ 굴리던 판 이어서" : "▶ 시작", () => {
                if (saved) { this.scene.start("play", { round: saved }); return; }
                void this.begin(go);
            }, { tone: "go", size: FS.lg });

        if (saved) {
            button(this, x, btnY + 58, w, 30, "새 판으로 시작", () => {
                dropRound();
                void this.begin(go);
            }, { size: FS.md });
        }
    }

    /** 종목을 뽑아 판을 연다. 실패하면 그 자리에서 다시 누를 수 있게 둔다. */
    private async begin(go: ReturnType<typeof button>) {
        go.setDisabled(true);
        go.setText("종목을 고르는 중…");
        try {
            const round = await loadRound();
            if (!round) {
                go.setText("판을 못 만들었습니다 — 다시");
                go.setDisabled(false);
                return;
            }
            this.scene.start("play", { round });
        } catch {
            go.setText("불러오지 못했습니다 — 다시");
            go.setDisabled(false);
        }
    }
}
