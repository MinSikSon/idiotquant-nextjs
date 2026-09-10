// 로그 — 무슨 일이 있었는지가 쌓이는 채팅창.
//
// ── 왜 한 줄짜리 뉴스가 아니라 이것인가 ─────────────────────────
// 예전에는 화면 맨 위에 한 줄이 있었고 다음 일이 일어나면 덮였다. 그래서 "얼마에 샀고
// 수수료를 얼마 냈는지" 를 보려면 그 순간을 놓치지 않아야 했고, 놓치면 영영 못 봤다.
//
// 지금은 **쌓인다.** 새 줄이 아래에 붙고 오래된 것이 위로 밀려 나간다 — 채팅창과 같다.
// 밀려 나간 줄도 사라지지는 않아서 드래그로 되감을 수 있고, 칸을 톡 누르면 화면 가득
// 펼쳐진다(`onOpen`). 판 위의 이 칸은 석 줄이라 되감기만으로는 스무 줄을 못 읽는다.
//
// ── 긴 기록은 자르지 않고 접는다 ────────────────────────────────
// 한때는 칸을 넘는 글자를 「…」로 잘랐다. 줄 높이를 고르게 두어야 "몇 줄이 들어가는가"
// 를 셀 수 있고, 그래야 되감기가 줄 단위로 잡힌다는 이유였다.
//
// 그런데 **잘리는 쪽이 대개 값이었다.** 「현대전자에게 240주를 권했다. 근거는 「반도체…」
// — 무엇을 근거로 권했는지가 통째로 사라진다. 로그는 그것을 보라고 있는 자리다.
//
// 접어도 줄 높이는 여전히 고르다. 세는 단위가 **기록 하나에서 줄 하나로** 바뀔 뿐이라,
// 되감기도 그대로 줄 단위다. 접는 셈은 `theme.wrapCells` 가 한다.
//
// 이 파일은 **무엇을 적을지 모른다.** 줄과 갈래를 받아 그릴 뿐이라, 로그를 하나 더
// 남기고 싶을 때 여기를 안 고친다.

import Phaser from "phaser";
import { C, S, FS, LOG, cells, fontOf, mkText, pxOf, wrapCells, type LogKind } from "@/lib/game/ui/theme";

export interface LogEntry {
    /**
     * 몇 턴에 있었던 일인가. **0 이면 턴 번호를 안 붙인다** — 판이 열리는 머리글과 턴의
     * 마디가 그렇다. 그 줄들은 자기가 몇 턴인지를 이미 문장으로 말한다.
     */
    turn: number;
    kind: LogKind;
    text: string;
}

export interface GameLogOpts {
    x: number;
    y: number;
    width: number;
    height: number;
    /**
     * 칸을 **톡 눌렀을 때**. 끌어서 되감는 것과 가른다 — 손가락이 움직였으면 안 부른다.
     *
     * 이 칸은 석 줄이라 여기서 읽을 수 있는 것은 방금 있었던 일뿐이다. 되감기는 있지만
     * 세 줄짜리 창으로 스무 줄을 훑는 것은 되감기가 아니라 고문이다.
     */
    onOpen?: () => void;
}

/** 이만큼 안 움직였으면 끈 것이 아니라 누른 것이다(설계 격자 기준). */
const TAP_SLOP = 6;

/**
 * 줄 하나가 차지하는 세로. 글자 높이에 숨 쉴 틈을 더한 값이다.
 *
 * 여유가 6 이면 글자를 12px 로 올렸을 때 칸에 들어가는 줄이 여섯에서 다섯으로 준다.
 * 매도 한 번이 네 줄이라 다섯 줄은 매매 한 번에 앞이 통째로 밀려 나가는 수다.
 */
const ROW = FS.xs + 5;
const PADX = 10;
const PADY = 8;
/** 줄 왼쪽의 색 조각 — 글자를 읽기 전에 갈래가 먼저 오게 한다. */
const CHIP_W = 3;
/** 접혀 내려온 줄을 이만큼 들여 쓴다. 같은 기록의 뒷줄이라는 것이 이것으로 보인다. */
const CONT_INDENT = 8;

/** 화면에 실제로 그려지는 줄 하나. 기록 하나가 여러 줄이 될 수 있다. */
interface Line {
    text: string;
    kind: LogKind;
    /** 앞줄에서 접혀 내려온 줄인가. */
    cont: boolean;
}

export class GameLog extends Phaser.GameObjects.Container {
    private readonly boxW: number;
    private readonly boxH: number;
    private readonly rows: number;

    private bg: Phaser.GameObjects.Graphics;
    private chips: Phaser.GameObjects.Graphics;
    private lines: Phaser.GameObjects.Text[] = [];
    private moreLabel: Phaser.GameObjects.Text;

    private entries: LogEntry[] = [];
    /** 접어 놓은 결과. **되감기도 그리기도 이것을 센다** — 기록이 아니라 줄이 단위다. */
    private view: Line[] = [];
    /** 바닥에서 몇 줄 위로 되감아 놨는가. 0 이면 가장 최근 줄이 맨 아래다. */
    private scroll = 0;
    /** 되감지 않은 동안 오른쪽 아래에 뜨는 말. 누를 데가 있다는 것을 이 두 글자가 말한다. */
    private readonly hint: string;

    constructor(scene: Phaser.Scene, o: GameLogOpts) {
        super(scene, o.x, o.y);
        this.boxW = o.width;
        this.boxH = o.height;
        this.rows = Math.max(1, Math.floor((this.boxH - PADY * 2) / ROW));
        this.hint = o.onOpen ? "전체 ▸" : "";

        // **면을 안 칠한다.** 회사 화면은 이 자리 뒤에 사무실 그림을 깔아 두므로,
        // 여기서 `C.panel` 로 채우면 그림이 통째로 가려진다 — 실제로 그랬다.
        // 아래 선 하나만 남긴다: 어디까지가 기록인지 그것이면 갈린다.
        this.bg = scene.add.graphics();
        this.bg.lineStyle(1, C.line, 1);
        this.bg.beginPath();
        this.bg.moveTo(0, this.boxH - 0.5);
        this.bg.lineTo(this.boxW, this.boxH - 0.5);
        this.bg.strokePath();

        this.chips = scene.add.graphics();

        // 줄은 **미리 만들어 두고 글자만 갈아 끼운다.** 매번 지웠다 만들면 로그가 쌓일수록
        // 턴을 넘길 때마다 수십 개의 Text 가 생겼다 사라진다.
        for (let i = 0; i < this.rows; i++) {
            const t = mkText(scene, PADX + CHIP_W + 6, PADY + i * ROW, "", {
                fontFamily: fontOf(scene), fontSize: `${FS.xs}px`, color: S.inkDim,
            });
            this.lines.push(t);
        }

        // 되감아 놓은 동안만 뜬다 — 지금 보는 것이 맨 아래가 아니라는 표시.
        this.moreLabel = mkText(scene, this.boxW - PADX, this.boxH - PADY - FS.xs, "", {
            fontFamily: fontOf(scene), fontSize: `${FS.xs}px`, color: S.gold,
        }).setOrigin(1, 0);

        this.add([this.bg, this.chips, ...this.lines, this.moreLabel]);

        // 드래그로 되감기. 한 줄 높이만큼 끌 때마다 한 줄씩 움직인다.
        const zone = scene.add.zone(0, 0, this.boxW, this.boxH).setOrigin(0, 0)
            .setInteractive({ useHandCursor: true, draggable: true });
        let anchor = 0;
        // 포인터의 x·y 는 **캔버스 좌표**라 설계 격자가 아니다. 버퍼를 기기 해상도로 잡은
        // 뒤로는 이 값이 배율만큼 크므로, 나눠서 설계 격자로 되돌린 뒤 줄 수를 센다.
        const k = pxOf(scene);
        zone.on("dragstart", () => { anchor = this.scroll; });
        zone.on("drag", (_p: Phaser.Input.Pointer, _x: number, _y: number) => {
            const dy = (_p.y - _p.downY) / k;
            this.setScroll(anchor + Math.round(dy / ROW));
        });
        // 끌지 않고 놓았으면 되감기가 아니라 "펼쳐 보겠다" 는 뜻이다.
        zone.on("pointerup", (p: Phaser.Input.Pointer) => {
            if (!o.onOpen) return;
            if (Math.abs(p.x - p.downX) / k > TAP_SLOP) return;
            if (Math.abs(p.y - p.downY) / k > TAP_SLOP) return;
            o.onOpen();
        });
        this.add(zone);

        scene.add.existing(this);
    }

    /** 이 칸에 몇 줄이 들어가는가. 씬이 로그를 몇 개까지 들고 있을지 정할 때 쓴다. */
    get visibleRows(): number {
        return this.rows;
    }

    /**
     * 로그 전부를 받아 다시 그린다. **가진 목록은 씬에 있다** — 화면을 돌리면 이 컨테이너가
     * 통째로 부서지므로, 여기에 들고 있으면 판이 도는 중에 로그가 날아간다.
     */
    setEntries(entries: LogEntry[], keepScroll = false): void {
        this.entries = entries;
        this.fold();
        if (!keepScroll) this.scroll = 0;   // 새 줄이 붙으면 바닥으로 따라 내려간다
        this.render();
    }

    /**
     * 기록을 줄로 편다. **여기서 한 번만 접는다** — 되감을 때마다 접으면 스무 줄을
     * 끌어 올리는 동안 같은 셈을 수백 번 한다.
     */
    private fold(): void {
        // **들여쓴 폭을 모든 줄에서 뺀다.** 뒷줄만 좁게 접으면 접는 자리가 줄마다 달라져
        // 셈이 두 벌이 된다 — 첫 줄 한 칸을 내주고 한 벌로 둔다.
        const room = Math.floor(
            (this.boxW - PADX * 2 - CHIP_W - 6 - CONT_INDENT) / (FS.xs * 0.6));
        this.view = [];
        for (const e of this.entries) {
            // 턴 번호는 첫 줄에만 붙는다 — 뒷줄은 같은 턴의 같은 문장이다.
            const whole = e.turn > 0 ? `${e.turn}턴 ${e.text}` : e.text;
            const folded = wrapCells(whole, room);
            for (let i = 0; i < folded.length; i++) {
                this.view.push({ text: folded[i], kind: e.kind, cont: i > 0 });
            }
        }
    }

    private setScroll(v: number): void {
        const max = Math.max(0, this.view.length - this.rows);
        const next = Math.max(0, Math.min(max, v));
        if (next === this.scroll) return;
        this.scroll = next;
        this.render();
    }

    private render(): void {
        this.chips.clear();

        // 오른쪽 아래 말을 **먼저** 정한다. 그것이 차지한 폭만큼 마지막 줄이 짧아져야
        // 하는데, 나중에 정하면 그 폭을 모른 채 줄을 자르게 되어 둘이 겹쳐 찍힌다.
        this.moreLabel.setText(this.scroll > 0 ? `↓ ${this.scroll}` : this.hint);
        const gutter = this.moreLabel.text ? this.moreLabel.displayWidth + 8 : 0;

        const end = this.view.length - this.scroll;
        const start = Math.max(0, end - this.rows);
        const shown = this.view.slice(Math.max(0, start), Math.max(0, end));
        // 줄이 아직 몇 개 없으면 **아래에 붙인다.** 위에서부터 채우면 빈 칸이 아래에 남아
        // 채팅창이 아니라 목록처럼 보인다.
        const top = this.rows - shown.length;

        this.lines.forEach((t, i) => {
            const ln = shown[i - top];
            if (!ln) { t.setText(""); return; }
            const skin = LOG[ln.kind];
            t.setX(PADX + CHIP_W + 6 + (ln.cont ? CONT_INDENT : 0));
            t.setText(i === this.rows - 1 ? this.clip(ln.text, gutter) : ln.text)
                .setColor(skin.ink);
            this.chips.fillStyle(skin.chip, 1)
                .fillRect(PADX, t.y + 2, CHIP_W, FS.xs + 1);
        });
    }

    /**
     * **맨 아랫줄만** 자른다. 되감는 동안 오른쪽 아래에 뜨는 「↓ n」과 겹치는 자리라
     * 여기서만 폭이 모자란다 — 되감기를 놓으면 그 표시가 사라지고 줄도 되돌아온다.
     */
    private clip(s: string, gutter: number): string {
        if (gutter <= 0) return s;
        const room = Math.floor((this.boxW - PADX * 2 - CHIP_W - 6 - gutter) / (FS.xs * 0.6));
        if (cells(s) <= room) return s;
        let used = 0;
        let n = 0;
        for (const ch of s) {
            const c = ch.charCodeAt(0) > 0x1100 ? 2 : 1;
            if (used + c > room - 1) break;
            used += c;
            n += ch.length;
        }
        return `${s.slice(0, n)}…`;
    }
}
