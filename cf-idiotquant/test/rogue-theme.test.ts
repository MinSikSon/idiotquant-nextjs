// 게임의 색은 **한 자리에만 있다** — 그것이 밝은 테마가 서 있는 유일한 근거다.
//
// 색을 화면 파일에 직접 적으면 그 자리만 테마를 안 따라간다. 화면은 멀쩡히 그려지고,
// 밝은 테마에서 **그 글자 하나만 안 보인다.** 던전은 글자판이라 한 색이 어긋나면 그
// 종류의 칸이 통째로 사라진 것처럼 읽힌다 — 사람은 지도가 잘못 그려진 줄 안다.
//
// 그래서 셋을 건다.
//
//   ① 화면 파일에 `#rrggbb` 가 **하나도** 없다.
//   ② 화면이 쓰는 `--rg-*` 가 전부 `global.css` 에 있다 — 오타 하나면 그 색은
//      `var()` 가 빈 값이 되어 **글자가 부모 색으로 흘러내린다.**
//   ③ 밝은 쪽과 어두운 쪽이 **같은 이름 목록**을 갖는다. 한쪽에만 있으면 그 테마에서만
//      색이 빠지고, 그건 다른 테마를 켜 보기 전에는 안 보인다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const GAME = "app/(game)/game";
const CSS = "app/global.css";

/** 게임 화면이 그리는 파일들 — 옛 게임(`imf/`)은 캔버스라 규칙이 다르다. */
function viewFiles(): string[] {
    const out: string[] = [];
    for (const dir of [GAME, `${GAME}/components`]) {
        for (const f of readdirSync(path.join(ROOT, dir))) {
            if (f.endsWith(".tsx") || (f.endsWith(".ts") && f !== "monsterArt.ts")) {
                out.push(`${dir}/${f}`);
            }
        }
    }
    return out;
}

/**
 * 그 선택자로 열린 블록들의 속. **여럿일 수 있다** — `:root` 는 레이아웃 값에도 쓰여서
 * 먼저 나온 것 하나만 보면 팔레트를 통째로 놓친다(실제로 그랬다).
 */
function block(selector: string): string {
    const css = read(CSS);
    let out = "";
    for (let at = 0; ; ) {
        at = css.indexOf(`\n${selector} {`, at);
        if (at === -1) break;
        const end = css.indexOf("\n}", at);
        out += css.slice(at, end);
        at = end;
    }
    assert.notEqual(out, "", `${CSS} 에 ${selector} 블록이 없다`);
    return out;
}

/** 그 블록에 적힌 `--rg-*` 이름들. */
function declared(selector: string): Set<string> {
    return new Set(block(selector).match(/--rg-[a-z-]+(?=\s*:)/g) ?? []);
}

test("게임 화면 파일에는 색을 직접 적지 않는다", () => {
    for (const f of viewFiles()) {
        const hex = read(f).match(/#[0-9a-fA-F]{6}\b/g);
        assert.equal(
            hex,
            null,
            `${f} 에 색이 박혀 있다: ${hex?.join(", ")} — global.css 의 --rg-* 로 옮길 것`,
        );
    }
});

test("화면이 쓰는 --rg-* 가 전부 global.css 에 있다", () => {
    const light = declared(":root");
    const used = new Set<string>();
    for (const f of viewFiles()) {
        for (const name of read(f).match(/--rg-[a-z-]+/g) ?? []) used.add(name);
    }
    assert.ok(used.size > 20, `쓰이는 색이 ${used.size}개뿐 — 훑는 자리가 틀렸다`);
    const missing = [...used].filter((n) => !light.has(n));
    assert.deepEqual(missing, [], `${CSS} 에 없는 이름: ${missing.join(", ")}`);
});

test("밝은 쪽과 어두운 쪽이 같은 이름을 갖는다", () => {
    const light = declared(":root");
    const dark = declared("html.dark");
    const onlyLight = [...light].filter((n) => !dark.has(n));
    const onlyDark = [...dark].filter((n) => !light.has(n));
    assert.deepEqual(onlyLight, [], `어두운 쪽에 없다: ${onlyLight.join(", ")}`);
    assert.deepEqual(onlyDark, [], `밝은 쪽에 없다: ${onlyDark.join(", ")}`);
});

test("기억한 칸(-dim)은 지금 보이는 칸보다 **흐리다** — 테마마다 방향이 뒤집힌다", () => {
    // 어두운 테마에서 흐리다 = 더 어둡다. 밝은 테마에서 흐리다 = 더 밝다.
    // 방향을 그대로 두면 기억이 현재보다 진해져서 지도가 거꾸로 읽힌다.
    const value = (selector: string, name: string) => {
        const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block(selector));
        assert.ok(m, `${selector} 에 ${name} 이 없다`);
        return m![1];
    };
    /** 대충의 밝기 — 순서만 보면 되므로 합으로 충분하다. */
    const lum = (hex: string) =>
        parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);

    for (const base of ["--rg-wall", "--rg-floor", "--rg-corridor", "--rg-door", "--rg-trap"]) {
        assert.ok(
            lum(value("html.dark", `${base}-dim`)) < lum(value("html.dark", base)),
            `어두운 테마에서 ${base}-dim 이 ${base} 보다 안 어둡다`,
        );
        assert.ok(
            lum(value(":root", `${base}-dim`)) > lum(value(":root", base)),
            `밝은 테마에서 ${base}-dim 이 ${base} 보다 안 밝다`,
        );
    }
});
