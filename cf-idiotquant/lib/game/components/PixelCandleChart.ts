// 캔들 차트 — 도트 격자 위에 그린다.
//
// Graphics 하나로 다 그리는 이유: 캔들은 사각형 하나와 선 하나가 전부라 차트 라이브러리가
// 할 일이 없고, 캔버스 게임 위에 DOM 차트를 겹치면 구조가 꼬인다.
//
// 매 턴 `render()` 를 다시 부른다. 12봉짜리라 통째로 다시 그려도 싸다.

import Phaser from "phaser";
import type { Candle, MarketRead } from "@/lib/game/core/types";
import { regimeLabel } from "@/lib/game/core/StockEngine";
import { C, S, FS, fontOf } from "@/lib/game/ui/theme";

/** 화면에 남기는 봉의 수. 한 판이 12턴이라 판 전체가 한눈에 들어온다. */
export const VISIBLE_BARS = 12;
/** 이동평균 구간. */
const MA_PERIOD = 5;

export interface ChartOpts {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class PixelCandleChart extends Phaser.GameObjects.Container {
    // Phaser 4 의 Container 가 w·h·body 를 이미 갖고 있다. 같은 이름을 쓰면 부모의
    // 것을 덮어써서 컨테이너가 망가지므로, 이 클래스의 것은 다른 이름으로 둔다.
    private readonly boxW: number;
    private readonly boxH: number;

    private frame: Phaser.GameObjects.Graphics;
    private plot: Phaser.GameObjects.Graphics;
    private hiLabel: Phaser.GameObjects.Text;
    private loLabel: Phaser.GameObjects.Text;
    private nowLabel: Phaser.GameObjects.Text;
    /** 읽어 낸 국면. 카드를 써야 채워진다. */
    private readLabel: Phaser.GameObjects.Text;
    /** 유령 봉이 몇 턴 뒤인지(+1 · +2). 예보의 지속을 그림으로 말한다. */
    private ghostLabels: Phaser.GameObjects.Text[] = [];

    constructor(scene: Phaser.Scene, o: ChartOpts) {
        super(scene, o.x, o.y);
        this.boxW = o.width;
        this.boxH = o.height;

        this.frame = scene.add.graphics();
        this.plot = scene.add.graphics();

        const mk = (align: "left" | "right") =>
            scene.add.text(0, 0, "", { fontFamily: fontOf(scene), fontSize: `${FS.xs}px`, color: S.inkDim })
                .setOrigin(align === "right" ? 1 : 0, 0);

        this.hiLabel = mk("left");
        this.loLabel = mk("left");
        this.nowLabel = mk("right");
        this.readLabel = mk("right").setColor(S.gold);
        this.ghostLabels = [0, 1].map(() => mk("left").setColor(S.inkDim).setVisible(false));

        this.add([this.frame, this.plot, this.hiLabel, this.loLabel, this.nowLabel, this.readLabel, ...this.ghostLabels]);
        scene.add.existing(this);

        this.drawFrame();
    }

    /** 브라운관 바탕과 도트 격자. 값이 바뀌어도 이건 안 바뀐다 — 한 번만 그린다. */
    private drawFrame() {
        const g = this.frame;
        g.clear();
        g.fillStyle(C.screen, 1).fillRect(0, 0, this.boxW, this.boxH);
        g.lineStyle(1, C.line, 1).strokeRect(0.5, 0.5, this.boxW - 1, this.boxH - 1);

        // 도트 격자 — 선이 아니라 점이라야 이 시대 화면이 된다.
        g.fillStyle(C.line, 0.55);
        for (let gy = 12; gy < this.boxH - 8; gy += 12) {
            for (let gx = 8; gx < this.boxW - 6; gx += 12) {
                g.fillRect(gx, gy, 1, 1);
            }
        }
    }

    /**
     * @param history 봉 전체. 뒤에서 VISIBLE_BARS 개만 그린다.
     * @param read    카드로 **읽어 낸 것**. 예보는 마지막 봉 다음에 유령 봉으로 그리고,
     *                국면은 모서리에 쓴다. 뉴스 줄에 띄우지 않는 이유는 그 줄이 매매
     *                한 번에 덮이기 때문이다 — 크기를 정하는 동안 보여야 할 정보다.
     */
    render(history: readonly Candle[], read?: MarketRead | null): void {
        const g = this.plot;
        g.clear();

        const bars = history.slice(-VISIBLE_BARS);
        if (bars.length === 0) return;

        const padX = 10, padY = 16;
        const left = padX, right = this.boxW - padX;
        const top = padY, bottom = this.boxH - padY;

        let lo = Infinity, hi = -Infinity;
        for (const b of bars) {
            if (b.l < lo) lo = b.l;
            if (b.h > hi) hi = b.h;
        }
        const span = hi - lo || 1;
        const py = (v: number) => bottom - ((v - lo) / span) * (bottom - top);

        // 칸은 **항상 12개**로 나눈다. 봉 개수로 나누면 턴이 갈 때마다 폭이 변해
        // 차트 전체가 좌우로 요동친다.
        const peek = read?.next ?? [];
        // 예보가 있으면 그만큼 칸을 더 나눈다. 유령 봉이 화면 밖으로 나가면 안 된다.
        const slots = VISIBLE_BARS + Math.min(2, peek.length);
        const step = (right - left) / slots;
        const bodyW = Math.max(3, Math.floor(step * 0.58));

        // 이동평균 — 봉보다 먼저 그려 뒤에 깔린다.
        const closes = bars.map(b => b.c);
        if (closes.length >= MA_PERIOD) {
            g.lineStyle(1, C.gold, 0.9);
            g.beginPath();
            let started = false;
            for (let i = MA_PERIOD - 1; i < closes.length; i++) {
                let sum = 0;
                for (let k = 0; k < MA_PERIOD; k++) sum += closes[i - k]!;
                const mx = left + step * i + step / 2;
                const my = py(sum / MA_PERIOD);
                if (started) g.lineTo(mx, my);
                else { g.moveTo(mx, my); started = true; }
            }
            g.strokePath();
        }

        // 캔들
        for (let i = 0; i < bars.length; i++) {
            const b = bars[i]!;
            const cx = Math.round(left + step * i + step / 2);
            const up = b.c >= b.o;
            const col = up ? C.up : C.down;

            g.lineStyle(1, col, 1);
            g.beginPath();
            g.moveTo(cx + 0.5, Math.round(py(b.h)) + 0.5);
            g.lineTo(cx + 0.5, Math.round(py(b.l)) + 0.5);
            g.strokePath();

            const yo = py(b.o), yc = py(b.c);
            const bh = Math.max(2, Math.abs(yc - yo));
            g.fillStyle(col, 1);
            g.fillRect(cx - Math.floor(bodyW / 2), Math.round(Math.min(yo, yc)), bodyW, Math.round(bh));
        }

        // ── 예보 — 아직 오지 않은 봉을 유령으로 그린다 ──────────────────
        // 이 게임의 정보 카드가 값어치를 갖는 자리다. 뉴스 한 줄로 "다음 턴 상승" 이라고
        // 말해 주는 것과, 지금 보고 있는 차트에 그 봉이 미리 서 있는 것은 다른 일이다.
        for (const gl of this.ghostLabels) gl.setVisible(false);
        if (peek.length > 0) {
            let ghostFrom = bars[bars.length - 1]!.c;
            for (let k = 0; k < Math.min(2, peek.length); k++) {
                const pct = peek[k]!;
                const to = Math.max(1, ghostFrom * (1 + pct / 100));
                const cx = Math.round(left + step * (bars.length + k) + step / 2);
                const col = pct >= 0 ? C.up : C.down;

                const yFrom = py(ghostFrom), yTo = py(to);
                const bh = Math.max(2, Math.abs(yTo - yFrom));
                // 테두리만 — 채우면 진짜 봉과 헷갈린다. 아직 안 온 것이어야 한다.
                g.lineStyle(1, col, 0.85);
                g.strokeRect(
                    cx - Math.floor(bodyW / 2) + 0.5, Math.round(Math.min(yFrom, yTo)) + 0.5,
                    bodyW - 1, Math.round(bh),
                );
                // 몇 턴 뒤인지 — 예보가 언제까지 유효한지를 그림 옆에 적어 둔다.
                const gl = this.ghostLabels[k];
                if (gl) {
                    gl.setVisible(true)
                        .setPosition(cx - Math.floor(bodyW / 2), this.boxH - FS.xs - 4)
                        .setText(`+${k + 1}`)
                        .setColor(pct >= 0 ? S.up : S.down);
                }
                ghostFrom = to;
            }
        }

        // 마지막 봉의 종가에 가로 점선 — "지금 얼마" 가 한눈에 들어와야 한다.
        const last = bars[bars.length - 1]!;
        const ly = Math.round(py(last.c)) + 0.5;
        g.fillStyle(C.inkDim, 0.7);
        for (let dx = left; dx < right; dx += 6) g.fillRect(dx, ly, 3, 1);

        this.hiLabel.setPosition(4, 3).setText(hi.toLocaleString());
        this.loLabel.setPosition(4, this.boxH - FS.xs - 4).setText(lo.toLocaleString());
        this.nowLabel
            .setPosition(this.boxW - 4, Math.max(3, Math.min(this.boxH - FS.xs - 4, ly - FS.xs - 3)))
            .setText(last.c.toLocaleString())
            .setColor(last.c >= last.o ? S.up : S.down);

        // 읽어 낸 국면은 차트 오른쪽 위에. 남은 턴까지 읽었으면 함께 쓴다.
        const regime = read?.regime
            ? `국면 ${regimeLabel(read.regime)}${read.turnsLeft !== null && read.turnsLeft !== undefined
                ? ` · ${read.turnsLeft}턴 남음` : ""}`
            : "";
        this.readLabel.setPosition(this.boxW - 4, 3).setText(regime);
    }
}
