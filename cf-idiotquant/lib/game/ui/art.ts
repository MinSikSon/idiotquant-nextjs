// 그림. **한 장을 받아 여러 칸으로 잘라 쓴다.**
//
// ── 시트는 손으로 안 만든다 ─────────────────────────────────────
// `game-art-src/<키>.png` 에 그림을 넣고 `node scripts/build-game-sheet.mjs` 를 돌리면
// 시트(`public/game-art/sheet.png`)와 좌표표(`ui/artFrames.ts`)가 함께 다시 만들어진다.
// 좌표를 손으로 적던 때는 그림을 다시 뽑을 때마다 표와 시트가 어긋났다.
//
// ── 없는 그림은 없는 채로 굴러간다 ──────────────────────────────
// 소스가 없는 키는 표에 아예 안 들어가고, `drawArt` 가 null 을 낸다. 부르는 쪽은 그때
// 오늘의 자리표시(테두리 + 글자)를 그린다. **슬롯마다 따로 떨어지므로** 그림이 한 장씩
// 들어와도 그때마다 그 자리만 켜진다 — 다 모일 때까지 기다릴 것이 없다.
//
// ── 컨셉 시트에서 오린 넉 장은 이제 없다 ────────────────────────
// 처음에는 1408×768 짜리 4분할 컨셉 시트에서 넉 장을 오려 썼다. 나머지 열한 장이
// 한국 웹툰체로 들어오자 그 넉 장만 화풍이 튀었고, 무엇보다 **컨셉 시트의 라벨이
// 그림 안에 그대로 박혀 있었다** — 벤치의 「MISSION: SURVIVAL」, 방의 「ECHO OF IDEAS」.
// 우리 UI 가 아닌 남의 글자가 게임 화면에 떠 있는 셈이었다.
//
// 지금은 열다섯 장이 다 같은 화풍이고, 그림 안의 글자는 한글 달력·간판뿐이다.
// **새 그림을 뽑을 때 `no English text` 를 프롬프트에 넣을 것.**

import Phaser from "phaser";
import type { ArtKey } from "@/lib/game/core/interlude";
import { FRAMES } from "@/lib/game/ui/artFrames";
import { C } from "@/lib/game/ui/theme";

export type { ArtKey };

const SHEET = "game-sheet";
const SHEET_URL = "/game-art/sheet.webp";

/**
 * 그림 위에 덮는 겹의 진하기.
 *
 * 이 삽화는 크림색 바탕의 밝은 만화체다. 그대로 얹으면 그림만 화면에서 튀어나와 UI 가
 * 아니라 스티커로 보인다. 바탕색을 한 겹 덮어 화면 쪽으로 당긴다.
 * **진하다/옅다 싶으면 이 숫자 하나만 고치면 된다.**
 */
export const ART_VEIL = 0.28;
/**
 * 창 뒤 **책상**으로 깔 때의 세기. 그 위에 창이 서고 글자는 창 안에 있다.
 *
 * 0.28 은 그림을 화면 쪽으로 당기는 정도다. 여기까지 덮어야 **글자가 이긴다** — 삽화가
 * 크림색 만화체라 밝은 부분이 형광 초록보다 밝고, 그 위의 로그 한 줄이 안 읽힌다.
 * 더 덮으면(0.9 이상) 그림이 통째로 안 보여서 깐 뜻이 없어진다.
 */
export const ART_VEIL_BACK = 0.84;

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

/**
 * 그림이 아직 없는 자리가 **당장 빈 네모가 되지 않게** 대신 쓸 것.
 *
 * 새 슬롯을 열면 그 자리는 그림이 들어오기 전까지 자리표시(테두리 + 「그래픽 자리」)가
 * 된다. 그런데 시작 화면과 전환 막은 **여태 그림이 있던 자리**라, 슬롯을 여는 것만으로
 * 화면이 오히려 나빠진다. 그래서 가까운 그림으로 떨어뜨려 둔다.
 *
 * 그림이 들어오면 그 자리만 저절로 바뀐다 — 여기서 지울 것도 없다(있는 쪽이 먼저다).
 * 고객 얼굴과 엔딩에는 대신 쓸 것이 없다. 얼굴은 없으면 아예 안 그리고, 엔딩 넷은
 * 이미 그림이 다 있다.
 */
const FALLBACK: Partial<Record<ArtKey, ArtKey>> = {
    title: "home",
    "year-1997": "office",
    "year-1998": "office",
    "year-1999": "office",
    "year-2000": "office",
};

/** 이 자리에 실제로 그릴 칸. 없으면 null — 부르는 쪽이 오늘의 자리표시를 그린다. */
function resolve(scene: Phaser.Scene, key: ArtKey): ArtKey | null {
    if (!scene.textures.exists(SHEET)) return null;
    const t = scene.textures.get(SHEET);
    if (t.has(key)) return key;
    const alt = FALLBACK[key];
    return alt && t.has(alt) ? alt : null;
}

/** 그림을 그릴 수 있는가. 없으면 부르는 쪽이 오늘의 자리표시를 그린다. */
export function hasArt(scene: Phaser.Scene, key: ArtKey): boolean {
    return resolve(scene, key) !== null;
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
    opts: { veil?: number; cover?: boolean; tint?: number } = {},
): Phaser.GameObjects.GameObject[] | null {
    const use = resolve(scene, key);
    if (!use) return null;

    const [, , fw, fh] = FRAMES[use]!;
    // 칸보다 크면 줄이고, 작으면 키운다. 남는 쪽은 여백으로 둔다.
    // `cover` 면 반대로 **칸을 꽉 채우고** 넘치는 쪽을 잘라 낸다 — 배경으로 깔 때다.
    const k = opts.cover ? Math.max(w / fw, h / fh) : Math.min(w / fw, h / fh);
    const img = scene.add.image(x + w / 2, y + h / 2, SHEET, use).setScale(k);

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

    // **덮는 색은 그림이 놓인 바탕의 색이다.** 모니터 안이면 검정(`C.screen`), 창 뒤의
    // 책상이면 회색(`C.bg`) — 바탕과 다른 색으로 덮으면 그림이 그 자리에 안 앉고
    // 위에 떠 있는 판처럼 보인다.
    const veil = scene.add.graphics();
    veil.fillStyle(opts.tint ?? C.screen, opts.veil ?? ART_VEIL).fillRect(x, y, w, h);

    return [img, veil];
}
