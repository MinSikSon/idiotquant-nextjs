// 캔들 차트 — 도트 격자 위에 그린다.
//
// Graphics 하나로 다 그리는 이유: 캔들은 사각형 하나와 선 하나가 전부라 차트 라이브러리가
// 할 일이 없고, 캔버스 게임 위에 DOM 차트를 겹치면 구조가 꼬인다.
//
// 매 턴 `render()` 를 다시 부른다. 12봉짜리라 통째로 다시 그려도 싸다.
//
// ── 이 차트에는 **글자가 없다** ────────────────────────────────────
// 고가·저가·현재가·국면을 네 귀퉁이에 적던 때가 있었다. 그런데 그 넷이 전부 다른
// 자리에 이미 있다 — 현재가는 바로 위 머리줄에, 국면은 아래 판정 칸에(`StockSheet`),
// 고가·저가는 **봉의 모양 자체가** 말한다. 같은 값을 두 번 적으면 화면만 시끄럽고,
// 어느 쪽을 봐야 하는지가 오히려 흐려진다.
//
// 이동평균선도 같이 뺐다. **이 게임의 어떤 규칙도 이동평균을 안 읽는다** — 판단은
// 국면과 베타에서 나오고(`core/research.ts` 의 `verdictOf`), 추세는 봉이 이미 말한다.
// 게다가 5일선인데 프롤로그는 봉이 여섯뿐이라 점 두 개짜리 토막으로 떴다.
// **정보처럼 생겼지만 아무것도 안 알려 주는 선**이 제일 나쁘다.
//
// 남은 것은 그림뿐이다: 봉과 지금 값의 가로 점선. 숫자로 읽을 것은 전부 검은 줄이
// 지고, 여기는 **모양으로 읽는다.**

import Phaser from "phaser";
import type { Candle, MarketRead } from "@/lib/game/core/types";
import { C, S, FS, fontOf, mkText } from "@/lib/game/ui/theme";

/** 화면에 남기는 봉의 수. 한 판이 12턴이라 판 전체가 한눈에 들어온다. */
export const VISIBLE_BARS = 12;

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

        this.ghostLabels = [0, 1].map(() => mk("left").setColor(S.inkDim).setVisible(false));

        this.add([this.frame, this.plot, ...this.ghostLabels]);
        scene.add.existing(this);

        this.drawFrame();
    }

    /** 브라운관 바탕과 도트 격자. 값이 바뀌어도 이건 안 바뀐다 — 한 번만 그린다. */
    private drawFrame() {
        const g = this.frame;
        g.clear();
        g.fillStyle(C.screen, 1).fillRect(0, 0, this.boxW, this.boxH);
        // 테두리와 격자는 **검은 화면 안의 색**이다. 회색 면의 모서리(`C.line`)를 여기
        // 쓰면 CRT 위에서 은색 테가 되어 봉보다 밝아진다.
        g.lineStyle(1, C.grid, 1).strokeRect(0.5, 0.5, this.boxW - 1, this.boxH - 1);

        // 도트 격자 — 선이 아니라 점이라야 이 시대 화면이 된다.
        g.fillStyle(C.grid, 1);
        for (let gy = 12; gy < this.boxH - 8; gy += 12) {
            for (let gx = 8; gx < this.boxW - 6; gx += 12) {
                g.fillRect(gx, gy, 1, 1);
            }
        }
    }

    /**
     * @param history 봉 전체. 뒤에서 VISIBLE_BARS 개만 그린다.
     * @param read    읽어 낸 것. **예보의 유령 봉에만 쓴다** — 국면은 글자로 안 적는다.
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
    }
}
