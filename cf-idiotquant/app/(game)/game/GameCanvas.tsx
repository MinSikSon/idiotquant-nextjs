"use client";

// 캔버스를 붙이는 껍데기. 게임 자체는 lib/game 안에서 돈다.
//
// 여기서 하는 일은 셋뿐이다: 붙일 자리를 만들고, 픽셀 글꼴이 실제로 온 뒤에 켜고,
// 나갈 때 끈다. React 상태를 게임과 섞지 않는다 — 섞는 순간 판이 리렌더마다 흔들린다.

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

export default function GameCanvas() {
    const hostRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const host = hostRef.current;
        if (!host || gameRef.current) return;

        let cancelled = false;

        (async () => {
            try {
                // 캔버스는 글꼴을 CSS 로 못 받는다 — 그릴 때 이미 와 있어야 한다.
                // 안 기다리면 첫 화면이 대체 글꼴로 그려지고, 나중에 와도 다시 안 그려진다.
                if (document.fonts?.ready) await document.fonts.ready;
                if (cancelled) return;

                // next/font 가 만든 해시 이름을 그대로 읽는다. 이름을 손으로 적으면
                // 빌드마다 바뀌는 값을 상수로 박아 두는 꼴이 된다.
                const family = getComputedStyle(host).fontFamily || "monospace";

                const { boot } = await import("@/lib/game/boot");
                if (cancelled) return;
                gameRef.current = boot({ parent: host, fontFamily: family });
            } catch {
                if (!cancelled) setFailed(true);
            }
        })();

        return () => {
            cancelled = true;
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, []);

    return (
        <div
            ref={hostRef}
            className="w-full font-[family-name:var(--font-pixel)]"
            // 캔버스는 이 자리를 꽉 채운다. 위아래 크롬(상단 48 + 하단 탭 64)을 뺀 높이를
            // 주면 페이지 자체는 스크롤되지 않고 게임만 남는다.
            style={{ height: "calc(100dvh - 112px)", background: "#0b0f10" }}
        >
            {failed && (
                <p className="p-4 text-[13px] leading-[1.8]" style={{ color: "#e9f2ea" }}>
                    게임을 불러오지 못했습니다. 새로고침해 주세요.
                </p>
            )}
        </div>
    );
}
