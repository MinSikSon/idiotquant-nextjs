// Phaser 게임 설정 한 곳.
//
// ── 이 파일이 서버에서 평가되면 안 된다 ──────────────────────────────
// 여기서 `phaser` 를 정적으로 import 하고 있고, Phaser 는 모듈이 로드되는 순간
// `window` · `document` 를 만진다. Next.js 의 서버 렌더링 단계에는 그 둘이 없으므로
// 이 파일이 서버 그래프에 들어오면 그대로 터진다.
//
// 그래서 **아무도 이 파일을 정적으로 import 하지 않는다.** PhaserGame.tsx 가
// `await import("@/lib/game/config")` 로 useEffect 안에서만 불러온다 — 그 시점은
// 브라우저이고, window 가 있다.

import Phaser from "phaser";
import { C, designSize } from "@/lib/game/ui/theme";
import { TradingScene } from "@/lib/game/scenes/TradingScene";

export interface GameOptions {
    /** 캔버스를 붙일 자리. PhaserGame.tsx 의 div. */
    parent: HTMLElement;
    /** 지난 런에서 넘어온 인사이트. 없으면 0 부터. */
    insightPoints?: number;
    /**
     * 실제로 그릴 글꼴 이름. next/font 가 만든 해시 이름이라 React 쪽이 DOM 에서 읽어
     * 넘긴다. 안 주면 theme 의 시스템 고정폭으로 떨어진다.
     */
    fontFamily?: string;
}

/**
 * 설정을 값이 아니라 **함수로** 내보낸다.
 *
 * 상수로 두면 이 파일이 로드되는 순간 config 객체가 만들어지고, 그 안의
 * `Phaser.AUTO` · `Phaser.Scale.FIT` 가 즉시 평가된다. 함수로 두면 실제로 게임을
 * 켤 때까지 아무 일도 안 일어나서, 모듈을 미리 받아 두는 것과 켜는 것을 가를 수 있다.
 */
export function createGameConfig(o: GameOptions): Phaser.Types.Core.GameConfig {
    // 짧은 쪽을 고정하고 긴 쪽을 이 칸에서 받는다. 그래야 FIT 의 배율이 칸에 정확히
    // 맞아떨어져 여백이 0 이 된다 — 격자를 통째로 고정하면 FIT 이 둘 중 작은 쪽에
    // 맞추느라 화면을 줄이고 나머지를 검은 띠로 남긴다.
    const { width, height } = designSize(o.parent.clientWidth, o.parent.clientHeight);

    return {
        type: Phaser.AUTO,
        parent: o.parent,
        width,
        height,
        backgroundColor: C.bg,

        // 설계 격자로 그리고 기기에 맞춰 통째로 늘린다. 좌표를 한 격자로만 적으면 되고,
        // 390px 폰에서는 배율이 1.0 이라 도트가 정확히 떨어진다.
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },

        // 도트를 살린다. 안티에일리어싱이 붙으면 1px 격자와 캔들 몸통이 흐려진다.
        pixelArt: true,
        roundPixels: true,

        // 폰에서 두 손가락 제스처가 입력을 가로채지 않게.
        input: { activePointers: 2 },

        // 배너를 끈다 — 콘솔이 이 게임 것으로만 남아야 디버깅이 쉽다.
        banner: false,

        scene: [TradingScene],
        // 씬은 init(data) 와 fontOf(scene) 로 이 값들을 받는다.
        callbacks: {
            preBoot: game => {
                // **줬을 때만 넣는다.** 0 을 넣어 두면 씬의
                // `data ?? registry ?? loadProgress()` 에서 registry 가 언제나 이겨,
                // 저장해 둔 인사이트가 한 번도 안 쓰인다(시작 유물이 늘 하나였다).
                if (o.insightPoints !== undefined) game.registry.set("insightPoints", o.insightPoints);
                if (o.fontFamily) game.registry.set("fontFamily", o.fontFamily);
            },
        },
    };
}
