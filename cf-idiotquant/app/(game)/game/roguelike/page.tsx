"use client";

// 로그라이크 — 12턴 한 판.
//
// 이 파일은 껍데기다. 판은 lib/game 안에서 돌고, 여기서는 캔버스를 **서버에서 그리지
// 않도록** 막는 일만 한다. dynamic(ssr:false) 가 그 자리다 — Phaser 는 모듈이 로드되는
// 순간 window 를 만지는데 서버에는 그게 없다.

import dynamic from "next/dynamic";
import Link from "next/link";

const PhaserGame = dynamic(() => import("../PhaserGame"), {
    ssr: false,
    loading: () => (
        <div className="grid h-[calc(100dvh-112px)] w-full place-items-center bg-[#0b0f10]">
            <span className="font-mono text-[11px] tracking-[0.12em] text-[#5cf08f]">
                NOW LOADING…
            </span>
        </div>
    ),
});

export default function RoguelikePage() {
    return (
        <div className="bg-[#0b0f10]">
            {/* 앱의 상단 48 + 하단 탭 64 를 뺀 높이. 페이지는 안 구르고 게임만 남는다. */}
            <PhaserGame className="grid h-[calc(100dvh-112px)] w-full place-items-center overflow-hidden bg-[#0b0f10] [&>canvas]:block [&>canvas]:[image-rendering:pixelated]" />

            <div className="py-2 text-center">
                <Link href="/game" className="font-mono text-[11px] text-[#3c4844] underline">
                    블라인드 차트로
                </Link>
            </div>
        </div>
    );
}
