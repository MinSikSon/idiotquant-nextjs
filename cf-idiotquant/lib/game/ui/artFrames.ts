// **이 파일은 손으로 고치지 않는다.**
// `node scripts/build-game-sheet.mjs` 가 `game-art-src/` 를 읽어 다시 쓴다.
//
// 아직 그림이 없는 자리: title, year-1997, year-1998, year-1999, year-2000, client-kim, client-mother, client-park, client-choi
// 표에 없는 키는 `drawArt` 가 null 을 내고, 화면이 오늘의 자리표시를 그린다.

import type { ArtKey } from "@/lib/game/core/interlude";

export const SHEET_W = 1280;
export const SHEET_H = 320;

/** 시트 안의 칸. 없는 키는 그림이 아직 없다는 뜻이다. */
export const FRAMES: Partial<Record<ArtKey, readonly [number, number, number, number]>> = {
    "home": [0, 0, 320, 320],
    "office": [320, 0, 320, 320],
    "park-debtCleared": [640, 0, 320, 320],
    "park-debtRemains": [640, 0, 320, 320],
    "park-burnout": [960, 0, 320, 320],
    "park-ruined": [960, 0, 320, 320],
};
