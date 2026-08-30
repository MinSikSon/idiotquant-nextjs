// 로그라이크 코어 — 덱·카드·유물·진행.
//
// 카드 효과는 전부 TurnBuff 한 덩어리로 모여 엔진에 넘어간다. 그래서 엔진을 안 켜고도
// "이 카드가 무엇을 하는가" 를 여기서 그대로 볼 수 있다.
//
// 카드는 전역 풀이 아니라 **내 덱**에서 뽑힌다. 그래서 여기서 확인할 것이 하나 늘었다 —
// 얻은 카드가 실제로 손에 잡히는가, 그리고 덱이 두꺼워진 값을 치르는가.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    RoguelikeManager, HAND_SIZE, REWARD_TURNS, OFFER_SIZE, UPGRADE_POOL, UPGRADE_SLOTS,
    startingDeckOf,
} from "@/lib/game/core/RoguelikeManager";
import {
    applyRun, isNewBest, buyUpgrade, canUpgrade, nextUpgradeCost, UPGRADE_COSTS,
    EMPTY, type Progress,
} from "@/lib/game/core/progress";
import { NO_BUFF } from "@/lib/game/core/types";
import type { RunSummary, StrategyCard } from "@/lib/game/core/types";

const run = (returnPct: number, earnedIP = 1, idle = false): RunSummary => ({
    returnPct, earnedIP, idle, bankrupt: false,
    startEquity: 10_000_000,
    finalEquity: Math.round(10_000_000 * (1 + returnPct / 100)),
});

/** 청산으로 끝난 판. 엔진이 그렇듯 인사이트는 한 점도 안 준다. */
const bust = (returnPct = -65): RunSummary => ({ ...run(returnPct, 0), bankrupt: true });

/** 그 카드가 손에 잡힐 때까지 턴을 넘긴다. 덱에서 뽑는 이상 몇 턴 걸릴 수 있다. */
function drawUntil(r: RoguelikeManager, id: string, tries = 80): StrategyCard {
    for (let i = 0; i < tries; i++) {
        const got = r.dealHand().find(c => c.id === id);
        if (got) return got;
    }
    throw new Error(`${id} 가 ${tries}턴 안에 안 잡혔다`);
}

/* ── 손패 ───────────────────────────────────────────────────── */

test("한 턴에 세 장을 깐다 — 같은 카드가 두 장일 수 있다", () => {
    // 시작 덱에 관망 지시가 둘, 방어막이 둘이다. 겹쳐 잡히는 것이 정상이고, 그래서
    // 손패를 짚는 열쇠가 id 가 아니라 uid 다.
    const r = new RoguelikeManager(1);
    const hand = r.dealHand();
    assert.equal(hand.length, HAND_SIZE);
    assert.equal(new Set(hand.map(c => c.uid)).size, HAND_SIZE, "uid 가 겹쳤다");
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
    assert.equal(r.playCard(hand[0]!.uid), true);
    assert.equal(r.playCard(hand[1]!.uid), false);
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
    r.playCard(first[0]!.uid);
    assert.notDeepEqual(r.buildBuff(), NO_BUFF);

    r.dealHand();
    assert.deepEqual(r.buildBuff(), NO_BUFF, "지난 턴 카드가 남았다");
});

/* ── 덱 ─────────────────────────────────────────────────────── */

test("시작 덱은 여섯 장이고, 뽑아도 총 장수는 안 변한다", () => {
    const r = new RoguelikeManager(1);
    assert.equal(r.deckState.total, 6);
    assert.equal(r.deckState.curses, 0);

    r.dealHand();
    const d = r.deckState;
    assert.equal(d.draw, 3, "세 장 뽑았으면 셋이 남아야 한다");
    assert.equal(d.total, 6, "뽑는다고 덱이 줄면 안 된다");
});

test("덱이 마르면 버린 더미를 섞어 되돌린다", () => {
    // 여섯 장짜리 덱에서 세 장씩 계속 뽑아도 손패가 마르지 않아야 한다.
    const r = new RoguelikeManager(2);
    for (let turn = 0; turn < 12; turn++) {
        assert.equal(r.dealHand().length, HAND_SIZE, `${turn}턴에 손패가 모자랐다`);
        assert.equal(r.deckState.total, 6, `${turn}턴에 장수가 새어 나갔다`);
    }
});

test("얻은 카드는 이번 턴에 안 잡히고, 언젠가는 반드시 잡힌다", () => {
    const r = new RoguelikeManager(3);
    r.dealHand();
    r.addToDeck("leak");
    // 버린 더미로 들어가므로 지금 손에는 없다 — 보상이 마술이 되면 안 된다.
    assert.equal(r.hand.some(c => c.id === "leak"), false);
    assert.equal(r.deckState.total, 7);

    assert.equal(drawUntil(r, "leak").id, "leak");
});

test("덱이 두꺼워지면 원하는 카드가 덜 잡힌다", () => {
    // 로그라이크의 값이 여기 있다. 같은 카드를 두고 덱만 불려서 잡히는 빈도를 잰다.
    const rate = (padding: number) => {
        const r = new RoguelikeManager(11);
        r.addToDeck("leak");
        for (let i = 0; i < padding; i++) r.addToDeck("delay");
        let hits = 0;
        for (let t = 0; t < 120; t++) {
            if (r.dealHand().some(c => c.id === "leak")) hits++;
        }
        return hits;
    };

    assert.ok(rate(0) > rate(14), "덱을 불려도 잡히는 빈도가 안 줄었다");
});

/* ── 보상과 저주 ────────────────────────────────────────────── */

test("보상은 3·6·9턴을 끝냈을 때만 뜬다", () => {
    const r = new RoguelikeManager(4);
    assert.deepEqual(REWARD_TURNS, [3, 6, 9]);
    for (let t = 1; t <= 12; t++) {
        assert.equal(r.isRewardTurn(t), REWARD_TURNS.includes(t), `${t}턴`);
    }
});

test("보상으로 저주를 내밀지는 않는다", () => {
    for (let seed = 0; seed < 20; seed++) {
        const offer = new RoguelikeManager(seed).offerCards();
        assert.equal(offer.length, OFFER_SIZE);
        assert.ok(offer.every(c => c.kind === "reward"), `시드 ${seed} 에 저주가 섞였다`);
        assert.equal(new Set(offer.map(c => c.id)).size, OFFER_SIZE, "같은 카드를 두 번 내밀었다");
    }
});

test("센 카드는 고르기 전에 값을 말한다", () => {
    // 저주 이름이 카드에 실려 나와야 화면이 "고른다" 를 만들 수 있다.
    const r = new RoguelikeManager(5);
    const cursed = ["pump", "leak"];
    for (let seed = 0; seed < 40; seed++) {
        for (const c of new RoguelikeManager(seed).offerCards()) {
            assert.equal(!!c.curseName, cursed.includes(c.id), `${c.id} 의 저주 표시가 틀렸다`);
        }
    }
    assert.equal(r.takeReward("bunker"), null, "저주 없는 카드가 저주를 물고 왔다");
});

test("저주가 딸린 카드를 받으면 저주도 함께 덱에 들어간다", () => {
    const r = new RoguelikeManager(6);
    const before = r.deckState.total;

    const curse = r.takeReward("leak");
    assert.equal(curse, "당국 조사");
    assert.equal(r.deckState.total, before + 2, "카드와 저주, 둘이 들어와야 한다");
    assert.equal(r.deckState.curses, 1);
});

test("파쇄기는 손에 잡힌 저주를 덱 밖으로 버린다", () => {
    const r = new RoguelikeManager(7);
    r.relics = [{ id: "shredder", name: "파쇄기", triggerType: "onTurnStart", description: "" }];
    r.takeReward("pump");
    assert.equal(r.deckState.curses, 1);

    const p = { cash: 0, shares: 0, avgPrice: 0, currentTurn: 1, maxTurns: 12, insightPoints: 0 };
    for (let t = 0; t < 40 && r.deckState.curses > 0; t++) {
        r.dealHand();
        r.onTurnStart(p);
    }

    assert.equal(r.deckState.curses, 0, "저주가 안 타 없어졌다");
    assert.equal(r.hand.some(c => c.kind === "curse"), false, "탄 카드가 손에 남았다");
});

/* ── 버프 합성 ──────────────────────────────────────────────── */

test("아무것도 없으면 아무 일도 안 일어난다", () => {
    const r = new RoguelikeManager(6);
    r.dealHand();
    r.relics = [];
    assert.deepEqual(r.buildBuff(), NO_BUFF);
});

test("카드마다 건드리는 곳이 다르다", () => {
    const want: Record<string, (b: ReturnType<RoguelikeManager["buildBuff"]>) => boolean> = {
        insider: b => b.priceBias > 0,
        nofee: b => b.feeWaived,
        rebound: b => b.reboundRatio > 0,
        shield: b => b.downshieldRatio > 0,
        volatile: b => b.volatilityMult > 1,
        steady: b => b.volatilityMult < 1,
        bunker: b => b.downshieldRatio > 0.5,
    };

    for (const [id, check] of Object.entries(want)) {
        const r = new RoguelikeManager(7);
        r.relics = [];
        // 시작 덱에 없는 카드(보상)는 넣어 두고 잡는다. 덱에서 뽑는 이상 다른 길이 없다.
        r.addToDeck(id);
        const card = drawUntil(r, id);
        assert.equal(r.playCard(card.uid), true, `${id} 를 못 골랐다`);
        assert.equal(check(r.buildBuff()), true, `${id} 가 아무것도 안 바꿨다`);
    }
});

test("유물이 먼저 깔리고 카드가 그 위에 쌓인다", () => {
    const r = new RoguelikeManager(7);
    r.dealHand();
    r.relics = [{ id: "hotline", name: "증권가 핫라인", triggerType: "onTurnStart", description: "" }];

    const onlyRelic = r.buildBuff();
    assert.ok(onlyRelic.priceBias > 0, "유물이 안 얹혔다");

    const r2 = new RoguelikeManager(7);
    r2.relics = [...r.relics];
    const card = drawUntil(r2, "insider");
    r2.playCard(card.uid);
    assert.ok(r2.buildBuff().priceBias > onlyRelic.priceBias, "카드가 유물을 덮었다");
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

/* ── 시작 덱 강화 ───────────────────────────────────────────── */

test("강화가 없으면 시작 덱은 여섯 장 그대로다", () => {
    assert.deepEqual(startingDeckOf([]),
        ["steady", "steady", "shield", "shield", "insider", "nofee"]);
});

test("강화는 앞자리부터 갈아 끼우고, 덱 크기는 안 변한다", () => {
    // 덱이 불어나면 원하는 카드가 덜 잡힌다. 강화의 요점은 **크기가 아니라 질**이다.
    const one = startingDeckOf(["rebound"]);
    assert.equal(one.length, 6);
    assert.deepEqual(one, ["rebound", "steady", "shield", "shield", "insider", "nofee"]);

    const four = startingDeckOf(["rebound", "bunker", "volatile", "insider"]);
    assert.equal(four.length, 6);
    assert.deepEqual(four.slice(4), ["insider", "nofee"], "뒤의 두 장은 안 건드린다");
});

test("모르는 카드 이름은 조용히 무시한다", () => {
    // 저장이 상해도 판은 굴러가야 한다.
    assert.deepEqual(startingDeckOf(["없는카드"]), startingDeckOf([]));
});

test("강화한 카드가 실제로 손에 잡힌다", () => {
    const r = new RoguelikeManager(1, ["rebound"]);
    assert.equal(r.deckState.total, 6, "강화가 덱을 불리면 안 된다");
    assert.equal(drawUntil(r, "rebound").id, "rebound");
});

test("강화로 저주를 사지는 못한다", () => {
    // 시작 덱에 저주를 영구히 박는 것은 강화가 아니라 벌이다.
    assert.equal(UPGRADE_POOL.includes("pump"), false);
    assert.equal(UPGRADE_POOL.includes("leak"), false);
    for (let seed = 0; seed < 20; seed++) {
        const offer = new RoguelikeManager(seed).offerUpgrades();
        assert.ok(offer.every(c => UPGRADE_POOL.includes(c.id)), `시드 ${seed}`);
        assert.ok(offer.every(c => !c.curseName));
    }
});

test("갈아 끼울 자리는 넷뿐이다", () => {
    assert.equal(UPGRADE_SLOTS, 4);
    assert.equal(UPGRADE_COSTS.length, UPGRADE_SLOTS);
    const full: Progress = { ...EMPTY, insightPoints: 999, upgrades: ["rebound", "bunker", "volatile", "insider"] };
    assert.equal(nextUpgradeCost(full), null);
    assert.equal(canUpgrade(full), false);
    assert.deepEqual(buyUpgrade(full, "rebound"), full, "다섯 번째는 안 팔린다");
});

test("값이 모자라면 안 팔린다", () => {
    const poor: Progress = { ...EMPTY, insightPoints: UPGRADE_COSTS[0]! - 1 };
    assert.equal(canUpgrade(poor), false);
    assert.deepEqual(buyUpgrade(poor, "rebound"), poor);
});

test("살수록 비싸진다", () => {
    let p: Progress = { ...EMPTY, insightPoints: 500 };
    const paid: number[] = [];
    for (let i = 0; i < UPGRADE_SLOTS; i++) {
        const before = p.insightPoints;
        p = buyUpgrade(p, "rebound");
        paid.push(before - p.insightPoints);
    }
    assert.deepEqual(paid, [...UPGRADE_COSTS]);
    assert.equal(p.upgrades.length, UPGRADE_SLOTS);
});

/* ── 청산 ───────────────────────────────────────────────────── */

test("청산되면 인사이트가 절반이 되고 강화가 날아간다", () => {
    const rich: Progress = {
        ...EMPTY, insightPoints: 90, runs: 4, bestReturn: 40,
        upgrades: ["rebound", "bunker"],
    };
    const after = applyRun(rich, bust());

    assert.equal(after.insightPoints, 45, "절반이 아니다");
    assert.deepEqual(after.upgrades, [], "강화가 남았다");
    assert.equal(after.busts, 1);
    assert.equal(after.runs, 5, "청산된 판도 판이다");
    assert.equal(after.bestReturn, 40, "최고 기록까지 지우지는 않는다");
});

test("청산은 인사이트를 안 준다", () => {
    // 엔진이 earnedIP 를 0 으로 내주지만, 값이 새어 들어와도 여기서 막힌다.
    const p = applyRun({ ...EMPTY, insightPoints: 10 }, { ...bust(), earnedIP: 99 });
    assert.equal(p.insightPoints, 5);
});

test("무사히 끝낸 판은 강화를 지키지 않는다 — 그대로 들고 간다", () => {
    const p: Progress = { ...EMPTY, insightPoints: 10, upgrades: ["bunker"] };
    const after = applyRun(p, run(5, 4));
    assert.deepEqual(after.upgrades, ["bunker"]);
    assert.equal(after.insightPoints, 14);
    assert.equal(after.busts, 0);
});

test("인사이트가 0 이면 청산돼도 0 아래로는 안 간다", () => {
    assert.equal(applyRun(EMPTY, bust()).insightPoints, 0);
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
