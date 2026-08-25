// 가계부 항목 키 → 라벨.
//
// 이 파일이 지키는 것은 하나다: **어떤 키가 와도 화면에 빈칸이 뜨지 않는다.**
// 항목을 지워도, 프리셋에서 뺐어도, 과거에 적어둔 내역은 이름을 잃으면 안 된다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    categoryLabel, categoriesOf, presetsOf, catKey, frozenKey,
    KIND_ORDER, KIND_STYLE, type StoredCategory,
} from "../lib/features/ledger/categories.ts";

const MINE: StoredCategory[] = [
    { id: 1, kind: "expense", label: "여행" },
    { id: 2, kind: "income", label: "부업" },
];

test("프리셋 키는 프리셋 라벨로", () => {
    assert.equal(categoryLabel("income", "salary"), "급여");
    assert.equal(categoryLabel("expense", "fixed"), "고정비");
    assert.equal(categoryLabel("saving", "deposit"), "예·적금");
});

test("'투자'는 저축 프리셋으로 옮겼지만, 예전 지출 기록도 이름을 지킨다", () => {
    // 새 자리
    assert.equal(categoryLabel("saving", "invest"), "투자");
    // 옛 자리 — 데이터를 고치지 않았으므로 여기서 되살려야 한다
    assert.equal(categoryLabel("expense", "invest"), "투자");
});

test("지출 프리셋에서 '투자'는 더 이상 고를 수 없다", () => {
    assert.equal(presetsOf("expense").some(c => c.key === "invest"), false);
    assert.equal(presetsOf("saving").some(c => c.key === "invest"), true);
});

test("사용자 항목은 id 로 찾는다 — 이름을 바꿔도 내역이 따라온다", () => {
    assert.equal(categoryLabel("expense", catKey(1), MINE), "여행");

    // 같은 키 그대로, 라벨만 바뀐 목록을 주면 새 이름이 나온다.
    const renamed: StoredCategory[] = [{ id: 1, kind: "expense", label: "휴가" }];
    assert.equal(categoryLabel("expense", catKey(1), renamed), "휴가");
});

test("가리킬 항목이 없으면 '지운 항목' — 빈칸으로 두지 않는다", () => {
    assert.equal(categoryLabel("expense", catKey(99), MINE), "지운 항목");
});

test("지울 때 굳혀둔 라벨은 그대로 읽는다", () => {
    assert.equal(categoryLabel("saving", frozenKey("비상금"), []), "비상금");
});

test("아무것도 못 찾으면 키를 그대로 — 마지막까지 빈칸은 없다", () => {
    assert.equal(categoryLabel("income", "무엇인가", []), "무엇인가");
});

test("칩 목록은 프리셋 뒤에 그 구분의 사용자 항목만 붙인다", () => {
    const expense = categoriesOf("expense", MINE);
    assert.deepEqual(expense.map(c => c.label), ["고정비", "생활비", "기타", "여행"]);

    // 수입 항목(부업)이 지출 칩에 섞이면 안 된다.
    assert.equal(expense.some(c => c.label === "부업"), false);
});

test("구분 셋의 이름·색이 모두 정의돼 있다", () => {
    assert.deepEqual(KIND_ORDER, ["income", "expense", "saving"]);
    for (const kind of KIND_ORDER) {
        const style = KIND_STYLE[kind];
        assert.ok(style.label, `${kind} 라벨 없음`);
        // 빈 문자열이면 조용히 색 없는 칩이 된다.
        for (const key of ["solid", "bar", "badge", "amount"] as const) {
            assert.ok(style[key]?.length > 0, `${kind}.${key} 비어 있음`);
        }
    }
});
