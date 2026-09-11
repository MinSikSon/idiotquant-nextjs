"use client";

// 로그라이크 — 12턴 한 판.
//
// 이 파일은 껍데기다. 판은 lib/game 안에서 돌고, 여기서는 캔버스를 **서버에서 그리지
// 않도록** 막고 **자리를 정확히 재는** 일만 한다. dynamic(ssr:false) 가 그 첫 자리다 —
// Phaser 는 모듈이 로드되는 순간 window 를 만지는데 서버에는 그게 없다.
//
// ── 왜 높이를 이렇게 재나 ────────────────────────────────────────────
// 게임은 부모 칸의 크기를 보고 설계 격자의 세로를 정한다. 그래서 이 칸이 화면과 어긋나면
// 게임이 통째로 어긋난다. 두 가지를 지킨다.
//
//   · svh 를 쓴다 — dvh 는 주소창이 숨을 때마다 값이 바뀌고, 그때마다 캔버스가 다시
//     맞춰지지 않아 위아래에 검은 띠가 생긴다. svh 는 주소창이 보일 때의 높이로 고정된다.
//   · 아래 링크 줄까지 **이 칸 안에** 넣는다. 밖에 두면 그만큼 문서가 길어져 페이지가
//     세로로 40px 구르고, 캔버스 게임에서 그 스크롤은 오조작이 된다.

import dynamic from "next/dynamic";

import { WinBar, WinLink } from "./WinLink";

const PhaserGame = dynamic(() => import("./PhaserGame"), {
    ssr: false,
    loading: () => (
        <div className="grid h-full w-full place-items-center bg-[#0b0f10]">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[#5cf08f]">
                NOW LOADING…
            </span>
        </div>
    ),
});

// ── 눕힌 폰만 고르는 조건 ────────────────────────────────────────────
// 아래 두 곳의 `[@media(max-height:500px)]` 가 그것이다. `landscape:` 로 가르지 않는
// 이유는 데스크톱 창도 거의 늘 가로라서다 — 그러면 폭 제한이 풀려 게임이 화면을
// 가로질러 늘어난다. **낮은** 화면만 골라야 폰이 잡힌다.
//
// 이 클래스를 상수로 빼서 이어 붙이면 안 된다. Tailwind 는 소스에서 **완성된 클래스
// 이름**을 글자 그대로 찾으므로, 런타임에 조립한 이름은 아예 생성되지 않는다.

export default function RoguelikePage() {
    return (
        // 상단 48 + 하단 탭 64 를 뺀 높이 — 단 그 두 바는 md 미만에서만 있다(내비게이션이
        // md:hidden 으로 건다). md 부터는 왼쪽 사이드바뿐이라 세로를 통째로 쓴다. 눕힌
        // 폰은 폭이 md 를 넘어 이쪽으로 오므로, 세로 112px 을 게임이 돌려받는다.
        // 눕힌 폰에서는 430px 제한도 풀어 화면 폭을 다 쓰게 한다.
        // lg 부터는 폭 제한을 푼다. 430px 로 묶어 두면 데스크톱에서 화면의 3분의 2가
        // 검은 여백이 되고, 게임은 그 가운데 좁은 기둥으로 남는다. 폭이 풀리면 격자가
        // 두 칸 배치로 넘어가 그 폭을 실제로 쓴다(designSize).
        <div className="mx-auto flex h-[calc(100svh-112px)] max-w-[430px] flex-col bg-[#0b0f10] md:h-svh lg:max-w-none [@media(max-height:500px)]:max-w-none">
            {/* min-h-0 이 없으면 flex 자식이 안 줄어들어 링크 줄을 밖으로 밀어낸다. */}
            <div className="min-h-0 flex-1">
                <PhaserGame className="grid h-full w-full place-items-center overflow-hidden bg-[#0b0f10] [&>canvas]:block" />
            </div>

            {/* 이력으로 가는 **유일한 문**이다. 메뉴에는 없다 — 게임을 안 켠 사람에게
                누적 기록은 읽을 수 없는 글이다.

                ── 카드 도감은 여기서 뺐다 ──────────────────────────────
                **판에 카드가 없다.** 손패 층을 걷어 내면서 근거는 카드가 아니라
                행동(「알아본다」)에서 나오게 됐고(폴더 CLAUDE.md 「카드는 지금 없다」),
                그래서 도감은 **이 게임에 없는 것의 목록**을 보여 주고 있었다. 판에
                한 번도 안 나오는 열두 장을 설명하는 문이 판으로 들어가는 문 옆에
                나란히 서 있으면, 처음 켠 사람은 그 카드들을 찾으러 다닌다.

                **페이지는 지우지 않았다** — `/game/cards` 는 그대로 열리고
                `middleware.ts` 의 공개 목록에도 남아 있다. 수집을 되살릴 때
                이 줄에 `<WinLink href="/game/cards">카드 도감</WinLink>` 한 줄을
                도로 넣으면 문이 다시 선다. 코어의 `situations.ts`·`DeckManager.ts`
                를 남겨 둔 것과 같은 이유다.

                ── 밑줄 글자였다 ────────────────────────────────────────
                게임 화면은 처음부터 끝까지 90년대 윈도우의 은회색 3D 판인데, 그 아래에
                12px 짜리 웹 링크가 붙어 있었다. **화면에서 유일하게 안 눌러 보이는 것**이
                하필 눌러야 하는 것이었다. 그래서 같은 모양의 단추로 바꾼다(`WinLink`).

                ── 눕혀도 숨기지 않는다 ─────────────────────────────────
                예전에는 `max-height:500px` 에서 통째로 숨겼다. 세로 28px 이 아까워서였는데,
                그러면 **눕힌 채로는 이력에 갈 길이 아예 없다.** 문을 없애는 대신 작게
                만든다 — `sm` 이 그 몫이다. */}
            <WinBar className="[@media(max-height:500px)]:py-1">
                <span className="hidden font-mono text-[11px] text-[#4a5056] sm:inline">
                    게임 밖 —
                </span>
                <WinLink href="/game/status">이력</WinLink>
            </WinBar>
        </div>
    );
}
