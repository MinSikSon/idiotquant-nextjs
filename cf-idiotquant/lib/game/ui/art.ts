// 그림. **한 장을 받아 넉 장으로 잘라 쓴다.**
//
// ── 왜 파일이 하나인가 ──────────────────────────────────────────
// 원본은 1408×768 짜리 4분할 컨셉 시트였고 1.7MB 였다. 폰에서 게임 하나 켜자고 받기엔
// 크고, 그중 실제로 쓰는 것은 네 조각뿐이다. 그래서 네 조각을 320×320 씩 잘라 2×2 로
// 붙인 640×640 한 장(190KB)을 만들어 두었다. 파일은 하나로 남고, 자르기는 코드가 한다.
//
// ── 원본에서 어디를 오렸는가 ────────────────────────────────────
// 시트를 다시 뽑아야 할 때 이 값이 없으면 처음부터 다시 찍어야 한다. `sharp` 로
// `extract` 한 뒤 `fit: "contain"` 으로 320×320 에 앉히고 남는 쪽은 배경색으로 채웠다.
//
//   home    (12,  52, 270×290)  벗겨진 벽 · 「ECHO OF IDEAS」 간판 · 바닥에 깐 매트리스
//   office  (292, 48, 300×252)  책상 위 CRT 두 대 — 떨어지는 차트와 「CRISIS」
//   park    (735,448, 330×302)  공원 벤치 · 노트북 · 나무
//   figure  (38, 448, 215×307)  해진 옷을 입고 컵과 빵을 든 사람
//
// 원본의 WORLD MAP 패널은 안 썼다 — 세계지도는 넣지 않기로 했다.

import Phaser from "phaser";
import { FRAMES, type ArtKey } from "@/lib/game/core/interlude";

export type { ArtKey };

const SHEET = "game-sheet";
const SHEET_URL = "/game-art/sheet.png";

/**
 * 그림 위에 덮는 겹의 진하기.
 *
 * 이 삽화는 크림색 바탕의 밝은 만화체이고 게임은 짙은 청록 터미널이다. 그대로 얹으면
 * 그림만 화면에서 튀어나와 UI 가 아니라 스티커로 보인다. 배경색을 한 겹 덮어 화면 쪽으로
 * 당긴다. **진하다/옅다 싶으면 이 숫자 하나만 고치면 된다.**
 */
export const ART_VEIL = 0.28;
/**
 * 배경으로 깔 때의 세기. **글자가 그 위에 올라온다**(회사 화면의 로그).
 *
 * 0.28 은 그림을 화면 쪽으로 당기는 정도라 글자를 얹으면 밝은 부분에서 대비가 무너진다.
 * 여기까지 덮으면 그림은 분위기로만 남고 글자가 이긴다. 더 덮으면(0.8 이상) 그림이
 * 통째로 안 보여서 배경을 깐 뜻이 없어진다 — 실제로 그랬다.
 */
export const ART_VEIL_BACK = 0.78;

/**
 * 시트를 받는다. `preload()` 에서 부른다.
 *
 * **없는 파일에 로더가 걸리지 않게 한다** — `loaderror` 를 안 잡으면 시트가 없을 때
 * 로더가 그 자리에서 멈추고 `create()` 가 안 불린다. 그림이 아직 없어도 게임은 돌아야 한다.
 */
export function preloadArt(scene: Phaser.Scene): void {
    scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
        console.warn(`[game] ${SHEET_URL} 을 못 받았다. 그림 자리는 자리표시로 남는다.`);
    });
    scene.load.image(SHEET, SHEET_URL);
}

/** 시트를 이름 붙은 칸으로 쪼갠다. `create()` 첫 줄에서 부른다. */
export function sliceArt(scene: Phaser.Scene): void {
    if (!scene.textures.exists(SHEET)) return;
    const t = scene.textures.get(SHEET);
    for (const [key, [x, y, w, h]] of Object.entries(FRAMES)) {
        if (!t.has(key)) t.add(key, 0, x, y, w, h);
    }
}

/** 그림을 그릴 수 있는가. 없으면 부르는 쪽이 오늘의 자리표시를 그린다. */
export function hasArt(scene: Phaser.Scene, key: ArtKey): boolean {
    return scene.textures.exists(SHEET) && scene.textures.get(SHEET).has(key);
}

/**
 * 칸 안에 그림을 앉힌다. **비율은 안 건드린다** — 늘려서 채우면 인물이 찌그러진다.
 *
 * 그림과 그 위를 덮는 겹을 **함께** 돌려준다. 부르는 쪽은 받은 것을 전부 화면 목록에
 * 넣으면 되고, 겹을 따로 챙길 일이 없다.
 *
 * @returns 그림이 없으면 `null`.
 */
export function drawArt(
    scene: Phaser.Scene, key: ArtKey, x: number, y: number, w: number, h: number,
    opts: { veil?: number; cover?: boolean } = {},
): Phaser.GameObjects.GameObject[] | null {
    if (!hasArt(scene, key)) return null;

    const [, , fw, fh] = FRAMES[key];
    // 칸보다 크면 줄이고, 작으면 키운다. 남는 쪽은 여백으로 둔다.
    // `cover` 면 반대로 **칸을 꽉 채우고** 넘치는 쪽을 잘라 낸다 — 배경으로 깔 때다.
    const k = opts.cover ? Math.max(w / fw, h / fh) : Math.min(w / fw, h / fh);
    const img = scene.add.image(x + w / 2, y + h / 2, SHEET, key).setScale(k);

    // 꽉 채운 그림은 칸 밖으로 넘친다 — **원본 좌표로 잘라 낸다.** 안 자르면 배경이
    // 위아래 띠를 덮어 로그와 손패 위에 사무실이 겹쳐 그려진다.
    if (opts.cover) {
        const sw = Math.min(fw, w / k);
        const sh = Math.min(fh, h / k);
        img.setCrop((fw - sw) / 2, (fh - sh) / 2, sw, sh);
    }

    // 만화체라 **LINEAR** 로 둔다. NEAREST 를 걸면 줄일 때 계단이 진다.
    // (도트 그림으로 바꾸면 그때 뒤집는다.)
    scene.textures.get(SHEET).setFilter(Phaser.Textures.FilterMode.LINEAR);

    const veil = scene.add.graphics();
    veil.fillStyle(0x0e1618, opts.veil ?? ART_VEIL).fillRect(x, y, w, h);

    return [img, veil];
}
