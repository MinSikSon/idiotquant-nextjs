// 월별 잔액의 셈 — 순자산과 달별 증감.
//
// 이 파일이 지키는 것은 둘이다.
//   · **순자산을 빼는 자리는 하나뿐이다.** 화면이 따로 빼기 시작하면 어느 날 한쪽만
//     바뀌어 요약과 차트가 다른 순자산을 말한다.
//   · **견줄 앞 달이 없으면 증감이 없다.** 0 이 아니라 없다 — 0 은 「그대로였다」이고
//     그건 아는 것이다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    netWorth, balancePoints, prevMonth, monthsBefore, type LedgerBalance,
} from "@/lib/features/ledger/balances";

const row = (month: string, assets: number, liabilities: number): LedgerBalance =>
    ({ month, assets, liabilities });

test("순자산은 자산 − 부채다", () => {
    assert.equal(netWorth({ assets: 100_000_000, liabilities: 30_000_000 }), 70_000_000);
    // 빚이 자산보다 많으면 음수다 — 가려서 0 으로 만들지 않는다. 그게 사실이다.
    assert.equal(netWorth({ assets: 1_000, liabilities: 5_000 }), -4_000);
    assert.equal(netWorth({ assets: 0, liabilities: 0 }), 0);
});

test("달 세기", () => {
    assert.equal(prevMonth("2026-03"), "2026-02");
    assert.equal(prevMonth("2026-01"), "2025-12", "해를 넘어간다");
    assert.equal(monthsBefore("2026-03", 0), "2026-03");
    assert.equal(monthsBefore("2026-01", 13), "2024-12");
});

test("들어온 순서와 무관하게 달 순으로 낸다", () => {
    const pts = balancePoints([row("2026-03", 3, 0), row("2026-01", 1, 0), row("2026-02", 2, 0)]);
    assert.deepEqual(pts.map(p => p.month), ["2026-01", "2026-02", "2026-03"]);
});

test("증감은 바로 앞 달과 견준다", () => {
    const pts = balancePoints([
        row("2026-01", 100, 30),   // 순자산 70
        row("2026-02", 120, 30),   // 순자산 90  → +20
        row("2026-03", 120, 50),   // 순자산 70  → −20
    ]);
    assert.deepEqual(pts.map(p => p.net), [70, 90, 70]);
    assert.deepEqual(pts.map(p => p.delta), [null, 20, -20]);
});

test("첫 달의 증감은 0 이 아니라 없다", () => {
    // **0 으로 두면 「변화 없음」 막대가 선다.** 아무것도 모르는 자리가 아는 것처럼
    // 보이는 것이고, 이 화면에서 제일 나쁜 종류의 고장이다.
    const [first] = balancePoints([row("2026-01", 100, 30)]);
    assert.equal(first.delta, null);
    assert.notEqual(first.delta, 0);
});

test("앞 달이 비면 증감을 안 낸다 — 두 달치를 한 달치로 적지 않는다", () => {
    // 1월과 3월만 적혀 있는데 3월을 1월과 견주면 **두 달치 변화가 한 달치 증감으로**
    // 화면에 선다. 틀린 숫자이고, 더 나쁘게는 틀린 줄 모른다.
    const pts = balancePoints([row("2026-01", 100, 0), row("2026-03", 300, 0)]);
    assert.deepEqual(pts.map(p => p.delta), [null, null]);

    // 2월을 채우면 그제야 둘 다 견줄 것이 생긴다.
    const filled = balancePoints([
        row("2026-01", 100, 0), row("2026-02", 150, 0), row("2026-03", 300, 0),
    ]);
    assert.deepEqual(filled.map(p => p.delta), [null, 50, 150]);
});

test("증감 0 은 값이다 — 그대로였다는 뜻", () => {
    const pts = balancePoints([row("2026-01", 100, 30), row("2026-02", 100, 30)]);
    assert.equal(pts[1]!.delta, 0);
});

test("해를 넘어가도 이어진다", () => {
    const pts = balancePoints([row("2025-12", 100, 0), row("2026-01", 130, 0)]);
    assert.deepEqual(pts.map(p => p.delta), [null, 30]);
});

test("빈 목록은 빈 목록이다", () => {
    assert.deepEqual(balancePoints([]), []);
});

test("받은 배열을 건드리지 않는다", () => {
    // 정렬을 제자리에서 하면 리덕스 상태를 바꾸게 된다.
    const rows = [row("2026-03", 3, 0), row("2026-01", 1, 0)];
    balancePoints(rows);
    assert.deepEqual(rows.map(r => r.month), ["2026-03", "2026-01"]);
});
