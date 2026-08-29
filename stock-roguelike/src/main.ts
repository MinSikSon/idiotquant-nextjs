// 진입점 — 게임 인스턴스를 만들고 씬을 등록한다. 여기 있는 것은 그것뿐이다.

import Phaser from "phaser";
import { TradingScene } from "@/scenes/TradingScene";
import { W, H, C } from "@/ui/theme";

const parent = document.getElementById("game");
if (!parent) throw new Error("#game 을 찾지 못했습니다. index.html 을 확인하세요.");

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: C.bg,
    // 설계 격자(390×844)로 그리고 기기에 맞춰 통째로 늘린다. 좌표를 한 격자로만 적으면
    // 되고, 390px 폰에서는 배율이 1.0 이라 도트가 정확히 떨어진다.
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // 격자를 살린다. 안티에일리어싱이 붙으면 1px 선과 도트가 흐려진다.
    pixelArt: true,
    roundPixels: true,
    // 폰에서 스크롤 제스처가 게임 입력을 가로채지 않게.
    input: { activePointers: 2 },
    scene: [TradingScene],
});

// 캔버스가 올라오면 로딩 글자를 치운다.
game.events.once(Phaser.Core.Events.READY, () => {
    document.getElementById("boot")?.classList.add("gone");
});

// 개발 중 콘솔에서 만져 볼 수 있게. 빌드에서는 tree-shaking 대상이 아니라 남지만,
// 게임 하나짜리 앱이라 감수한다.
if (import.meta.env.DEV) {
    (window as unknown as { game: Phaser.Game }).game = game;
}
