"use client";

/**
 * 어디를 겨눌까 — 지팡이와 던지기가 쓰는 방향 고르기.
 *
 * 원작은 `z` 를 누르고 물건을 고른 뒤 방향키를 한 번 더 누른다. 키보드에서는 그대로
 * 되지만 **폰에서는 방향을 누를 자리가 필요하다.** 그래서 판 하나를 세운다.
 *
 * 이 판이 떠 있는 동안 방향키는 **걷지 않고 겨눈다.** 두 가지를 같은 키가 하므로
 * 지금 무엇을 하는 중인지가 화면에 크게 적혀 있어야 한다 — 그것이 제목 줄이다.
 */

import Panel from "./Panel";

const CELLS: ({ dx: number; dy: number; label: string } | null)[] = [
    { dx: -1, dy: -1, label: "↖" },
    { dx: 0, dy: -1, label: "↑" },
    { dx: 1, dy: -1, label: "↗" },
    { dx: -1, dy: 0, label: "←" },
    null,
    { dx: 1, dy: 0, label: "→" },
    { dx: -1, dy: 1, label: "↙" },
    { dx: 0, dy: 1, label: "↓" },
    { dx: 1, dy: 1, label: "↘" },
];

export default function Aim({
    title,
    what,
    onPick,
    onCancel,
}: {
    title: string;
    what: string;
    onPick: (dx: number, dy: number) => void;
    onCancel: () => void;
}) {
    return (
        <Panel title={title} onClose={onCancel} footer="방향키·hjkl·yubn 로도 겨눌 수 있습니다.">
            <p className="mb-3 text-[var(--rg-muted)]">{what}</p>
            <div className="mx-auto grid w-[168px] grid-cols-3 gap-1">
                {CELLS.map((c, i) =>
                    c ? (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onPick(c.dx, c.dy)}
                            className="h-12 rounded-[3px] border border-[var(--rg-line)] bg-[var(--rg-hover)] text-[var(--rg-strong)] active:translate-y-px active:bg-[var(--rg-press)]"
                        >
                            {c.label}
                        </button>
                    ) : (
                        <div key={i} aria-hidden className="h-12" />
                    ),
                )}
            </div>
        </Panel>
    );
}
