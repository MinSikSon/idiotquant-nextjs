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
                "select-none rounded-[3px] border border-[#2e3a36] bg-[#161c1a] font-[family-name:var(--font-plex-mono)] text-[13px] text-[#c3ced6]",
                "active:translate-y-px active:bg-[#202927]",
                "disabled:border-[#1d2422] disabled:bg-[#101413] disabled:text-[#3a4442]",
                wide ? "px-3 py-2" : "h-11 w-11",
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
        <div className="flex items-start justify-between gap-3 px-2 py-2">
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

            <div className="flex min-w-0 flex-1 flex-wrap content-start gap-1">
                {actions.map((a) => (
                    <Key key={a.label} wide onPress={a.on} disabled={!!a.off} title={a.off ?? a.hint}>
                        {a.label}
                    </Key>
                ))}
            </div>
        </div>
    );
}
