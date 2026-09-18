// 게임 칸의 높이는 **루트 레이아웃과 같은 자로 재야 한다.**
//
// 아이폰 사파리에서 주소창이 접히면 화면이 커진다. `dvh` 는 그 값을 따라가고 `svh` 는
// 주소창이 보일 때의 값에 머문다. 루트 `<main>` 은 `min-h-[100dvh]` 인데 게임 칸만
// `100svh` 로 재고 있었고, 그래서 주소창이 접힐 때마다 **그 차이가 그대로 검은 빈 칸**
// 으로 화면 아래에 남았다.
//
// 이건 브라우저로 못 잡는다 — 헤드리스 크로뮴에는 주소창이 없어서 `svh` 와 `dvh` 가
// 같은 값이고, 재 보면 고치기 전에도 멀쩡하다. 그래서 **두 파일이 서로 맞는지**를
// 글자로 본다.
//
// 여기서 지키는 것 둘:
//   ① 같은 자를 쓴다 (둘 다 `dvh`)
//   ② 빼는 숫자가 실제 바 높이의 합과 같다 (48 + 64 = 112)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

const LAYOUT = "app/layout.tsx";
const GAME = "app/(game)/game/page.tsx";
const NAV = "components/navigation.tsx";

test("게임 칸은 루트와 같은 자(dvh)로 잰다", () => {
    // ── 루트 레이아웃은 dvh 로 잰다
    {
        const s = read(LAYOUT);
        assert.match(s, /min-h-\[100dvh\]/, `${LAYOUT} 이 100dvh 를 안 쓴다`);
    }

    // ── 게임 칸도 **같은 자**로 잰다 — svh 를 쓰면 주소창이 접힐 때 빈 칸이 남는다
    {
        const s = read(GAME);
        const box = /h-\[calc\(100(\w+)-(\d+)px\)\]/.exec(s);
        assert.ok(box, `${GAME} 에서 높이 식을 못 찾았다`);
        assert.equal(
            box![1],
            "dvh",
            "게임 칸이 루트(dvh)와 다른 자를 쓴다 — 주소창이 접히면 그 차이가 빈 칸이 된다",
        );
        // 데스크톱 쪽도 같은 자여야 한다.
        assert.match(s, /md:h-dvh/, `${GAME} 의 md 높이가 dvh 가 아니다`);
        assert.doesNotMatch(s.replace(/\/\*[\s\S]*?\*\//g, ""), /svh/, "주석 밖에 svh 가 남아 있다");
    }
});

test("빼는 숫자가 실제 바 높이의 합이다", () => {
    // ── 빼는 숫자는 실제 바 높이의 합이다 — 한쪽만 바뀌면 그 차이가 빈 칸이 된다
    {
        const layout = read(LAYOUT);
        const pt = /pt-\[(\d+)px\]/.exec(layout);
        const pb = /pb-\[(\d+)px\]/.exec(layout);
        assert.ok(pt && pb, `${LAYOUT} 에서 위아래 여백을 못 찾았다`);

        const game = read(GAME);
        const off = /h-\[calc\(100dvh-(\d+)px\)\]/.exec(game);
        assert.ok(off, `${GAME} 에서 빼는 숫자를 못 찾았다`);

        assert.equal(
            Number(off![1]),
            Number(pt![1]) + Number(pb![1]),
            `게임 칸이 빼는 ${off![1]}px 가 레이아웃의 여백 합(${pt![1]}+${pb![1]})과 다르다`,
        );
    }

    // ── 그 여백은 실제 바의 높이와 같다 — 숫자가 세 곳에 있다
    {
        const layout = read(LAYOUT);
        const nav = read(NAV);
        const pt = Number(/pt-\[(\d+)px\]/.exec(layout)![1]);
        const pb = Number(/pb-\[(\d+)px\]/.exec(layout)![1]);

        // 위 머리줄과 아래 탭 바는 `md:hidden fixed` 라 흐름에서 빠져 있다. 그래서 그 높이를
        // 레이아웃이 여백으로 대신 만들어 주는데, 둘이 어긋나면 가려지거나 빈 칸이 남는다.
        assert.ok(
            nav.includes(`h-[${pt}px]`),
            `위 머리줄의 높이가 ${pt}px 가 아니다 — 레이아웃의 pt 와 어긋난다`,
        );
        assert.ok(
            nav.includes(`h-[${pb}px]`),
            `아래 탭 바의 높이가 ${pb}px 가 아니다 — 레이아웃의 pb 와 어긋난다`,
        );
    }
});

// ── 명령 단추는 **세 개씩 딱 떨어져야** 한다 ────────────────────────────────
//
// 단추 판은 세 칸 격자다(`TouchPad` 의 `grid-cols-3`). 개수가 3의 배수가 아니면
// **마지막 줄만 이가 빠지고**, 그 순간 「한 줄이 한 묶음」이 깨진다 — 계단 둘이 나란히,
// 배낭에서 꺼내 쓰는 것들이 한 줄에, 라는 자리 약속이 거기서 무너진다.
//
// 사람이 세다가 틀리는 자리라 여기서 센다. 단추 하나를 더하거나 뺄 때는 **셋 단위로**.

test("명령 단추는 세 개씩 딱 떨어진다", () => {
    const s = read("app/(game)/game/Rogue.tsx");
    const from = s.indexOf("const actions: PadAction[] = [");
    assert.ok(from >= 0, "Rogue.tsx 에서 명령 단추 목록을 못 찾았다");
    const to = s.indexOf("\n    ];", from);
    assert.ok(to > from, "명령 단추 목록의 끝을 못 찾았다");

    const n = (s.slice(from, to).match(/label:/g) ?? []).length;
    assert.ok(n > 0, "명령 단추가 하나도 없다");
    assert.equal(
        n % 3,
        0,
        `명령 단추가 ${n} 개다 — 세 칸 격자라 마지막 줄만 이가 빠진다. 셋 단위로 더하거나 뺄 것`,
    );
});

// 끊김 안내는 **모서리 한 칸만 쓴다.**
//
// 거쳐 온 길이 둘이다. 처음에는 지도 한가운데 위에 띠로 떠 있었고, 390px 에서 초대 단추까지
// 두 줄로 접히며 **내가 선 자리와 앞의 몬스터를 덮었다**(재 보니 13285px²). 그래서 지도 밖
// 한 줄로 내렸더니 이번에는 **지도가 그만큼 줄었다.** 끊긴 동안에도 방장은 계속 논다 —
// 가리는 것도 줄이는 것도 값을 치른다.
//
// 지금 거는 것: **늘 떠 있는 것은 우상단 작은 단추 하나**이고, 본문은 **눌러야** 펼쳐진다.
// 끊긴 상태를 브라우저에서 매번 만들기가 까다로워 글자로 건다.
test("끊김 안내는 늘 떠 있는 작은 단추 하나다 — 본문은 눌러야 뜬다", () => {
    const s = read("app/(game)/game/Rogue.tsx");

    // ── 안내 자체는 있어야 한다 — 없애서 통과시키면 안 된다
    const idx = s.indexOf("{online && !linked && (");
    assert.ok(idx > 0, "끊김 안내가 통째로 사라졌다 — 누른 키가 안 먹는 까닭을 어디서도 안 적는다");
    const stop = s.indexOf("{/* 층 돌발 이벤트", idx);
    assert.ok(stop > idx, "안내 블록의 끝을 못 찾았다 — 이 테스트가 무엇을 재는지 잃었다");
    const block = s.slice(idx, stop);

    // ── 늘 떠 있는 쪽은 **크기가 못 박힌 단추**다 (모서리 한 칸)
    assert.match(block, /\bh-7 w-7\b/, "늘 떠 있는 단추의 크기가 안 박혀 있다 — 글이 길어지면 지도를 덮는다");
    assert.match(block, /absolute top-1 right-1/, "단추가 우상단에 안 붙어 있다");

    // ── 본문은 **눌러야** 뜬다 — 늘 떠 있으면 안 된다
    const bodyAt = block.indexOf("{netOpen && (");
    assert.ok(bodyAt > 0, "본문이 `netOpen` 뒤에 안 숨어 있다 — 안 눌러도 지도를 덮는다");
    assert.ok(
        !block.slice(0, bodyAt).includes("초대 링크 복사"),
        "초대 단추가 늘 떠 있다 — 예전에 두 줄로 접히며 지도를 덮은 자리가 이것이다",
    );

    // ── 지도 **높이는 안 가져간다** — 흐름 안의 줄로 두면 지도가 줄어든다
    const mapOpen = s.indexOf('<div className="relative min-h-0 flex-1">');
    assert.ok(mapOpen > 0 && idx > mapOpen, "안내가 지도 칸 밖에 있다 — 그러면 지도 높이를 가져간다");
    assert.ok(!block.includes("shrink-0"), "안내가 흐름 안의 줄로 서 있다 — 지도가 그만큼 줄어든다");
});
