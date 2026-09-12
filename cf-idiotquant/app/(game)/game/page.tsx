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
 *   · **`dvh` 를 쓴다** — 루트 `<main>` 이 `min-h-[100dvh]` 라서 여기만 `svh` 를 쓰면
 *     둘이 어긋난다. 아이폰 사파리에서 주소창이 접히면 `dvh > svh` 가 되고, `main` 은
 *     그만큼 커지는데 게임은 안 커져서 **아래에 검은 빈 칸이 남는다.** 실제로 그랬다.
 *
 *     옛 게임(`imf/`)은 `svh` 를 쓴다 — 거기는 Phaser 캔버스라 높이가 바뀔 때마다
 *     스스로 다시 맞추지 못해 검은 띠가 생겼기 때문이다. **여기는 그 이유가 없다.**
 *     지도는 DOM 이고 `MapView` 의 `ResizeObserver` 가 칸 수를 다시 잰다. 남의 이유를
 *     같이 물려받으면 이런 일이 난다.
 *   · 상단 48 + 하단 탭 64 를 뺀다. 그 두 바는 `md` 미만에서만 있다(`navigation.tsx` 가
 *     `md:hidden` 으로 건다). `md` 부터는 왼쪽 사이드바뿐이라 세로를 통째로 쓴다.
 *     **이 숫자는 `app/layout.tsx` 의 `pt-[48px]`·`pb-[64px]` 와 같아야 한다** — 한쪽만
 *     바뀌면 그 차이가 그대로 빈 칸이나 잘림이 된다.
 */

import GameBoundary from "./GameBoundary";
import Rogue from "./Rogue";

export default function RoguePage() {
    return (
        <div className="h-[calc(100dvh-112px)] w-full bg-[#0b0c0c] md:h-dvh">
            {/* 판이 터져도 이 주소가 영영 안 열리는 일은 없게 한다 — `GameBoundary` 머리말 참고. */}
            <GameBoundary>
                <Rogue />
            </GameBoundary>
        </div>
    );
}
