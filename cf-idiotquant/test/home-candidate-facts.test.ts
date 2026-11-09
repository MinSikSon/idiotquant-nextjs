import { test } from "node:test";
import assert from "node:assert/strict";
import { homeCandidateFacts, pickHomeCandidate } from "@/lib/utils/homeCandidateFacts";
import type { HomeStock } from "@/lib/utils/homeStockPreview";

const now = new Date("2026-11-09T09:00:00+09:00");
const stock: HomeStock = { ticker: "TEST", name: "테스트", country: "KR", last_price: 100, per: 5, pbr: .2, ncav_ratio: 1.2, market_cap: 1000, scan_date: "20261108", eps: 20, bps: 500, net_income: 100, financial_bs_date: "202606", financial_is_date: "202606" };

test("세 조건의 경계값과 ROE를 두 보기에서 같은 방식으로 판정한다", () => {
    const facts = homeCandidateFacts({ ...stock, per: 10, pbr: .5, ncav_ratio: 1 }, now);
    assert.deepEqual(facts.conditions.map(condition => condition.met), [true, false, true]);
    assert.equal(facts.matched, 2);
    assert.equal(facts.roe, 4);
    assert.equal(facts.status, "checked");
});

test("저PER에 들어가도 실제 순이익이 음수면 주의하며 추천에서 제외한다", () => {
    const loss = { ...stock, country: "US" as const, net_income: -100 };
    const facts = homeCandidateFacts(loss, now);
    assert.equal(facts.status, "caution");
    assert.ok(facts.issues.includes("순이익·EPS 부호 불일치"));
    assert.equal(facts.roe, null);
    assert.equal(pickHomeCandidate([loss], now), null);
});

test("기준일·지표 누락은 안전하다고 표시하지 않고 추천을 보류한다", () => {
    const missing = { ...stock, financial_is_date: null, eps: undefined, net_income: undefined, bps: undefined, per: NaN, pbr: 0 };
    assert.equal(homeCandidateFacts(missing, now).status, "unknown");
    assert.equal(homeCandidateFacts(missing, now).conditions[0].met, null);
    assert.equal(pickHomeCandidate([missing], now), null);
});

test("묵은 재무·수집 가격과 미래 수집일은 추천 대상이 아니다", () => {
    for (const candidate of [{ ...stock, scan_date: "20261101" }, { ...stock, scan_date: "20261110" }, { ...stock, financial_bs_date: "202206" }]) {
        assert.notEqual(homeCandidateFacts(candidate, now).status, "checked");
        assert.equal(pickHomeCandidate([candidate], now), null);
    }
});

test("추천은 현재 후보 안에서 충족 수와 시총으로 결정하며 원본 순서를 바꾸지 않는다", () => {
    const large = { ...stock, ticker: "LARGE", market_cap: 2000, per: 20 };
    const input = [large, stock];
    assert.equal(pickHomeCandidate(input, now)?.ticker, "TEST");
    assert.equal(input[0].ticker, "LARGE");
    assert.equal(pickHomeCandidate([], now), null);
});


test("PER가 낮아도 순유동자산이 음수이면 주의 표시하고 추천에서 제외한다", () => {
    const negative = { ...stock, ncav_ratio: -.5 };
    assert.ok(homeCandidateFacts(negative, now).issues.includes("순유동자산 음수"));
    assert.equal(pickHomeCandidate([negative], now), null);
});
