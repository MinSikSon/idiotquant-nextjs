// 캔들 차트 — 도트 격자 위에 그린다.
//
// Graphics 하나로 다 그리는 이유: 캔들은 사각형 하나와 선 하나가 전부라 차트 라이브러리가
// 할 일이 없고, 캔버스 게임 위에 DOM 차트를 겹치면 구조가 꼬인다.
//
// 매 턴 `render()` 를 다시 부른다. 12봉짜리라 통째로 다시 그려도 싸다.

import Phaser from "phaser";
import type { Candle, MarketRead } from "@/lib/game/core/types";
import { regimeLabel } from "@/lib/game/core/StockEngine";
import { C, S, FS, fontOf, mkText, pct } from "@/lib/game/ui/theme";

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
            mkText(scene, 0, 0, "", { fontFamily: fontOf(scene), fontSize: `${FS.xs}px`, color: S.inkDim })
                .setOrigin(align === "right" ? 1 : 0, 0);

        this.hiLabel = mk("left");
        this.loLabel = mk("left");
        this.nowLabel = mk("right");
        this.readLabel = mk("right").setColor(S.gold).setAlign("right").setLineSpacing(3);
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

        const peek = read?.next ?? [];

        // 유령 봉의 값을 **범위를 재기 전에** 낸다. 예보가 지금 보이는 폭을 넘어가는
        // 일이 흔한데(하루 −8% 면 바로 벗어난다), 범위에 안 넣으면 그 봉이 차트 밖에
        // 그려져 아래 유물 줄 위에 얹힌다. Graphics 에는 클리핑이 없다.
        const ghosts: number[] = [];
        let ghostFrom = bars[bars.length - 1]!.c;
        for (let k = 0; k < Math.min(2, peek.length); k++) {
            // 진짜 봉과 같이 **정수 원**으로 맞춘다. 이 값이 고·저가 라벨에도 들어가는데,
            // 반올림을 안 하면 차트 구석에 21,376.808 같은 값이 찍힌다 — 원 단위로 도는
            // 판에서 그건 없는 가격이다.
            ghostFrom = Math.max(1, Math.round(ghostFrom * (1 + peek[k]! / 100)));
            ghosts.push(ghostFrom);
        }

        let lo = Infinity, hi = -Infinity;
        for (const b of bars) {
            if (b.l < lo) lo = b.l;
            if (b.h > hi) hi = b.h;
        }
        for (const v of ghosts) {
            if (v < lo) lo = v;
            if (v > hi) hi = v;
        }
        const span = hi - lo || 1;
        const py = (v: number) => bottom - ((v - lo) / span) * (bottom - top);

        // 칸은 **항상 12개**로 나눈다. 봉 개수로 나누면 턴이 갈 때마다 폭이 변해
        // 차트 전체가 좌우로 요동친다.
        // 예보가 있으면 그만큼 칸을 더 나눈다. 유령 봉이 화면 밖으로 나가면 안 된다.
        const slots = VISIBLE_BARS + ghosts.length;
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
        if (ghosts.length > 0) {
            let ghostFrom = bars[bars.length - 1]!.c;
            for (let k = 0; k < ghosts.length; k++) {
                const pct = peek[k]!;
                const to = ghosts[k]!;
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
                    // 봉 바로 위에 붙인다. 아래 칸에 두면 저·고가 라벨과 종목 이름이
                    // 이미 앉아 있는 줄이라 글자끼리 겹친다.
                    const ly2 = Math.max(top + 1,
                        Math.min(bottom - FS.xs - 1, Math.min(yFrom, yTo) - FS.xs - 2));
                    gl.setVisible(true)
                        .setPosition(cx - Math.floor(bodyW / 2), ly2)
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

        // 읽어 낸 국면은 차트 오른쪽 위에. 읽은 깊이만큼 한 조각씩 붙는다.
        //
        // **기울기(턴당 평균 등락)가 첫 조각이다.** 예전에는 "국면 상승" 한 단어뿐이라,
        // 그 카드를 쓰고도 얼마나 걸어야 할지가 안 정해졌다 — 읽은 것이 값이 되려면
        // 단어가 숫자로 바뀌어야 한다.
        //
        // 다 벗겨진 3강은 조각이 넷이라 한 줄로는 차트를 가로지른다. **두 줄로 접는다** —
        // 지금 국면이 윗줄, 다음에 올 것이 아랫줄이다.
        const lines = readLines(read);
        this.readLabel.setPosition(this.boxW - 4, 3).setText(lines);

        // 지금 값은 국면 줄 **아래로** 밀어 둔다. 주가가 차트 위쪽에 붙은 판에서는 둘이
        // 같은 자리를 잡아 글자가 겹쳐 찍혔다.
        const readBottom = lines.length > 0 ? 3 + lines.length * (FS.xs + 3) : 3;
        this.nowLabel
            .setPosition(this.boxW - 4,
                Math.max(readBottom, Math.min(this.boxH - FS.xs - 4, ly - FS.xs - 3)))
            .setText(last.c.toLocaleString())
            .setColor(last.c >= last.o ? S.up : S.down);
    }
}

/**
 * 국면 줄. 못 읽은 조각은 그냥 빠지고, 다음 국면까지 읽었으면 둘째 줄로 내려간다.
 *
 * 말을 짧게 두는 것이 요점이다 — "국면"·"남음" 같은 말은 자리만 먹고, 그 자리가
 * 모자라면 차트의 고가·현재가와 부딪힌다.
 */
function readLines(read?: MarketRead | null): string[] {
    if (!read?.regime) return [];
    const now = [regimeLabel(read.regime)];
    if (read.regimeDrift !== null) now.push(`턴당 ${pct(read.regimeDrift)}`);
    if (read.turnsLeft !== null) now.push(`${read.turnsLeft}턴`);

    const out = [now.join(" · ")];
    if (read.nextRegime) {
        out.push(`다음 ${regimeLabel(read.nextRegime)}${read.nextDrift !== null ? ` ${pct(read.nextDrift)}` : ""}`);
    }
    return out;
}
