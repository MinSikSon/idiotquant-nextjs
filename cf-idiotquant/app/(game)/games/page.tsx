/**
 * `/game` — Rogue(1980) 클론.
 *
 * 이 파일은 **자리를 재는 일**만 한다. 판은 `lib/rogue` 안에서 돌고 그림은 `Rogue.tsx`
 * 가 그린다.
 *
 * ── 왜 높이를 이렇게 재나 ────────────────────────────────────────────
 * 지도는 부모 칸을 재서 몇 칸을 보여 줄지 정한다. 그래서 이 칸이 화면과 어긋나면 지도가
 * 통째로 어긋난다. 두 가지를 지킨다.
 *
 *   · **모바일은 `svh` 를 쓴다** — 게임은 스크롤하지 않는 한 화면이라 브라우저 도구 막대가
 *     보일 때의 높이에 맞춘다. `dvh` 가 Safari 에서 그보다 크게 잡히면 페이지가 밀리고
 *     하단에 빈 칸이 생긴다. 문서 스크롤도 모바일 게임에서 잠근다(`app/global.css`).
 *
 *     지도는 DOM 이고 `MapView` 의 `ResizeObserver` 가 칸 수를 다시 잰다.
 *   · 모바일에서는 상단 헤더 48px 만 뺀다. 게임 경로에는 하단 탭 바가 없으므로
 *     하단 여백도 두지 않는다(`app/global.css`). `md` 부터는 세로를 통째로 쓴다.
 */

import GameBoundary from "./GameBoundary";
import Rogue from "./Rogue";

export default function RoguePage() {
    // `id` 는 표시용이 아니라 표식이다. `global.css` 의 `html:has(#rogue-root)` 가 이걸 보고
    // **문서 뿌리까지 지금 테마의 바탕**으로 칠한다 — 고무줄 스크롤로 드러나는 자리가 거기다.
    return (
        <div id="rogue-root" className="h-[calc(100svh-48px)] w-full bg-[var(--rg-bg)] md:h-dvh">
            {/* 판이 터져도 이 주소가 영영 안 열리는 일은 없게 한다 — `GameBoundary` 머리말 참고. */}
            <GameBoundary>
                <Rogue />
            </GameBoundary>
        </div>
    );
}
