// 전환 화면 — **결산이 성적과 어긋나지 않는가.**
//
// 이 줄들이 여태 화면에 없던 값이라 눈으로 확인할 수가 없었다. `ChapterSummary` 를
// 그대로 읽는지, 없는 것을 지어내지 않는지를 여기서 잠근다.
//
// `core/interlude.ts` 는 Phaser 를 안 부르는 순수 함수라 브라우저 없이 돈다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
    cutStartRun, cutRegress, cutEnded, cutToOffice, cutOnChapterEnd, cutToPark,
    FRAMES, SHEET_SIZE, type ArtKey,
} from "@/lib/game/core/interlude";
import { CHAPTERS } from "@/lib/game/core/chapters";
import type { ChapterSummary, EndReason } from "@/lib/game/core/types";

const CH = CHAPTERS[0]!;
const LAST = CHAPTERS[CHAPTERS.length - 1]!;

/** 금액 표기는 씬이 넘긴다. 테스트는 값이 그대로 실려 오는지만 본다. */
const won = (v: number) => `${v}원`;

function summary(over: Partial<ChapterSummary> = {}): ChapterSummary {
    return {
        returnPct: 0, fee: 0, startEquity: 10_000_000, finalEquity: 10_000_000,
        energy: 50, debt: 0, idle: false, ruined: false, burnedOut: false,
        earned: [], ...over,
    };
}

const joined = (lines: string[]) => lines.join(" / ");

/* ── 판의 시작과 끝 ─────────────────────────────────────────── */

test("첫 회차와 그 뒤가 같은 말을 하지 않는다", () => {
    const first = cutStartRun(CH, 1);
    const again = cutStartRun(CH, 4);

    assert.notDeepEqual(first.lines, again.lines);
    assert.ok(joined(again.lines).includes("4회차"), joined(again.lines));
    assert.ok(!joined(first.lines).includes("회차"), joined(first.lines));
    assert.equal(first.art, "home");
    assert.equal(again.art, "home");
});

test("회귀 막은 끝난 회차와 다음 회차를 둘 다 말한다", () => {
    // 「끝났다」와 「다시 시작한다」가 한 화면에 같이 있어야 판의 경계가 보인다.
    const cut = cutRegress(3);
    assert.ok(cut.head.includes("3회차"), cut.head);
    assert.ok(cut.head.includes("끝"), cut.head);
    assert.ok(joined(cut.lines).includes("4회차"), joined(cut.lines));
});

test("끝 막은 회귀하지 않는다고 말한다", () => {
    const cut = cutEnded(2);
    assert.equal(cut.art, "park-debtCleared");
    assert.ok(joined(cut.lines).includes("2회차"), joined(cut.lines));
    // 이 한 줄이 「무한 회귀가 아니다」를 사람에게 말하는 자리다.
    assert.ok(joined(cut.lines).includes("돌아가지 않는다"), joined(cut.lines));
});

test("집·회사 전환이 그 장의 연도를 말한다", () => {
    assert.ok(cutStartRun(CH, 1).head.includes(CH.year));
    const office = cutToOffice(CH);
    assert.equal(office.art, "office");
    assert.ok(office.head.includes(CH.year));
    assert.ok(office.head.includes(CH.title));
});

/* ── 결산 — ChapterSummary 를 그대로 읽는가 ──────────────────── */

test("결산이 수익률의 부호를 살린다", () => {
    const up = joined(cutOnChapterEnd(CH, summary({ returnPct: 12.34 }), won).lines);
    const down = joined(cutOnChapterEnd(CH, summary({ returnPct: -7.5 }), won).lines);
    assert.ok(up.includes("+12.3%"), up);
    assert.ok(down.includes("-7.5%"), down);
});

test("결산이 에너지와 남은 빚을 그대로 싣는다", () => {
    const s = joined(cutOnChapterEnd(CH, summary({ energy: 63, debt: 30_000_000 }), won).lines);
    assert.ok(s.includes("63"), s);
    assert.ok(s.includes(won(30_000_000)), s);
});

test("보수를 받았으면 결산이 그것을 말한다", () => {
    // 빚이 줄어드는 것을 눈으로 못 보면 갚아 가는 중이라는 감각이 안 생긴다.
    const paid = joined(cutOnChapterEnd(CH, summary({ fee: 3_000_000, debt: 20_000_000 }), won).lines);
    assert.ok(paid.includes("보수"), paid);
    assert.ok(paid.includes(won(3_000_000)), paid);

    const none = joined(cutOnChapterEnd(CH, summary({ fee: 0 }), won).lines);
    assert.ok(!none.includes("보수"), none);
});

test("빚이 0 이면 숫자가 아니라 사건으로 말한다", () => {
    const s = joined(cutOnChapterEnd(CH, summary({ debt: 0 }), won).lines);
    assert.ok(s.includes("빚을 다 갚았다"), s);
    assert.ok(!s.includes("남은 빚"), s);
});

test("새로 겪은 것이 없으면 그 줄을 아예 안 만든다", () => {
    // 「0장」 은 정보가 아니다.
    const none = joined(cutOnChapterEnd(CH, summary({ earned: [] }), won).lines);
    assert.ok(!none.includes("새로 겪은 것"), none);

    const some = joined(cutOnChapterEnd(CH, summary({ earned: ["a", "b"] }), won).lines);
    assert.ok(some.includes("새로 겪은 것 2장"), some);
});

test("한 번도 안 권한 판은 그 사실을 말한다", () => {
    const idle = joined(cutOnChapterEnd(CH, summary({ idle: true }), won).lines);
    assert.ok(idle.includes("한 번도 권하지 않았다"), idle);
    const busy = joined(cutOnChapterEnd(CH, summary({ idle: false }), won).lines);
    assert.ok(!busy.includes("한 번도"), busy);
});

test("결산은 집으로 돌아오는 화면이다", () => {
    assert.equal(cutOnChapterEnd(CH, summary(), won).art, "home");
    assert.ok(cutOnChapterEnd(CH, summary(), won).head.includes(CH.year));
});

/* ── 공원 — 끝난 방식이 그림을 가른다 ───────────────────────── */

const REASONS: EndReason[] = ["debtCleared", "debtRemains", "burnout", "ruined"];

test("엔딩 넷이 저마다 자기 그림 키를 낸다", () => {
    for (const r of REASONS) {
        const cut = cutToPark(LAST, r, "제목");
        assert.equal(cut.art, `park-${r}`);
        assert.deepEqual(cut.lines, ["제목"]);
    }
});

/* ── 시트 — 칸이 그림 밖으로 나가지 않는가 ──────────────────── */

test("FRAMES 가 ArtKey 를 빠짐없이 덮는다", () => {
    const keys: ArtKey[] = [
        "home", "office",
        "park-debtCleared", "park-debtRemains", "park-burnout", "park-ruined",
    ];
    assert.deepEqual(Object.keys(FRAMES).sort(), [...keys].sort());
    // 엔딩이 늘면 여기서 걸린다 — 키를 더하고 표를 안 고치면 그림이 안 나온다.
    for (const r of REASONS) assert.ok(`park-${r}` in FRAMES, `park-${r}`);
});

test("모든 칸이 시트 안에 있다", () => {
    for (const [key, [x, y, w, h]] of Object.entries(FRAMES)) {
        assert.ok(w > 0 && h > 0, `${key} 크기`);
        assert.ok(x >= 0 && y >= 0, `${key} 시작`);
        assert.ok(x + w <= SHEET_SIZE, `${key} 오른쪽이 시트를 넘는다`);
        assert.ok(y + h <= SHEET_SIZE, `${key} 아래가 시트를 넘는다`);
    }
});

test("실제로 넣은 시트가 SHEET_SIZE 와 같다", () => {
    // PNG 헤더의 IHDR 은 8바이트 서명 + 4바이트 길이 + 4바이트 타입 뒤에 폭·높이가 온다.
    // 좌표를 격자로 적어 두었으니 그림을 다시 뽑을 때 크기가 달라지면 여기서 걸린다.
    const buf = readFileSync(new URL("../public/game-art/sheet.png", import.meta.url));
    assert.equal(buf.readUInt32BE(16), SHEET_SIZE);
    assert.equal(buf.readUInt32BE(20), SHEET_SIZE);
});
