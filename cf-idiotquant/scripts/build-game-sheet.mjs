// 게임 그림 시트를 만든다. **폴더가 곧 표다.**
//
//   node scripts/build-game-sheet.mjs
//
// `game-art-src/<키>.webp`(또는 .png/.jpg) 를 읽어 한 장으로 붙이고, 좌표표를 코드로 뱉는다.
//
//   public/game-art/sheet.png    붙인 시트 (게임이 받는 것)
//   lib/game/ui/artFrames.ts     좌표표 (게임이 자르는 데 쓰는 것)
//
// ── 왜 손으로 안 적는가 ─────────────────────────────────────────
// 예전에는 좌표를 `interlude.ts` 에 손으로 적었다. 그림을 다시 뽑을 때마다 시트와 표가
// 어긋났고, 어디를 오렸는지는 주석에만 남아 있었다. 이제 파일 이름이 키이고 좌표는
// 계산된다 — 어긋날 자리가 없다.
//
// ── 없는 그림은 없는 채로 둔다 ──────────────────────────────────
// 소스가 없는 키는 표에 **아예 안 들어간다.** 그러면 `drawArt` 가 null 을 내고 화면은
// 오늘의 자리표시(테두리 + 글자)를 그린다. 그림이 한 장씩 들어와도 그때마다 그 자리만
// 켜진다 — 다 모일 때까지 기다릴 것이 없다.
//
// ── 같은 그림 두 키는 칸을 나눠 쓴다 ────────────────────────────
// 엔딩 넷 중 둘은 지금 같은 그림이다. 그대로 두 칸을 쓰면 시트가 헛되이 커지므로,
// 줄인 결과가 바이트까지 같으면 **같은 칸을 가리키게** 한다.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "game-art-src");
const OUT_SHEET = join(ROOT, "public/game-art/sheet.webp");
const OUT_TS = join(ROOT, "lib/game/ui/artFrames.ts");

/** 시트 한 줄에 들어가는 장면 수. 320 × 4 = 1280 이 시트 폭이 된다. */
const SCENE_COLS = 4;
const SCENE = 320;
const FACE = 160;
const WIDTH = SCENE * SCENE_COLS;

/**
 * 슬롯 전부. **`core/interlude.ts` 의 `ART_KEYS` 와 같아야 한다.**
 *
 * 여기서 다시 적는 이유: 이 스크립트는 빌드 전에도 도는 순수 node 라 TS 를 못 읽는다.
 * 대신 아래 `checkKeys()` 가 두 목록이 어긋나면 소리를 낸다.
 */
const KEYS = [
    "title", "home", "office",
    "year-1997", "year-1998", "year-1999", "year-2000",
    "park-debtCleared", "park-debtRemains", "park-burnout", "park-ruined",
    "client-kim", "client-mother", "client-park", "client-choi",
];

const cellOf = (key) => (key.startsWith("client-") ? FACE : SCENE);

/**
 * 이 키의 소스 파일. **확장자를 안 따진다.**
 *
 * 저장소에 넣는 것은 WebP 다 — 같은 그림이 PNG 로는 190KB, WebP q92 로는 40KB 라
 * 열다섯 장이면 2.5MB 와 600KB 로 갈린다. 새 그림을 PNG 로 떨궈도 그대로 돌아가게
 * 둘 다 받는다.
 */
const srcOf = (key) => [".webp", ".png", ".jpg"]
    .map(ext => join(SRC, key + ext))
    .find(existsSync) ?? null;

/** `interlude.ts` 의 목록과 어긋나면 여기서 멈춘다. 조용히 갈라지는 것이 제일 나쁘다. */
function checkKeys() {
    const ts = readFileSync(join(ROOT, "lib/game/core/interlude.ts"), "utf8");
    const block = ts.match(/export const ART_KEYS[^=]*=\s*\[([\s\S]*?)\]/);
    if (!block) throw new Error("interlude.ts 에서 ART_KEYS 를 못 찾았다");
    const there = [...block[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
    const missing = there.filter(k => !KEYS.includes(k));
    const extra = KEYS.filter(k => !there.includes(k));
    if (missing.length || extra.length) {
        throw new Error(`ART_KEYS 와 어긋난다 — 여기 없는 것 ${missing} / 저기 없는 것 ${extra}`);
    }
}

/**
 * 칸에 맞춰 줄인다. **비율은 안 건드린다** — 늘려서 채우면 인물이 찌그러진다.
 * 남는 쪽은 투명으로 둔다: 게임이 어느 바탕 위에 얹을지 여기서는 모른다.
 */
async function fit(file, side) {
    return sharp(file)
        .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
}

async function main() {
    checkKeys();

    const have = KEYS.filter(k => srcOf(k) !== null);
    if (have.length === 0) throw new Error(`${SRC} 에 그림이 하나도 없다`);

    // 먼저 전부 줄여 둔다. 그래야 같은 그림인지 바이트로 견줄 수 있다.
    const buf = new Map();
    for (const key of have) buf.set(key, await fit(srcOf(key), cellOf(key)));

    // 자리를 잡는다 — 장면 먼저(320 격자), 얼굴은 그 아래(160 격자).
    // 같은 그림이면 이미 잡아 둔 자리를 그대로 가리킨다.
    const frames = {};
    const put = [];
    const seen = new Map();
    let x = 0, y = 0, rowH = 0;

    const place = (keys, side) => {
        if (x > 0) { y += rowH; x = 0; rowH = 0; }   // 크기가 바뀌면 줄을 바꾼다
        for (const key of keys) {
            const b = buf.get(key);
            const sig = createHash("sha1").update(b).digest("hex");
            const same = seen.get(sig);
            if (same) { frames[key] = same; continue; }

            if (x + side > WIDTH) { y += rowH; x = 0; rowH = 0; }
            const rect = [x, y, side, side];
            frames[key] = rect;
            seen.set(sig, rect);
            put.push({ input: b, left: x, top: y });
            x += side;
            rowH = Math.max(rowH, side);
        }
    };

    place(have.filter(k => cellOf(k) === SCENE), SCENE);
    place(have.filter(k => cellOf(k) === FACE), FACE);
    const height = y + rowH;

    mkdirSync(dirname(OUT_SHEET), { recursive: true });
    await sharp({
        create: { width: WIDTH, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
        .composite(put)
        // **WebP 다.** 같은 그림이 PNG 팔레트로는 600KB, 여기서는 280KB 다.
        // 팔레트를 128색으로 줄여도 300KB 인데 그때는 평평한 면에 디더가 눈에 띄었다 —
        // 만화체라 넓은 단색 면이 많아서 그 손해가 바로 보인다.
        // 그림은 화면에서 겹에 덮이고 줄어들어 붙으므로 q88 의 손해는 안 보인다.
        .webp({ quality: 88, effort: 6 })
        .toFile(OUT_SHEET);

    const rows = KEYS
        .filter(k => frames[k])
        .map(k => `    "${k}": [${frames[k].join(", ")}],`)
        .join("\n");
    const missing = KEYS.filter(k => !frames[k]);

    writeFileSync(OUT_TS, `// **이 파일은 손으로 고치지 않는다.**
// \`node scripts/build-game-sheet.mjs\` 가 \`game-art-src/\` 를 읽어 다시 쓴다.
//
// 아직 그림이 없는 자리: ${missing.length ? missing.join(", ") : "없다"}
// 표에 없는 키는 \`drawArt\` 가 null 을 내고, 화면이 오늘의 자리표시를 그린다.

import type { ArtKey } from "@/lib/game/core/interlude";

export const SHEET_W = ${WIDTH};
export const SHEET_H = ${height};

/** 시트 안의 칸. 없는 키는 그림이 아직 없다는 뜻이다. */
export const FRAMES: Partial<Record<ArtKey, readonly [number, number, number, number]>> = {
${rows}
};
`);

    const bytes = readFileSync(OUT_SHEET).length;
    console.log(`시트 ${WIDTH}x${height}, ${(bytes / 1024).toFixed(0)}KB, 칸 ${Object.keys(frames).length}/${KEYS.length}`);
    if (missing.length) console.log(`아직 없는 그림: ${missing.join(", ")}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
