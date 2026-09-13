"use client";

/**
 * 손가락으로 하는 Rogue.
 *
 * 원작은 키보드 게임이고 `hjklyubn` 이 그 문법이다. 웹에서는 그것만으로는 폰에서 한
 * 걸음도 못 걷는다 — 그래서 **여덟 방향 판**을 세운다. 대각선을 빼지 않는 이유는
 * 대각선이 이 게임의 도망 경로라서다.
 *
 * 명령 단추는 **지금 할 수 있는 것만** 켠다. 계단 위가 아닌데 「내려간다」가 서 있으면
 * 눌러도 아무 일이 없는 단추가 되고, 그런 단추가 셋이면 화면을 안 믿게 된다.
 *
 * ── 왜 격자인가 ──────────────────────────────────────────────────────
 * 예전에는 `flex-wrap` 이었다. 글자 수가 제각각이라(「줍기」 두 자, 「지난 판들」 다섯
 * 자) 단추 너비가 다 달랐고, 그래서 **줄마다 칸 경계가 어긋나고 오른쪽 끝이 들쭉날쭉**
 * 했다. 게다가 글자 수가 바뀌면 뒤의 단추가 전부 밀려서, 「먹는다」가 어제는 둘째 칸
 * 오늘은 셋째 칸에 있었다 — 손가락이 자리를 못 외운다.
 *
 * 지금은 **모든 칸이 같은 크기인 세 칸 격자**다. 화면 너비가 칸 수를 정하게 두면
 * (`auto-fit`) 폰에서 두 칸, 데스크톱에서 열한 칸이 되어 **기기마다 자리가 달라진다**
 * — 실제로 재 보고 고쳤다. 세 칸으로 못 박으면 `Rogue.tsx` 의 목록을 세 개씩 묶어
 * 적는 것만으로 **한 줄이 곧 한 묶음**이 되고, 그 자리는 어디서나 같다.
 *
 * 판 전체에 최대 너비를 두는 것도 같은 이유다. 안 두면 넓은 화면에서 단추가 양쪽
 * 끝까지 벌어져 방향판에서 한참 떨어진다.
 */

import type { ReactNode } from "react";

export interface PadAction {
    label: string;
    hint?: string;
    on: () => void;
    /** 못 누르는 이유. 있으면 잠긴다. */
    off?: string;
}

function Key({
    children,
    onPress,
    disabled,
    title,
    wide,
}: {
    children: ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    title?: string;
    wide?: boolean;
}) {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            onClick={onPress}
            className={[
                // 칸 크기는 격자가 정한다 — 단추는 그 칸을 꽉 채우고 글자는 가운데.
                "grid select-none place-items-center rounded-[3px] border border-[var(--rg-key-line)] bg-[var(--rg-hover)]",
                "font-[family-name:var(--font-plex-mono)] leading-none text-[var(--rg-text)]",
                "active:translate-y-px active:bg-[var(--rg-press)]",
                "disabled:border-[var(--rg-off-line)] disabled:bg-[var(--rg-off-bg)] disabled:text-[var(--rg-off-ink)]",
                // **줄 높이가 글자 수를 따라가면 안 된다.** 안 접으면 긴 이름 하나가
                // 두 줄로 접히면서 그 줄만 키가 커지고, 격자가 다시 어긋난다.
                wide ? "h-9 w-full overflow-hidden whitespace-nowrap px-1 text-[12px]" : "h-11 w-11 text-[13px]",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

export default function TouchPad({
    onMove,
    actions,
}: {
    onMove: (dx: number, dy: number) => void;
    actions: PadAction[];
}) {
    const step = (dx: number, dy: number) => () => onMove(dx, dy);
    return (
        <div className="mx-auto flex max-w-[560px] items-start gap-3 px-2 py-2">
            <div className="grid shrink-0 grid-cols-3 gap-1">
                <Key onPress={step(-1, -1)} title="왼쪽 위 (y)">↖</Key>
                <Key onPress={step(0, -1)} title="위 (k)">↑</Key>
                <Key onPress={step(1, -1)} title="오른쪽 위 (u)">↗</Key>
                <Key onPress={step(-1, 0)} title="왼쪽 (h)">←</Key>
                <Key onPress={step(0, 0)} title="제자리에서 쉰다 (.)">·</Key>
                <Key onPress={step(1, 0)} title="오른쪽 (l)">→</Key>
                <Key onPress={step(-1, 1)} title="왼쪽 아래 (b)">↙</Key>
                <Key onPress={step(0, 1)} title="아래 (j)">↓</Key>
                <Key onPress={step(1, 1)} title="오른쪽 아래 (n)">↘</Key>
            </div>

            {/* 어느 화면에서나 세 칸 × 다섯 줄. 자리가 안 바뀌어야 손가락이 외운다. */}
            <div className="grid min-w-0 flex-1 grid-cols-3 content-start gap-1">
                {actions.map((a) => (
                    <Key key={a.label} wide onPress={a.on} disabled={!!a.off} title={a.off ?? a.hint}>
                        {a.label}
                    </Key>
                ))}
            </div>
        </div>
    );
}
