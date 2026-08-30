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
        let ro: ResizeObserver | null = null;

        (async () => {
            try {
                // next/font 가 만든 패밀리 이름은 빌드마다 바뀌는 해시라 손으로 못 적는다.
                // host 에 걸어 둔 font-family 의 계산값을 그대로 읽어 간다.
                const family = getComputedStyle(host).fontFamily || "monospace";

                // 캔버스는 글꼴을 CSS 로 못 받는다 — 그릴 때 이미 와 있어야 하고, 나중에
                // 와도 다시 안 그려진다. 게다가 캔버스에 쓰는 것만으로는 브라우저가 웹폰트를
                // 받아 오지 않으므로, 쓸 글자를 주고 **직접 받아 둔다**.
                //
                // 패밀리마다 따로, 그리고 실패를 삼킨다. 목록에는 next/font 가 끼워 넣은
                // 대체 페이스(local() 로 기기 글꼴을 가리킨다)가 섞여 있고 그건 기기에
                // 따라 없을 수도 있다 — 글꼴 한 줄 때문에 판이 안 켜지면 안 된다.
                if (document.fonts) {
                    await Promise.allSettled(
                        family.split(",").map(f =>
                            document.fonts.load(`400 14px ${f.trim()}`, "0123456789 매수 매도 관망")),
                    );
                    await document.fonts.ready;
                }
                if (cancelled || !hostRef.current) return;

                // 여기서 처음으로 Phaser 가 로드된다. 이 줄이 도는 시점은 언제나 브라우저다.
                const { createGameConfig } = await import("@/lib/game/config");
                const PhaserLib = (await import("phaser")).default;

                // 모듈을 기다리는 사이에 화면을 떠났을 수 있다. 그러면 붙일 자리가 없다.
                if (cancelled || !hostRef.current) return;

                gameRef.current = new PhaserLib.Game(
                    createGameConfig({
                        parent: hostRef.current, insightPoints, fontFamily: family,
                    }),
                );

                // 화면을 돌리면 칸의 비율이 바뀐다. 설계 격자는 그 비율에서 나온 값이라
                // 같이 바꿔 줘야 하고, 안 그러면 FIT 이 옛 격자를 맞추느라 검은 띠를 남긴다.
                // 씬은 이 resize 를 듣고 **판을 그대로 둔 채** 그림만 다시 세운다.
                const { designSize } = await import("@/lib/game/ui/theme");
                if (cancelled) return;
                ro = new ResizeObserver(() => {
                    const game = gameRef.current, el = hostRef.current;
                    if (!game || !el) return;
                    const { width, height } = designSize(el.clientWidth, el.clientHeight);
                    if (game.scale.width === width && game.scale.height === height) return;
                    // resize() 가 아니라 setGameSize() + refresh() 다. resize() 는 Scale.RESIZE
                    // 모드용이라, FIT 에서는 격자만 바뀌고 표시 크기가 **옛 비율로** 남는다
                    // (세로 390x696 에서 가로로 돌리면 캔버스가 219x390 으로 그려졌다).
                    game.scale.setGameSize(width, height);
                    game.scale.refresh();
                });
                ro.observe(host);
            } catch (e) {
                if (!cancelled) {
                    console.error("[PhaserGame] 게임을 켜지 못했습니다", e);
                    setError("게임을 불러오지 못했습니다. 새로고침해 주세요.");
                }
            }
        })();

        return () => {
            cancelled = true;
            ro?.disconnect();
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
            // 캔버스가 읽어 갈 글꼴은 여기 한 줄이 정한다. 라틴·숫자는 Plex Mono, 한글은
            // Plex Sans KR, 둘 다 못 오면 시스템 고정폭. 변수는 (game)/layout.tsx 가 건다.
            style={{
                fontFamily:
                    'var(--font-plex-mono), var(--font-plex-kr), ui-monospace, "SFMono-Regular", Menlo, monospace',
            }}
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
