import { test } from "node:test";
import assert from "node:assert/strict";
import { assetGoalProgress } from "@/lib/assetGoal";
import { DEFAULTS, sanitize, serialize, parse, simulate } from "@/app/(calculator)/calculator/calc";
import { calculatorSnapshot } from "@/lib/share/calculator";

test("목표 달성률은 초과 달성과 음수 순자산을 처리한다", () => {
    assert.deepEqual(assetGoalProgress(50, 100), { percent: 50, remaining: 50, reached: false });
    assert.deepEqual(assetGoalProgress(120, 100), { percent: 120, remaining: 0, reached: true });
    assert.deepEqual(assetGoalProgress(-20, 100), { percent: 0, remaining: 120, reached: false });
    assert.equal(assetGoalProgress(0, 0), null);
    assert.equal(assetGoalProgress(100, NaN), null);
});

test("목표 금액은 기존 조건·공유 링크와 호환되며 수익 계산을 바꾸지 않는다", () => {
    assert.equal(sanitize({ target: -1 }).target, 0);
    assert.equal(sanitize({ target: Infinity }).target, 0);
    assert.equal(parse(new URLSearchParams("initial=1000"))!.inputs.target, 0);
    const inputs = { ...DEFAULTS, target: 10_000 };
    assert.equal(parse(new URLSearchParams(serialize(inputs, "simple")))!.inputs.target, 10_000);
    assert.deepEqual(simulate(inputs), simulate(DEFAULTS));
});

test("공유 결과에 목표와 연말 기준 도달 연차를 기록한다", () => {
    const inputs = { ...DEFAULTS, initial: 0, monthly: 100, rate: 0, years: 2, target: 1200 };
    const table = calculatorSnapshot(inputs, "simple", simulate(inputs)).tables.find(t => t.title === "목표 자산")!;
    assert.ok(table.rows.some(row => row[0] === "연말 기준 첫 도달" && row[1] === "1년차"));
    const unmet = { ...inputs, target: 10000 };
    assert.ok(calculatorSnapshot(unmet, "simple", simulate(unmet)).tables.some(t => t.rows.some(row => row[1] === "2년 내 미도달")));
});
