// 90년대 기기 조각들 — 캔버스판.
//
// HTML 쪽 retro.tsx 와 같은 것을 그린다: 두 겹 베벨(밝은 모서리 + 어두운 모서리)로 튀어나온
// 면과 파인 면을 만든다. CSS 의 inset box-shadow 를 사각형 넷으로 옮긴 것이 전부다.
//
// 여기 있는 것은 **그리는 법**뿐이고 무엇을 그릴지는 Scene 이 정한다. 나중에 화면을 하나
// 더 붙일 때 이 파일을 안 고치고 쓰라고 이렇게 갈라 뒀다.

import Phaser from "phaser";
import { C, S, FS } from "./theme";

/** 베벨 두께. CSS 쪽 inset 2px 와 같다. */
const B = 2;

/**
 * 베벨 면 하나. `out` 은 튀어나온 것(창·버튼), `in` 은 파인 것(값이 들어가는 칸).
 *
 * 네모 넷으로 그린다 — 위·왼쪽에 밝은 색, 아래·오른쪽에 어두운 색. 파인 면은 그 둘을 바꾼다.
 */
export function bevel(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    mode: "out" | "in" = "out", face: number = C.face,
) {
    const light = mode === "out" ? C.hi : C.lo;
    const dark = mode === "out" ? C.lo : C.hi;

    g.fillStyle(face, 1).fillRect(x, y, w, h);
    g.fillStyle(light, 1);
    g.fillRect(x, y, w, B);              // 위
    g.fillRect(x, y, B, h);              // 왼쪽
    g.fillStyle(dark, 1);
    g.fillRect(x, y + h - B, w, B);      // 아래
    g.fillRect(x + w - B, y, B, h);      // 오른쪽
}

/** Scene 이 들고 있는 글꼴. React 껍데기가 넘겨 준 실제 패밀리 이름을 쓴다. */
export function fontOf(scene: Phaser.Scene): string {
    return (scene.game.registry.get("fontFamily") as string) || "monospace";
}

export interface TextOpts {
    size?: number;
    color?: string;
    bold?: boolean;
    /** 가로 정렬 기준점. "left"(기본) · "center" · "right" */
    align?: "left" | "center" | "right";
    /** 넘치면 줄을 바꾼다. 안 주면 한 줄로 둔다. */
    wrap?: number;
}

/** 글자 하나. 좌표는 왼쪽 위 기준이고, align 을 주면 그 기준으로 바뀐다. */
export function label(
    scene: Phaser.Scene, x: number, y: number, str: string, o: TextOpts = {},
): Phaser.GameObjects.Text {
    const t = scene.add.text(x, y, str, {
        fontFamily: fontOf(scene),
        fontSize: `${o.size ?? FS.md}px`,
        color: o.color ?? S.ink,
        fontStyle: o.bold ? "bold" : "normal",
        ...(o.wrap ? { wordWrap: { width: o.wrap, useAdvancedWrap: true } } : {}),
    });
    // 픽셀 폰트는 반픽셀에 놓이면 뭉갠다. 정수 격자에 고정한다.
    t.setResolution(Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
    if (o.align === "center") t.setOrigin(0.5, 0);
    else if (o.align === "right") t.setOrigin(1, 0);
    return t;
}

/**
 * 타이틀바가 달린 창. 안에 무엇을 넣을지는 부르는 쪽이 정한다.
 *
 * @returns 본문이 시작되는 y 좌표. 창 안에 줄을 쌓을 때 여기서부터 내려가면 된다.
 */
export function win(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number,
    title?: string, right?: string,
): number {
    const g = scene.add.graphics();
    bevel(g, x, y, w, h, "out");
    if (!title) return y + B + 4;

    const barH = 20;
    g.fillStyle(C.bar, 1).fillRect(x + B, y + B, w - B * 2, barH);
    g.fillStyle(C.barHi, 1).fillRect(x + B, y + B, w - B * 2, 1);
    label(scene, x + B + 6, y + B + 4, title, { size: FS.md, color: S.inkHi, bold: true });
    if (right) {
        label(scene, x + w - B - 6, y + B + 4, right, { size: FS.md, color: S.neon, align: "right" });
    }
    return y + B + barH + 5;
}

/** 파인 칸 — 값이 들어가는 자리. 창 안에 쓴다. */
export function sunken(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    bevel(scene.add.graphics(), x, y, w, h, "in", C.faceLo);
}

/** 브라운관 — 차트가 들어가는 검은 자리. */
export function crt(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    bevel(scene.add.graphics(), x, y, w, h, "in", C.screen);
}

/**
 * 점선으로 이어진 한 줄 — 흐린 이름과 진한 값이 양끝에 붙는다.
 * 계좌·요약을 읽는 눈이 값만 훑고 내려갈 수 있게 하는 자리다.
 */
export function statLine(
    scene: Phaser.Scene, x: number, y: number, w: number,
    name: string, value: string, color: string = S.ink,
) {
    label(scene, x, y, name, { size: FS.md, color: S.inkDim });
    label(scene, x + w, y, value, { size: FS.md, color, bold: true, align: "right" });
}

export interface BtnOpts {
    /** 눈에 띄는 초록 버튼 — 한 화면에 하나만. 여럿이 빛나면 아무것도 안 빛난다. */
    tone?: "plain" | "go";
    size?: number;
    disabled?: boolean;
}

export interface Btn {
    /** 버튼을 이루는 것 전부. 화면을 지울 때 이것만 destroy 하면 된다. */
    root: Phaser.GameObjects.Container;
    setDisabled(v: boolean): void;
    setText(s: string): void;
}

const GO_FACE = 0x1f7a3d;

/**
 * 누를 수 있는 버튼.
 *
 * 누르는 동안 베벨이 파인 면으로 바뀐다 — 눌렀는지 아닌지가 손끝 말고 눈으로도 보여야 한다.
 * 잠긴 버튼은 흐리게 두되 지우지 않는다. 있던 것이 사라지면 고장 난 것처럼 보인다.
 */
export function button(
    scene: Phaser.Scene, x: number, y: number, w: number, h: number,
    text: string, onClick: () => void, o: BtnOpts = {},
): Btn {
    const face = o.tone === "go" ? GO_FACE : C.face;
    const color = o.tone === "go" ? S.inkHi : S.ink;

    const root = scene.add.container(x, y);
    const g = scene.add.graphics();
    const t = label(scene, w / 2, Math.round((h - (o.size ?? FS.md)) / 2) - 1, text, {
        size: o.size ?? FS.md, color, bold: true, align: "center",
    });
    root.add([g, t]);

    let disabled = !!o.disabled;
    const draw = (pressed: boolean) => {
        g.clear();
        bevel(g, 0, 0, w, h, pressed ? "in" : "out", face);
    };
    const paint = () => {
        draw(false);
        root.setAlpha(disabled ? 0.45 : 1);
    };
    paint();

    const zone = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    root.add(zone);

    zone.on("pointerdown", () => { if (!disabled) draw(true); });
    // 누른 채 손가락이 밖으로 나가면 취소다 — 버튼은 눌린 채 남아 있으면 안 된다.
    zone.on("pointerout", () => { if (!disabled) draw(false); });
    zone.on("pointerup", () => {
        if (disabled) return;
        draw(false);
        onClick();
    });

    return {
        root,
        setDisabled(v: boolean) { disabled = v; paint(); },
        setText(s: string) { t.setText(s); },
    };
}

/** 수익률 등 부호가 있는 값의 색. 오르면 빨강, 내리면 파랑(한국 시장). */
export function pnlColor(v: number): string {
    return v > 0 ? "#ff6b6b" : v < 0 ? "#7aa2ff" : S.inkDim;
}

/** "+3.2%" 처럼 부호를 붙여 준다. */
export function pct(v: number): string {
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

/** 1234567 → "123만 4,567" 이 아니라 화면 폭에 맞는 짧은 표기. */
export function money(v: number): string {
    const n = Math.round(v);
    if (Math.abs(n) >= 100_000_000) {
        const eok = Math.floor(Math.abs(n) / 100_000_000);
        const man = Math.floor((Math.abs(n) % 100_000_000) / 10_000);
        return `${n < 0 ? "-" : ""}${eok}억${man ? ` ${man.toLocaleString()}만` : ""}`;
    }
    if (Math.abs(n) >= 10_000) {
        return `${Math.floor(n / 10_000).toLocaleString()}만`;
    }
    return n.toLocaleString();
}

/* ── 단계 ────────────────────────────────────────────────────────
   준비 → 시작 → 종료. 세 화면 모두 맨 위에 같은 줄을 단다.

   Scene 이 곧 단계라 코드에는 이미 드러나 있지만, 화면에는 안 드러난다 —
   지금 어디이고 다음이 무엇인지를 줄 하나로 말한다. 높이 16px 이라 차트를 거의 안 먹는다. */

export const PHASES = [
    { id: "ready", label: "준비" },
    { id: "play", label: "시작" },
    { id: "result", label: "종료" },
] as const;

export type PhaseId = typeof PHASES[number]["id"];

/** @returns 이 줄 아래에서 본문이 시작되는 y. */
export function phaseBar(scene: Phaser.Scene, x: number, y: number, w: number, now: PhaseId): number {
    const h = 16, gap = 3;
    const at = PHASES.findIndex(p => p.id === now);
    const cw = Math.floor((w - gap * (PHASES.length - 1)) / PHASES.length);

    PHASES.forEach((p, i) => {
        const px0 = x + (cw + gap) * i;
        const on = i === at;
        bevel(scene.add.graphics(), px0, y, cw, h, "out", on ? C.neon : C.face);
        label(scene, px0 + cw / 2, y + 2, p.label, {
            size: FS.sm,
            // 지나온 칸은 읽히게, 앞으로 올 칸은 흐리게 — 어디까지 왔는지가 색으로 남는다
            color: on ? S.bg : (i < at ? S.ink : S.inkDim),
            bold: on, align: "center",
        });
    });
    return y + h + 6;
}
