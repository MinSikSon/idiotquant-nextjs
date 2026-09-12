// 도감의 얼굴 — **스물여섯이 다 있고, 폰에서 안 접힌다.**
//
// 그림은 규칙이 아니지만 두 가지가 조용히 망가진다.
//
//   1. **한 종이 빠진다.** 새 몬스터를 넣거나 글자를 바꾸면 그 줄만 얼굴이 없다.
//      화면은 멀쩡히 뜨므로 아무도 못 알아챈다.
//   2. **줄이 접힌다.** 고정폭 글꼴이라 한 줄이 화면보다 길면 그 줄만 다음 줄로 넘어가
//      그림이 통째로 무너진다. 제일 좁은 폰(390px)에서 패널 안쪽이 43칸쯤이다.
//
// 그리고 소스 쪽 함정 하나 — 그림의 마지막 줄이 `\` 로 끝나는 종이 여럿인데(용·트롤·
// 오크 …), 닫는 backtick 을 같은 줄에 두면 **그 역슬래시가 backtick 을 이스케이프해서
// 템플릿이 안 닫힌다.** 실제로 그렇게 터졌다. 아래 「줄 수」 검사가 그 사고를 잡는다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ART_LETTERS, artWidth, monsterArt } from "@/app/(game)/game/monsterArt";
import { MONSTERS } from "@/lib/rogue/monsters";

/** 패널 안쪽에 들어가는 칸 수. 이보다 길면 접힌다. */
const MAX_COLS = 20;
/** 폰에서 도감 한 줄이 너무 커지지 않게. */
const MAX_ROWS = 8;

test("스물여섯 종에 전부 얼굴이 있다", () => {
    const missing = Object.keys(MONSTERS).filter((ch) => !monsterArt(ch));
    assert.deepEqual(missing, [], `얼굴 없는 종: ${missing.join(", ")}`);
    assert.equal(ART_LETTERS.length, 26);
});

test("표에 없는 글자의 그림은 없다 — 안 쓰는 그림이 남아 있으면 안 된다", () => {
    const extra = ART_LETTERS.filter((ch) => !MONSTERS[ch]);
    assert.deepEqual(extra, [], `표에 없는 글자: ${extra.join(", ")}`);
});

test("어떤 줄도 스무 칸을 안 넘는다 — 넘으면 폰에서 접혀 그림이 무너진다", () => {
    for (const ch of ART_LETTERS) {
        const w = artWidth(ch);
        assert.ok(w > 0, `${ch} 의 그림이 비었다`);
        assert.ok(w <= MAX_COLS, `${ch}(${MONSTERS[ch].name}) 가 ${w}칸이다 — ${MAX_COLS}칸까지`);
    }
});

test("줄 수가 알맞다 — 앞뒤의 빈 줄이 남아 있으면 안 된다", () => {
    for (const ch of ART_LETTERS) {
        const lines = monsterArt(ch)!.split("\n");
        assert.ok(lines.length <= MAX_ROWS, `${ch} 가 ${lines.length}줄이다 — ${MAX_ROWS}줄까지`);
        assert.ok(lines.length >= 3, `${ch} 가 ${lines.length}줄뿐이다`);
        // 앞뒤가 빈 줄이면 `monsterArt` 의 다듬기가 빠진 것이다.
        assert.notEqual(lines[0].trim(), "", `${ch} 의 첫 줄이 비었다`);
        assert.notEqual(lines[lines.length - 1].trim(), "", `${ch} 의 마지막 줄이 비었다`);
    }
});

test("그림에 탭이 없다 — 고정폭 글꼴에서 칸이 어긋난다", () => {
    for (const ch of ART_LETTERS) {
        assert.ok(!monsterArt(ch)!.includes("\t"), `${ch} 에 탭이 들어 있다`);
    }
});

test("모르는 글자에는 null 을 준다 — 화면이 그 자리를 비운다", () => {
    assert.equal(monsterArt("?"), null);
    assert.equal(monsterArt(""), null);
    assert.equal(artWidth("?"), 0);
});
