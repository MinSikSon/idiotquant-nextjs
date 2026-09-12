"use client";

// 숫자 입력칸 — **치는 동안에는 친 글자를 그대로 둔다.**
//
// ── 무엇이 고장이었나 ──────────────────────────────────────────
// 칸이 `value={숫자}` 에 매 글자마다 `Number(...)` 를 태워 `sanitize` 한 결과를 도로
// 그리고 있었다. 그런데 **치는 중인 글자는 아직 숫자가 아니다.**
//
//   · 마지막 자리를 지우면 `Number("")` 가 0 이라 그 0 이 다시 그려졌다 —
//     **칸을 비울 수가 없었다.** 500 을 치려면 먼저 0 을 지워야 하는데 그게 안 된다.
//   · 지울 수가 없으니 0 뒤에 이어 치게 되고, 친 글자의 숫자값이 지금 값과 같으면
//     (`"00"` → 0) 리액트가 다시 그릴 것이 없다고 보아 **「01」이 그대로 남았다.**
//
// 그래서 칸에 글자를 하나 들려 준다(`draft`). 치는 동안은 그 글자가 보이고, 숫자로
// 읽히는 순간에만 바깥 값을 확정한다. 칸을 떠나면 `draft` 를 버려서 **확정되고
// 다듬어진(sanitize) 숫자**로 돌아온다 — 한계를 넘겨 쳤으면 거기서 바로잡힌다.
//
// ── `type="number"` 를 안 쓴다 ────────────────────────────────
// 그 타입은 브라우저가 못 읽는 중간 글자에 `e.target.value` 로 **빈 글자를 준다** —
// `"7."` 도 `"-"` 도 빈 글자다. 글자를 들고 있겠다는 이 컴포넌트와 정면으로 부딪힌다
// (친 글자가 빈 칸으로 지워진다). `inputMode="decimal"` 이 숫자 자판을 띄우는 일은
// 그대로 하므로 폰에서 달라지는 것은 없다.
//
// **오르내림 화살표는 없어진다.** 대신 마우스 휠이 칸 위를 지날 때 값이 몰래 바뀌던
// 것도 같이 없어진다 — 문서를 굴리다 투자금이 바뀌는 쪽이 더 나쁘다.

import { useState } from "react";

import { acceptsDraft, draftValue, trimLeadingZero } from "./calc";

export function NumberField({
    id, value, onCommit, allowNegative = false, className, ariaLabel,
}: {
    id?: string;
    /** 확정된 값. 칸을 안 치고 있을 때 이 값이 그대로 보인다. */
    value: number;
    /** 글자가 숫자로 읽힐 때만 불린다. **빈 칸에서는 안 불린다.** */
    onCommit: (v: number) => void;
    /** 음수를 칠 수 있는가. 수익률만 그렇다. */
    allowNegative?: boolean;
    className?: string;
    ariaLabel?: string;
}) {
    /** 치는 중인 글자. `null` 이면 치고 있지 않다는 뜻이라 `value` 를 그린다. */
    const [draft, setDraft] = useState<string | null>(null);

    return (
        <input
            id={id}
            type="text"
            inputMode="decimal"
            value={draft ?? String(value)}
            aria-label={ariaLabel}
            // **칸을 누르면 통째로 잡힌다.** 숫자 하나를 통째로 바꾸는 칸이라 이어 치는
            // 일보다 갈아 치우는 일이 훨씬 잦다. 0 이 든 칸을 누르고 1 을 치면
            // 「01」이 아니라 「1」이 되는 것이 이 한 줄이다.
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
                // 못 쓰는 글자는 **아예 안 받는다.** 받아 두고 나중에 거르면 칸에
                // 한 번 보였다가 사라져서 눌린 것인지 아닌지를 알 수 없다.
                if (!acceptsDraft(e.target.value, allowNegative)) return;
                // 0 이 든 칸의 끝을 짚고 이어 치면 「01」이 된다. 값으로는 1 인데 칸에는
                // 「01」이 적혀 있으면 **적힌 것과 계산되는 것이 다른 칸**이 된다.
                const raw = trimLeadingZero(e.target.value);
                setDraft(raw);
                const n = draftValue(raw);
                if (n !== null) onCommit(n);
            }}
            // 치기를 끝내면 글자를 버린다 — 그러면 다듬어진 숫자가 다시 보인다.
            // 비운 채로 떠나면 마지막으로 확정된 값이 그대로 남는다.
            onBlur={() => setDraft(null)}
            className={className}
        />
    );
}
