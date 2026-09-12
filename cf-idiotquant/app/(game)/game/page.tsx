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
 *   · `svh` 를 쓴다 — `dvh` 는 주소창이 숨을 때마다 값이 바뀌어 폰에서 지도가 덜컹인다.
 *   · 상단 48 + 하단 탭 64 를 뺀다. 그 두 바는 `md` 미만에서만 있다(`navigation.tsx` 가
 *     `md:hidden` 으로 건다). `md` 부터는 왼쪽 사이드바뿐이라 세로를 통째로 쓴다.
 */

import GameBoundary from "./GameBoundary";
import Rogue from "./Rogue";

export default function RoguePage() {
    return (
        <div className="h-[calc(100svh-112px)] w-full bg-[#0b0c0c] md:h-svh">
            {/* 판이 터져도 이 주소가 영영 안 열리는 일은 없게 한다 — `GameBoundary` 머리말 참고. */}
            <GameBoundary>
                <Rogue />
            </GameBoundary>
        </div>
    );
}
