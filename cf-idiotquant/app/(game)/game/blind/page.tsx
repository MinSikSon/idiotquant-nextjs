"use client";

// 블라인드 차트 리플레이 — 캔버스 게임(Phaser).
//
// ── 단계 셋 ──────────────────────────────────────────────────────────
//
//   준비(ready) → 시작(play) → 종료(result) → (다시 준비)
//
// 단계가 곧 Phaser 의 Scene 이다(lib/game/scenes). 화면 상태를 React 가 들지 않으므로
// "지금 어느 단계인가" 를 따로 계산할 일이 없다 — 도는 Scene 이 곧 답이다.
//
// ── 무엇을 남기고 무엇을 뺐나 ────────────────────────────────────────
//
// 남긴 것은 이 게임을 게임이게 하는 것뿐이다: 이름 가린 차트, 하루씩 넘기기, 사고팔기,
// 수수료와 세금, 그리고 "그냥 들고 있었으면" 과의 비교.
//
// 뺀 것 — 캠페인·반기·맡은 돈·고객·목표·파산·공매도·예약·리서치 도구·부서·매매 습관.
// 지운 것이 아니라 **안 부르는 것**이다: 규칙은 lib/paper 에 테스트와 함께 그대로 있고,
// 그걸 쓰던 화면도 /game/classic 에 그대로 살아 있다. 하나씩 다시 얹으면 된다.

import dynamic from "next/dynamic";
import Link from "next/link";

// 캔버스는 서버에서 그릴 수 없다. 게임 코드(Phaser 포함)가 /game 에 들어올 때만 내려간다.
const GameCanvas = dynamic(() => import("../GameCanvas"), {
    ssr: false,
    loading: () => (
        <div className="grid place-items-center font-[family-name:var(--font-pixel)]"
            style={{ height: "calc(100dvh - 112px)", background: "#0b0f10", color: "#5cf08f" }}>
            <span className="text-[11px]">NOW LOADING…</span>
        </div>
    ),
});

export default function GamePage() {
    return (
        <div style={{ background: "#0b0f10" }}>
            <GameCanvas />
            {/* 예전 화면으로 가는 문. 거기에는 여기서 뺀 것들이 다 있다. */}
            <div className="text-center py-2 font-[family-name:var(--font-pixel)]">
                <Link href="/game/classic" className="text-[11px] underline" style={{ color: "#3c4844" }}>
                    예전 화면 — 캠페인 · 부서 · 공매도
                </Link>
            </div>
        </div>
    );
}
