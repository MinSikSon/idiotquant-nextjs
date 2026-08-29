// 로그라이크 코어 — 카드·유물·진행.
//
// 카드 효과는 전부 TurnBuff 한 덩어리로 모여 엔진에 넘어간다. 그래서 엔진을 안 켜고도
// "이 카드가 무엇을 하는가" 를 여기서 그대로 볼 수 있다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { RoguelikeManager, HAND_SIZE } from "@/lib/game/core/RoguelikeManager";
import { applyRun, isNewBest, EMPTY, type Progress } from "@/lib/game/core/progress";
import { NO_BUFF } from "@/lib/game/core/types";
import type { RunSummary } from "@/lib/game/core/types";

const run = (returnPct: number, earnedIP = 1, idle = false): RunSummary => ({
    returnPct, earnedIP, idle,
    startEquity: 10_000_000,
    finalEquity: Math.round(10_000_000 * (1 + returnPct / 100)),
});

/* ── 손패 ───────────────────────────────────────────────────── */

test("한 턴에 세 장을 깐다 — 겹치지 않는다", () => {
    const r = new RoguelikeManager(1);
    const hand = r.dealHand();
    assert.equal(hand.length, HAND_SIZE);
    assert.equal(new Set(hand.map(c => c.id)).size, HAND_SIZE);
    assert.ok(hand.every(c => !c.isUsed));
});

test("같은 시드는 같은 손패를 준다", () => {
    const a = new RoguelikeManager(42), b = new RoguelikeManager(42);
    assert.deepEqual(a.dealHand().map(c => c.id), b.dealHand().map(c => c.id));
});

test("카드와 주가가 같은 수열을 밟지 않는다", () => {
    // 매니저가 엔진과 같은 시드를 그대로 쓰면 둘이 붙어 움직인다.
    // 손패가 시드마다 실제로 갈리는지로 확인한다.
    const seen = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
        seen.add(new RoguelikeManager(seed).dealHand().map(c => c.id).join(","));
    }
    assert.ok(seen.size > 10, `20개 시드에서 손패가 ${seen.size}가지뿐이다`);
});

test("한 턴에 한 장만 고를 수 있다", () => {
    // 여러 장을 겹치면 첫 턴에 판이 끝난다
    const r = new RoguelikeManager(3);
    const hand = r.dealHand();
    assert.equal(r.playCard(hand[0]!.id), true);
    assert.equal(r.playCard(hand[1]!.id), false);
    assert.equal(hand.filter(c => c.isUsed).length, 1);
});

test("없는 카드는 안 골라진다", () => {
    const r = new RoguelikeManager(4);
    r.dealHand();
    assert.equal(r.playCard("없는카드"), false);
});

test("새 손패를 깔면 지난 턴의 선택이 지워진다", () => {
    const r = new RoguelikeManager(5);
    const first = r.dealHand();
    r.playCard(first[0]!.id);
    assert.notDeepEqual(r.buildBuff(), NO_BUFF);

    r.dealHand();
    assert.deepEqual(r.buildBuff(), NO_BUFF, "지난 턴 카드가 남았다");
});

/* ── 버프 합성 ──────────────────────────────────────────────── */

test("아무것도 없으면 아무 일도 안 일어난다", () => {
    const r = new RoguelikeManager(6);
    r.dealHand();
    r.relics = [];
    assert.deepEqual(r.buildBuff(), NO_BUFF);
});

test("카드마다 건드리는 곳이 다르다", () => {
    // 카드가 나올 때까지 손패를 다시 깐다 — 카드 풀에서 뽑히는 것이라 시드마다 다르다
    const want: Record<string, (b: ReturnType<RoguelikeManager["buildBuff"]>) => boolean> = {
        insider: b => b.priceBias > 0,
        nofee: b => b.feeWaived,
        rebound: b => b.reboundRatio > 0,
        shield: b => b.downshieldRatio > 0,
        volatile: b => b.volatilityMult > 1,
        steady: b => b.volatilityMult < 1,
    };

    for (const [id, check] of Object.entries(want)) {
        let hit = false;
        for (let seed = 0; seed < 60 && !hit; seed++) {
            const r = new RoguelikeManager(seed);
            r.relics = [];
            if (!r.dealHand().some(c => c.id === id)) continue;
            r.playCard(id);
            assert.equal(check(r.buildBuff()), true, `${id} 가 아무것도 안 바꿨다`);
            hit = true;
        }
        assert.equal(hit, true, `${id} 카드가 60개 시드에서 한 번도 안 나왔다`);
    }
});

test("유물이 먼저 깔리고 카드가 그 위에 쌓인다", () => {
    const r = new RoguelikeManager(7);
    r.dealHand();
    r.relics = [{ id: "hotline", name: "증권가 핫라인", triggerType: "onTurnStart", description: "" }];

    const onlyRelic = r.buildBuff();
    assert.ok(onlyRelic.priceBias > 0, "유물이 안 얹혔다");

    // 같은 자리를 건드리는 카드가 나올 때까지 찾는다
    for (let seed = 0; seed < 60; seed++) {
        const r2 = new RoguelikeManager(seed);
        r2.relics = [...r.relics];
        if (!r2.dealHand().some(c => c.id === "insider")) continue;
        r2.playCard("insider");
        assert.ok(r2.buildBuff().priceBias > onlyRelic.priceBias, "카드가 유물을 덮었다");
        return;
    }
    assert.fail("인사이더 호재가 60개 시드에서 한 번도 안 나왔다");
});

test("단골 브로커는 카드 없이도 수수료를 면제한다", () => {
    const r = new RoguelikeManager(8);
    r.dealHand();
    r.relics = [{ id: "broker", name: "단골 브로커", triggerType: "onTrade", description: "" }];
    assert.equal(r.buildBuff().feeWaived, true);
});

/* ── 유물 ───────────────────────────────────────────────────── */

test("인사이트가 쌓일수록 유물을 더 들고 시작한다", () => {
    const none = new RoguelikeManager(9).grantStartingRelics(0).length;
    const some = new RoguelikeManager(9).grantStartingRelics(30).length;
    const many = new RoguelikeManager(9).grantStartingRelics(90).length;

    assert.equal(none, 1, "첫 판에도 하나는 들고 시작한다");
    assert.ok(some > none, `IP 30 인데 ${some}개다`);
    assert.ok(many >= some);
});

test("유물은 겹쳐서 안 나온다", () => {
    for (let seed = 0; seed < 20; seed++) {
        const r = new RoguelikeManager(seed);
        r.grantStartingRelics(200);
        for (let i = 0; i < 10; i++) r.grantRandomRelic();
        assert.equal(new Set(r.relics.map(x => x.id)).size, r.relics.length, `시드 ${seed}`);
    }
});

test("다 모으면 더 안 준다", () => {
    const r = new RoguelikeManager(10);
    r.grantStartingRelics(999);
    const full = r.relics.length;
    assert.equal(r.grantRandomRelic(), null);
    assert.equal(r.relics.length, full);
});

test("낡은 나침반은 턴마다 인사이트를 준다", () => {
    const r = new RoguelikeManager(11);
    r.relics = [{ id: "compass", name: "낡은 나침반", triggerType: "onTurnStart", description: "" }];
    const p = { cash: 0, shares: 0, avgPrice: 0, currentTurn: 1, maxTurns: 12, insightPoints: 0 };

    const fired = r.onTurnStart(p);
    assert.equal(p.insightPoints, 1);
    assert.equal(fired.length, 1);
});

test("비밀 장부는 오른 턴에만 터진다", () => {
    const r = new RoguelikeManager(12);
    r.relics = [{ id: "ledger", name: "비밀 장부", triggerType: "onTurnEnd", description: "" }];
    const p = { cash: 0, shares: 0, avgPrice: 0, currentTurn: 1, maxTurns: 12, insightPoints: 0 };

    r.onTurnEnd(p, -3);
    assert.equal(p.insightPoints, 0, "내린 턴에 터졌다");
    r.onTurnEnd(p, 3);
    assert.equal(p.insightPoints, 1);
});

/* ── 진행(판을 넘어 남는 것) ────────────────────────────────── */

test("한 판을 굴리면 인사이트가 쌓이고 판 수가 는다", () => {
    const next = applyRun(EMPTY, run(12.5, 7));
    assert.equal(next.insightPoints, 7);
    assert.equal(next.runs, 1);
    assert.equal(next.bestReturn, 12.5);
});

test("최고 기록은 뒤로 가지 않는다", () => {
    const after: Progress = applyRun(EMPTY, run(20, 11));
    const worse = applyRun(after, run(-5, 1));
    assert.equal(worse.bestReturn, 20);
    assert.equal(worse.insightPoints, 12, "인사이트는 못한 판에서도 쌓인다");
    assert.equal(worse.runs, 2);
});

test("기록을 넘겼는지 알려 준다", () => {
    assert.equal(isNewBest(EMPTY, run(-30)), true, "첫 판은 언제나 새 기록이다");
    const after = applyRun(EMPTY, run(10));
    assert.equal(isNewBest(after, run(9.99)), false);
    assert.equal(isNewBest(after, run(10.01)), true);
});

test("관망만 한 판은 인사이트를 안 준다", () => {
    const next = applyRun(EMPTY, run(0, 0, true));
    assert.equal(next.insightPoints, 0);
    assert.equal(next.runs, 1, "그래도 판은 센다");
});

test("음수 인사이트는 안 깎는다", () => {
    // 규칙상 나올 수 없는 값이지만, 저장된 값이 상하면 여기로 들어온다
    assert.equal(applyRun(EMPTY, run(-50, -9)).insightPoints, 0);
});
