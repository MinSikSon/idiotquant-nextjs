// D1 을 많이 읽는 요청을 누가 부르는지 못 박는다.
//
// 2026-09-02, D1 무료 한도(하루 500만 행 읽기)를 넘겨 **로그인이 통째로 막혔다.**
// 어댑터의 첫 조회부터 D1_ERROR 가 나서 카카오·구글이 같은 오류 화면으로 떨어졌다.
// 범인은 /scan/daily/dates 였고, 스크리너는 그 값을 화면에 한 번도 그리지 않으면서
// 켤 때마다 받아 오고 있었다.
//
// 이런 낭비는 화면이 멀쩡히 그려지므로 아무도 눈치채지 못한다. 요금제 한도를 넘겨
// 서비스가 멎고 나서야 보인다. 그래서 "누가 불러도 되는가"를 목록으로 적어 둔다 —
// 새 화면이 부르기 시작하면 여기서 먼저 걸린다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const APP_DIR = new URL("../app/", import.meta.url).pathname;

/** app/ 아래 모든 .tsx 를 리포 기준 상대경로로 준다. */
function pageFiles(dir = APP_DIR): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...pageFiles(full));
        else if (entry.endsWith(".tsx")) out.push(full);
    }
    return out;
}

const FILES = pageFiles().map(f => ({
    path: `app/${relative(APP_DIR, f)}`,
    src: readFileSync(f, "utf8"),
}));

/**
 * 값을 부르는 자리만 센다. `이름(` 형태라 import 목록(`이름,`)에는 안 걸린다.
 * 주석 안의 언급도 마찬가지로 안 걸린다 — 주석에는 괄호를 붙이지 않는다.
 */
function callersOf(thunk: string): string[] {
    const call = new RegExp(`\\b${thunk}\\s*\\(`);
    return FILES.filter(f => call.test(f.src)).map(f => f.path).sort();
}

/**
 * 부르는 화면을 못 박아 둔 요청들. 새로 부르려면 **비용을 알고** 여기에 적어야 한다.
 * 목록과 실제가 정확히 같아야 통과한다 — 안 부르게 되었으면 목록에서도 지운다.
 */
const EXPENSIVE: Record<string, { why: string; callers: string[] }> = {
    reqGetNcavDailyDates: {
        why:
            "/scan/daily/dates 는 stock_data_daily 를 GROUP BY scan_date 로 훑는다. " +
            "WHERE 가 없어 보관 중인 14일치가 통째로 읽히고, LIMIT 30 은 묶은 뒤에 걸려서 " +
            "읽는 양을 줄이지 못한다. 날짜를 화면에 실제로 그리는 곳만 부른다.",
        callers: ["app/(backtest)/backtest/page.tsx"],
    },
    reqDiscoverNcavDates: {
        why:
            "날짜 목록이 비었을 때의 대체 탐색. 하루치를 훑는 /scan/daily 를 일곱 번 보낸다. " +
            "reqGetNcavDailyDates 를 안 부르는 화면에서 이것만 켜면 조건이 항상 참이 되어 " +
            "아끼려던 것보다 훨씬 많이 읽는다 — 둘은 한 쌍으로만 움직인다.",
        callers: [],
    },
};

for (const [thunk, { why, callers }] of Object.entries(EXPENSIVE)) {
    test(`${thunk} 를 부르는 화면은 목록과 같다`, () => {
        assert.deepEqual(
            callersOf(thunk),
            [...callers].sort(),
            `${thunk} 의 호출처가 바뀌었다.\n\n${why}\n\n` +
            `늘리려면 비용을 확인하고 EXPENSIVE 목록에 적고, 줄였으면 목록에서 지운다.`
        );
    });
}

// 한 쌍으로만 움직인다는 규칙을 따로 건다. 위 두 목록을 각각 고치다 보면
// "탐색만 남는" 조합이 만들어질 수 있는데, 그게 정확히 읽기가 폭증하는 모양이다.
test("대체 탐색은 날짜 목록을 부르는 화면에서만 돈다", () => {
    const orphans = callersOf("reqDiscoverNcavDates")
        .filter(f => !callersOf("reqGetNcavDailyDates").includes(f));

    assert.deepEqual(orphans, [],
        "날짜 목록을 안 받으면서 대체 탐색만 켠 화면이다. " +
        "그 화면은 켤 때마다 하루치를 훑는 요청을 일곱 번 보낸다.");
});

// 목록 자체가 낡는 것도 막는다. 존재하지 않는 파일을 적어 두면 위 비교가
// "실제 호출처 없음"과 어긋나 실패하지만, 오타 난 경로는 왜 실패하는지 읽기 어렵다.
test("EXPENSIVE 에 적힌 화면은 실제로 있는 파일이다", () => {
    const known = new Set(FILES.map(f => f.path));
    for (const [thunk, { callers }] of Object.entries(EXPENSIVE)) {
        for (const c of callers) {
            assert.ok(known.has(c), `${thunk} 의 호출처로 적힌 ${c} 가 없다 — 경로가 바뀌었거나 오타다.`);
        }
    }
});
