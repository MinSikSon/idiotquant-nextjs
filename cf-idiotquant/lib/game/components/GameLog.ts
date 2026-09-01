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
// ── 한 줄은 한 줄이다 ───────────────────────────────────────────
// 줄바꿈을 허용하면 줄 높이가 제각각이 되어 "몇 줄이 들어가는가" 를 셀 수 없고, 그러면
// 스크롤 위치를 줄 단위로 못 잡는다. 넘치는 글자는 잘라 낸다 — 로그는 읽는 것이지
// 보관하는 것이 아니다.
//
// 이 파일은 **무엇을 적을지 모른다.** 줄과 갈래를 받아 그릴 뿐이라, 로그를 하나 더
// 남기고 싶을 때 여기를 안 고친다.

import Phaser from "phaser";
import { C, S, FS, LOG, fontOf, mkText, pxOf, type LogKind } from "@/lib/game/ui/theme";

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

export class GameLog extends Phaser.GameObjects.Container {
    private readonly boxW: number;
    private readonly boxH: number;
    private readonly rows: number;

    private bg: Phaser.GameObjects.Graphics;
    private chips: Phaser.GameObjects.Graphics;
    private lines: Phaser.GameObjects.Text[] = [];
    private moreLabel: Phaser.GameObjects.Text;

    private entries: LogEntry[] = [];
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

        this.bg = scene.add.graphics();
        this.bg.fillStyle(C.panel, 1).fillRect(0, 0, this.boxW, this.boxH);
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
        if (!keepScroll) this.scroll = 0;   // 새 줄이 붙으면 바닥으로 따라 내려간다
        this.render();
    }

    private setScroll(v: number): void {
        const max = Math.max(0, this.entries.length - this.rows);
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

        const end = this.entries.length - this.scroll;
        const start = Math.max(0, end - this.rows);
        const shown = this.entries.slice(start, end);
        // 줄이 아직 몇 개 없으면 **아래에 붙인다.** 위에서부터 채우면 빈 칸이 아래에 남아
        // 채팅창이 아니라 목록처럼 보인다.
        const top = this.rows - shown.length;

        this.lines.forEach((t, i) => {
            const e = shown[i - top];
            if (!e) { t.setText(""); return; }
            const skin = LOG[e.kind];
            t.setText(this.fit(e.turn > 0 ? `${e.turn}턴 ${e.text}` : e.text,
                i === this.rows - 1 ? gutter : 0))
                .setColor(skin.ink);
            this.chips.fillStyle(skin.chip, 1)
                .fillRect(PADX, t.y + 2, CHIP_W, FS.xs + 1);
        });
    }

    /**
     * 칸을 넘는 글자를 잘라 낸다.
     *
     * 한글은 고정폭 글꼴에서도 라틴 문자의 **두 배** 폭이라 글자 수로 자르면 한글 줄만
     * 칸을 넘는다. 한글을 두 칸으로 세어 폭으로 자른다.
     */
    private fit(s: string, gutter = 0): string {
        const room = Math.floor((this.boxW - PADX * 2 - CHIP_W - 6 - gutter) / (FS.xs * 0.6));
        let used = 0;
        for (let i = 0; i < s.length; i++) {
            used += s.charCodeAt(i) > 0x1100 ? 2 : 1;
            if (used > room - 1) return `${s.slice(0, i)}…`;
        }
        return s;
    }
}
