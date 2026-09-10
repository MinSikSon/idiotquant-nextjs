// **이 파일은 손으로 고치지 않는다.**
// `node scripts/build-game-sheet.mjs` 가 `game-art-src/` 를 읽어 다시 쓴다.
//
// 아직 그림이 없는 자리: 없다
// 표에 없는 키는 `drawArt` 가 null 을 내고, 화면이 오늘의 자리표시를 그린다.

import type { ArtKey } from "@/lib/game/core/interlude";

export const SHEET_W = 1280;
export const SHEET_H = 1120;

/** 시트 안의 칸. 없는 키는 그림이 아직 없다는 뜻이다. */
export const FRAMES: Partial<Record<ArtKey, readonly [number, number, number, number]>> = {
    "title": [0, 0, 320, 320],
    "home": [320, 0, 320, 320],
    "office": [640, 0, 320, 320],
    "year-1997": [960, 0, 320, 320],
    "year-1998": [0, 320, 320, 320],
    "year-1999": [320, 320, 320, 320],
    "year-2000": [640, 320, 320, 320],
    "park-debtCleared": [960, 320, 320, 320],
    "park-debtRemains": [0, 640, 320, 320],
    "park-burnout": [320, 640, 320, 320],
    "park-ruined": [640, 640, 320, 320],
    "client-kim": [0, 960, 160, 160],
    "client-mother": [160, 960, 160, 160],
    "client-park": [320, 960, 160, 160],
    "client-choi": [480, 960, 160, 160],
};
