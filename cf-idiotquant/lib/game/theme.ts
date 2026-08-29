// 캔버스 게임의 색·치수.
//
// 색은 화면(HTML) 쪽과 같은 팔레트를 쓴다(lib/retroPalette.ts). 캔버스는 "#rrggbb" 대신
// 0xrrggbb 를 받으므로 여기서 한 번만 바꿔 둔다 — 값을 두 벌로 적으면 어느 날 한쪽만 바뀐다.

import { R } from "@/lib/retroPalette";

const hex = (s: string) => Number.parseInt(s.slice(1), 16);

export const C = {
    bg: hex(R.bg),
    face: hex(R.face),
    faceLo: hex(R.faceLo),
    hi: hex(R.hi),
    lo: hex(R.lo),
    bar: hex(R.bar),
    barHi: hex(R.barHi),
    screen: hex(R.screen),
    ink: hex(R.ink),
    inkDim: hex(R.inkDim),
    inkHi: hex(R.inkHi),
    neon: hex(R.neon),
    pink: hex(R.pink),
    amber: hex(R.amber),
    /** 오르면 빨강, 내리면 파랑 — 한국 시장 색 */
    up: 0x9e1414,
    down: 0x1d4ed8,
} as const;

/** Phaser 텍스트는 "#rrggbb" 문자열을 받는다. 위 숫자와 짝이다. */
export const S = R;

/**
 * 설계 해상도. 실제 화면은 여기에 맞춰 늘어난다(Scale.FIT).
 *
 * 폰 세로 화면 하나에 다 담기는 크기다. 좌표를 전부 이 격자로 적어 두면 기기 크기를
 * 신경 쓰지 않아도 되고, 픽셀 폰트가 정수배로 커져 격자가 안 뭉갠다.
 */
export const W = 360;
export const H = 640;

/** 글자 크기 — 픽셀 폰트라 정수로만 쓴다. 사이 값은 자간이 무너진다. */
export const FS = { sm: 10, md: 12, lg: 16, xl: 28 } as const;

/** 판 하나의 규칙에 쓰는 치수. 화면 배치는 각 Scene 이 정한다. */
export const PAD = 8;
