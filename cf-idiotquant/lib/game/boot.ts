// 게임을 켠다.
//
// 단계가 곧 Scene 이다 — 준비(ready) → 시작(play) → 종료(result) → 다시 준비.
// 화면 상태를 따로 들지 않는다: 지금 무엇이 도는지는 Phaser 가 알고 있고, 단계를 하나
// 더 붙일 일이 생기면 Scene 하나를 아래 목록에 얹으면 된다.

import Phaser from "phaser";
import { C, W, H } from "./theme";
import { ReadyScene } from "./scenes/ReadyScene";
import { PlayScene } from "./scenes/PlayScene";
import { ResultScene } from "./scenes/ResultScene";

export interface BootOpts {
    parent: HTMLElement;
    /** 실제로 그릴 글꼴 이름. next/font 가 만든 해시 이름이라 React 쪽이 읽어서 넘긴다. */
    fontFamily: string;
}

export function boot({ parent, fontFamily }: BootOpts): Phaser.Game {
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width: W,
        height: H,
        backgroundColor: C.bg,
        // 설계 격자(360×640)로 그리고 기기 크기에 맞춰 통째로 늘린다. 좌표를 한 격자로만
        // 적으면 되고, 픽셀 폰트도 정수배에 가깝게 커져 글자가 안 뭉갠다.
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        // 격자를 살린다. 안티에일리어싱이 붙으면 베벨 2px 이 흐려져 90년대 기기가 안 된다.
        pixelArt: true,
        roundPixels: true,
        scene: [ReadyScene, PlayScene, ResultScene],
    });

    // 모든 Scene 이 같은 글꼴을 쓰게 한 곳에 둔다.
    game.registry.set("fontFamily", fontFamily);
    return game;
}
