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

const PhaserGame = dynamic(() => import("../PhaserGame"), {
    ssr: false,
    loading: () => (
        <div className="grid h-full w-full place-items-center bg-[#0b0f10]">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[#5cf08f]">
                NOW LOADING…
            </span>
        </div>
    ),
});

export default function RoguelikePage() {
    return (
        // 상단 48 + 하단 탭 64 를 뺀 높이. 이 안에서 캔버스와 링크 줄이 자리를 나눈다.
        <div className="mx-auto flex h-[calc(100svh-112px)] max-w-[430px] flex-col bg-[#0b0f10]">
            {/* min-h-0 이 없으면 flex 자식이 안 줄어들어 링크 줄을 밖으로 밀어낸다. */}
            <div className="min-h-0 flex-1">
                <PhaserGame className="grid h-full w-full place-items-center overflow-hidden bg-[#0b0f10] [&>canvas]:block [&>canvas]:[image-rendering:pixelated]" />
            </div>

            <div className="shrink-0 py-1.5 text-center">
                <Link href="/game" className="font-mono text-[11px] text-[#3c4844] underline">
                    블라인드 차트로
                </Link>
            </div>
        </div>
    );
}
