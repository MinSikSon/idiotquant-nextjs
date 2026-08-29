"use client";

// Phaser 를 Next.js 안에 붙이는 자리. **이 파일이 하는 일은 켜고 끄는 것뿐이다.**
//
// ── 왜 이렇게까지 하나 ────────────────────────────────────────────────
// Phaser 는 모듈이 로드되는 순간 `window` · `document` 를 만진다. Next.js 는 이 컴포넌트를
// 서버에서 한 번 렌더하는데 거기엔 그 둘이 없다. 그래서 세 겹으로 막는다.
//
//   ① "use client"        — 이 컴포넌트가 클라이언트 것임을 못박는다
//   ② dynamic(ssr:false)  — 부르는 쪽(page.tsx)이 서버 렌더 자체를 건너뛴다
//   ③ await import()      — 그러고도 **모듈을 useEffect 안에서만** 받는다
//
// ③ 이 없으면 ②만으로는 부족하다. `import Phaser from "phaser"` 를 파일 맨 위에 두면
// 번들러가 그 모듈을 이 파일의 정적 의존으로 잡아, 서버 그래프에 끌려 들어올 수 있다.
//
// ── 정리(cleanup)가 왜 까다로운가 ─────────────────────────────────────
// React 18 의 StrictMode 는 개발 중 effect 를 **두 번** 돈다(mount → unmount → mount).
// 게임을 그냥 만들면 캔버스가 둘이 생기고, 둘 다 requestAnimationFrame 을 돌린다.
// 게다가 모듈을 기다리는 동안 언마운트되면 이미 사라진 자리에 캔버스를 붙이게 된다.
// 아래의 `cancelled` 와 `gameRef` 가 그 둘을 각각 막는다.

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

export interface PhaserGameProps {
    /** 지난 런에서 넘어온 인사이트. 없으면 0 부터 시작한다. */
    insightPoints?: number;
    /** 캔버스 바깥 높이. 앱의 상·하단 크롬을 뺀 값을 준다. */
    className?: string;
}

export default function PhaserGame({ insightPoints = 0, className }: PhaserGameProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        // StrictMode 가 두 번째로 들어왔을 때. 이미 도는 게임이 있으면 하나 더 만들지 않는다.
        if (gameRef.current) return;

        let cancelled = false;

        (async () => {
            try {
                // 여기서 처음으로 Phaser 가 로드된다. 이 줄이 도는 시점은 언제나 브라우저다.
                const { createGameConfig } = await import("@/lib/game/config");
                const PhaserLib = (await import("phaser")).default;

                // 모듈을 기다리는 사이에 화면을 떠났을 수 있다. 그러면 붙일 자리가 없다.
                if (cancelled || !hostRef.current) return;

                gameRef.current = new PhaserLib.Game(
                    createGameConfig({ parent: hostRef.current, insightPoints }),
                );
            } catch (e) {
                if (!cancelled) {
                    console.error("[PhaserGame] 게임을 켜지 못했습니다", e);
                    setError("게임을 불러오지 못했습니다. 새로고침해 주세요.");
                }
            }
        })();

        return () => {
            cancelled = true;
            // true 를 줘야 캔버스까지 DOM 에서 걷어 간다. 안 주면 화면을 나갔다 와도
            // 죽은 캔버스가 남아 쌓인다.
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
        // insightPoints 는 판을 시작할 때 한 번 쓰는 값이다. 이 값이 바뀌었다고 게임을
        // 다시 켜면 굴리던 판이 날아간다 — 그래서 의존성에 넣지 않는다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={hostRef}
            className={
                className ??
                "grid w-full place-items-center overflow-hidden bg-[#0b0f10] [&>canvas]:block [&>canvas]:[image-rendering:pixelated]"
            }
        >
            {error && (
                <p className="p-4 text-center text-[13px] leading-relaxed text-[#e9f2ea]">{error}</p>
            )}
        </div>
    );
}
