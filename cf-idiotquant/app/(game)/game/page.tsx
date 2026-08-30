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
import Link from "next/link";

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
        <div className="mx-auto flex h-[calc(100svh-112px)] max-w-[430px] flex-col bg-[#0b0f10] md:h-svh [@media(max-height:500px)]:max-w-none">
            {/* min-h-0 이 없으면 flex 자식이 안 줄어들어 링크 줄을 밖으로 밀어낸다. */}
            <div className="min-h-0 flex-1">
                <PhaserGame className="grid h-full w-full place-items-center overflow-hidden bg-[#0b0f10] [&>canvas]:block [&>canvas]:[image-rendering:pixelated]" />
            </div>

            {/* 눕히면 세로 28px 이 아깝다. 링크는 세로로 되돌리면 다시 나온다. */}
            <div className="shrink-0 py-1.5 text-center font-mono text-[11px] text-[#3c4844] [@media(max-height:500px)]:hidden">
                <Link href="/game/cards" className="underline">카드 도감</Link>
                <span className="px-2">·</span>
                <Link href="/game/blind" className="underline">블라인드 차트로</Link>
            </div>
        </div>
    );
}
