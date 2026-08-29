// 캔들 차트 — 브라운관 안에 그린다.
//
// 화면(HTML)판은 recharts 를 썼는데 여기서는 Graphics 로 직접 그린다. 캔들은 사각형 하나와
// 선 하나가 전부라 라이브러리를 얹을 이유가 없고, 게임 화면에 recharts 를 끌어오면 캔버스
// 위에 DOM 을 겹치는 이상한 구조가 된다.
//
// **공개된 만큼만 그린다.** 이 게임의 전부가 "앞날을 모른다" 라서, 그리는 쪽에서 cursor 를
// 넘겨 그리면 규칙이 아무리 맞아도 판이 무너진다.

import Phaser from "phaser";
import { C } from "./theme";
import type { Candle } from "@/lib/paper/round";

export interface Mark {
    /** 캔들 번호(0부터) */
    index: number;
    side: "buy" | "sell";
}

/**
 * @param upto 여기까지만 그린다(캔들 개수). cursor 를 그대로 넘기면 된다.
 * @param ctxDays 미리 보여 준 구간. 그 경계에 세로선을 그어 "여기서부터 내 판" 을 표시한다.
 */
export function drawCandles(
    g: Phaser.GameObjects.Graphics,
    candles: Candle[], upto: number,
    x: number, y: number, w: number, h: number,
    opts: { ctxDays?: number; marks?: Mark[] } = {},
) {
    g.clear();

    const shown = candles.slice(0, Math.max(1, Math.min(upto, candles.length)));
    if (shown.length === 0) return;

    // 위아래 여백. 캔들이 테두리에 붙으면 고가·저가를 읽을 수 없다.
    const padY = 8;
    const top = y + padY, bottom = y + h - padY;

    let lo = Infinity, hi = -Infinity;
    for (const c of shown) { if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; }
    const span = hi - lo || 1;
    const py = (v: number) => bottom - ((v - lo) / span) * (bottom - top);

    // 전체 판 길이로 칸을 나눈다 — 하루가 지날 때마다 캔들이 오른쪽으로 **자라야** 한다.
    // 공개된 개수로 나누면 매일 폭이 줄어들며 차트가 통째로 요동친다.
    const slots = Math.max(shown.length, candles.length || 1);
    const step = w / slots;
    const bodyW = Math.max(1, Math.floor(step * 0.62));

    // 가로 눈금 셋. 값을 못 읽어도 "지금 어디쯤" 은 보인다.
    g.lineStyle(1, C.inkDim, 0.35);
    for (let i = 1; i <= 3; i++) {
        const gy = Math.round(top + ((bottom - top) * i) / 4) + 0.5;
        g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.strokePath();
    }

    // 미리 보여 준 구간과 내가 굴리는 구간의 경계
    const ctx = opts.ctxDays ?? 0;
    if (ctx > 0 && ctx < slots) {
        const bx = Math.round(x + step * ctx) + 0.5;
        g.lineStyle(1, C.neon, 0.5);
        g.beginPath(); g.moveTo(bx, top - 4); g.lineTo(bx, bottom + 4); g.strokePath();
    }

    for (let i = 0; i < shown.length; i++) {
        const c = shown[i];
        const cx = Math.round(x + step * i + step / 2);
        const up = c.c >= c.o;
        const col = up ? C.up : C.down;

        // 꼬리
        g.lineStyle(1, col, 1);
        g.beginPath();
        g.moveTo(cx + 0.5, Math.round(py(c.h)) + 0.5);
        g.lineTo(cx + 0.5, Math.round(py(c.l)) + 0.5);
        g.strokePath();

        // 몸통. 시가와 종가가 같은 날은 1px 선으로 남는다(도지)
        const yo = py(c.o), yc = py(c.c);
        const bh = Math.max(1, Math.abs(yc - yo));
        g.fillStyle(col, 1);
        g.fillRect(cx - Math.floor(bodyW / 2), Math.round(Math.min(yo, yc)), bodyW, Math.round(bh));
    }

    // 내가 사고판 자리. 값이 아니라 **언제** 가 남아야 판이 끝나고 되짚을 수 있다.
    for (const m of opts.marks ?? []) {
        if (m.index < 0 || m.index >= shown.length) continue;
        const cx = Math.round(x + step * m.index + step / 2);
        const c = shown[m.index];
        const my = m.side === "buy" ? py(c.l) + 6 : py(c.h) - 6;
        g.fillStyle(m.side === "buy" ? C.up : C.down, 1);
        // 위아래를 가리키는 작은 삼각형
        const d = m.side === "buy" ? -1 : 1;
        g.beginPath();
        g.moveTo(cx, my);
        g.lineTo(cx - 4, my - d * 5);
        g.lineTo(cx + 4, my - d * 5);
        g.closePath();
        g.fillPath();
    }
}
