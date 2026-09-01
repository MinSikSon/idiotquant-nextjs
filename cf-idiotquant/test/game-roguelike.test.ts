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
    RoguelikeManager, HAND_SIZE, REWARD_TURNS, OFFER_SIZE,
    MAX_LEVEL, MERGE_COUNT, OPENING_DECK_SIZE, openingDeck, CARD_LIST, RELIC_POOL, cardKey,
} from "@/lib/game/core/RoguelikeManager";
import {
    applyRun, isNewBest, isRuined, RUIN_LINE,
    UNLOCKS, unlockedIds, newlyUnlocked, EMPTY, type Progress,
} from "@/lib/game/core/progress";
import { NO_BUFF } from "@/lib/game/core/types";
import { MAX_TIER, SEED_CASH, StockEngine } from "@/lib/game/core/StockEngine";
import type { RunSummary, StrategyCard } from "@/lib/game/core/types";

const run = (returnPct: number, earnedIP = 1, idle = false, deck: string[] = []): RunSummary => ({
    returnPct, earnedIP, idle, ruined: false, deck,
    startEquity: SEED_CASH,
    finalEquity: Math.round(SEED_CASH * (1 + returnPct / 100)),
});

/** 자본잠식으로 끝난 판. 엔진이 그렇듯 인사이트는 한 점도 안 준다. */
const ruin = (): RunSummary => ({
    ...run(-95, 0), ruined: true, finalEquity: Math.round(RUIN_LINE / 2),
});

/** openingDeck 에 넘길 난수. 코어의 것과 같은 식이라 결과가 재현된다. */
function mulberry(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * 그 카드가 손에 잡힐 때까지 턴을 넘긴다. 덱에서 뽑는 이상 몇 턴 걸릴 수 있다.
 * @param key 덱에 적힌 이름. 강화 단계까지 짚는다(`peek+1`).
 */
function drawUntil(r: RoguelikeManager, key: string, tries = 80): StrategyCard {
    for (let i = 0; i < tries; i++) {
        const got = r.dealHand().find(c => cardKey(c.id, c.level) === key);
        if (got) return got;
    }
    throw new Error(`${key} 가 ${tries}턴 안에 안 잡혔다`);
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

test("뽑아도 총 장수는 안 변한다", () => {
    const r = new RoguelikeManager(1, ["peek", "analyst", "hedge", "nofee", "forecast", "bunker"]);
    assert.equal(r.deckState.total, 6);
    assert.equal(r.deckState.curses, 0);

    r.dealHand();
    const d = r.deckState;
    assert.equal(d.draw, 3, "세 장 뽑았으면 셋이 남아야 한다");
    assert.equal(d.total, 6, "뽑는다고 덱이 줄면 안 된다");
});

test("덱이 마르면 버린 더미를 섞어 되돌린다", () => {
    // 세 장짜리 덱에서 세 장씩 계속 뽑아도 손패가 마르지 않아야 한다.
    const r = new RoguelikeManager(2);
    for (let turn = 0; turn < 12; turn++) {
        assert.equal(r.dealHand().length, HAND_SIZE, `${turn}턴에 손패가 모자랐다`);
        assert.equal(r.deckState.total, OPENING_DECK_SIZE, `${turn}턴에 장수가 새어 나갔다`);
    }
});

test("얻은 카드는 이번 턴에 안 잡히고, 언젠가는 반드시 잡힌다", () => {
    const r = new RoguelikeManager(3);
    r.dealHand();
    r.addToDeck("margin");
    // 버린 더미로 들어가므로 지금 손에는 없다 — 보상이 마술이 되면 안 된다.
    assert.equal(r.hand.some(c => c.id === "margin"), false);
    assert.equal(r.deckState.total, OPENING_DECK_SIZE + 1);

    assert.equal(drawUntil(r, "margin").id, "margin");
});

test("덱이 두꺼워지면 원하는 카드가 덜 잡힌다", () => {
    // 로그라이크의 값이 여기 있다. 같은 카드를 두고 덱만 불려서 잡히는 빈도를 잰다.
    const rate = (padding: number) => {
        const r = new RoguelikeManager(11);
        r.addToDeck("margin");
        for (let i = 0; i < padding; i++) r.addToDeck("blackout");
        let hits = 0;
        for (let t = 0; t < 120; t++) {
            if (r.dealHand().some(c => c.id === "margin")) hits++;
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
        assert.ok(offer.every(c => c.kind !== "curse"), `시드 ${seed} 에 저주가 섞였다`);
        assert.equal(new Set(offer.map(c => c.id)).size, OFFER_SIZE, "같은 카드를 두 번 내밀었다");
    }
});

test("센 카드는 고르기 전에 값을 말한다", () => {
    // 저주 이름이 카드에 실려 나와야 화면이 "고른다" 를 만들 수 있다.
    const r = new RoguelikeManager(5);
    const cursed = ["tipoff", "margin"];
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

    const curse = r.takeReward("margin");
    assert.equal(curse, "이자 상환");
    assert.equal(r.deckState.total, before + 2, "카드와 저주, 둘이 들어와야 한다");
    assert.equal(r.deckState.curses, 1);
});

test("파쇄기는 손에 잡힌 저주를 덱 밖으로 버린다", () => {
    const r = new RoguelikeManager(7);
    r.relics = [{ id: "shredder", name: "파쇄기", triggerType: "onTurnStart", description: "" }];
    r.takeReward("insider");
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
    // 세 갈래(정보·집행·방어)가 정말로 서로 다른 자리를 건드리는지.
    const want: Record<string, (b: ReturnType<RoguelikeManager["buildBuff"]>) => boolean> = {
        peek: b => b.peekTurns >= 1,
        "peek+2": b => b.peekTurns >= 3,
        analyst: b => b.regimeDepth >= 1,
        "analyst+1": b => b.regimeDepth >= 2,
        hedge: b => b.moveMult < 1,
        "hedge+3": b => b.downshieldRatio > 0.5,
        stoploss: b => b.stopLoss > 0,
        nofee: b => b.feeMult === 0,
        insider: b => b.peekTurns >= 2 && b.regimeDepth >= 2,
        margin: b => b.buyingPowerMult > 1,
        blackout: b => b.blind,
        debt: b => b.cashDrainPct > 0,
    };

    for (const [key, check] of Object.entries(want)) {
        const r = new RoguelikeManager(7);
        r.relics = [];
        r.addToDeck(key);
        const card = drawUntil(r, key);
        assert.equal(r.playCard(card.uid), true, `${key} 를 못 골랐다`);
        assert.equal(check(r.buildBuff()), true, `${key} 가 아무것도 안 바꿨다`);
    }
});

test("카드는 주가를 밀지 않는다", () => {
    // 예전엔 "이번 턴 +7%p" 같은 카드가 있었다. 트레이더가 시세를 조종하는 셈이라
    // 앞뒤가 안 맞았고, 고를 때 큰 숫자 말고 기준이 없었다. TurnBuff 에 그 자리가
    // 남아 있지 않다는 것이 그 규칙을 지키는 방법이다.
    const keys = Object.keys(NO_BUFF);
    for (const banned of ["priceBias", "reboundRatio"]) {
        assert.equal(keys.includes(banned), false, `${banned} 가 되살아났다`);
    }
});

test("유물이 먼저 깔리고 카드가 그 위에 쌓인다", () => {
    const r = new RoguelikeManager(7);
    r.dealHand();
    r.relics = [{ id: "compass", name: "낡은 나침반", triggerType: "onTurnStart", description: "" }];

    // 나침반만으로도 국면은 읽힌다
    assert.equal(r.buildBuff().regimeDepth, 1, "유물이 안 얹혔다");

    // 그 위에 내부자 제보를 쌓으면 남은 턴까지 열린다
    const r2 = new RoguelikeManager(7);
    r2.relics = [...r.relics];
    r2.addToDeck("insider");
    const card = drawUntil(r2, "insider");
    r2.playCard(card.uid);
    const b = r2.buildBuff();
    assert.ok(b.regimeDepth >= 2, "카드가 유물 위에 안 쌓였다");
});

test("단골 브로커는 카드 없이도 수수료를 면제한다", () => {
    const r = new RoguelikeManager(8);
    r.dealHand();
    r.relics = [{ id: "broker", name: "단골 브로커", triggerType: "onTrade", description: "" }];
    assert.equal(r.buildBuff().feeMult, 0);
});

test("증권가 핫라인은 카드 없이도 다음 턴을 보여 준다", () => {
    const r = new RoguelikeManager(9);
    r.dealHand();
    r.relics = [{ id: "hotline", name: "증권가 핫라인", triggerType: "onTurnStart", description: "" }];
    assert.ok(r.buildBuff().peekTurns >= 1);
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
        for (let i = 0; i < 10; i++) {
            for (const cand of r.offerRelics()) r.takeRelic(cand.id);
        }
        assert.equal(new Set(r.relics.map(x => x.id)).size, r.relics.length, `시드 ${seed}`);
    }
});

test("이미 들고 있는 유물은 후보로 안 나온다", () => {
    // 셋 중에 고르라고 해 놓고 이미 가진 것을 내밀면 고를 것이 하나 줄어든다.
    const r = new RoguelikeManager(21);
    r.grantStartingRelics(0);
    const owned = new Set(r.relics.map(x => x.id));
    assert.ok(r.offerRelics().every(c => !owned.has(c.id)));
});

test("고른 유물만 들어온다", () => {
    const r = new RoguelikeManager(22);
    r.relics = [];
    const offer = r.offerRelics();
    assert.equal(offer.length, OFFER_SIZE);

    const got = r.takeRelic(offer[1]!.id);
    assert.equal(got?.id, offer[1]!.id);
    assert.deepEqual(r.relics.map(x => x.id), [offer[1]!.id], "안 고른 것까지 들어왔다");
    assert.equal(r.takeRelic(offer[1]!.id), null, "같은 것을 두 번 받았다");
    assert.equal(r.takeRelic("없는유물"), null);
});

test("다 모으면 더 안 준다", () => {
    const r = new RoguelikeManager(10);
    r.grantStartingRelics(999);
    const full = r.relics.length;
    assert.deepEqual(r.offerRelics(), [], "내밀 것이 없어야 한다");
    assert.equal(r.relics.length, full);
});

test("유물은 적혀 있는 것만 한다", () => {
    // 낡은 나침반은 예전에 설명에 없는 "인사이트 +1" 을 매 턴 몰래 줬다. 유물 하나가
    // 두 가지를 하면 셋 중에서 무엇 때문에 골랐는지를 알 수 없다.
    const r = new RoguelikeManager(11);
    r.relics = [{ id: "compass", name: "낡은 나침반", triggerType: "onTurnStart", description: "" }];
    const p = { cash: 0, shares: 0, avgPrice: 0, currentTurn: 1, maxTurns: 12, insightPoints: 0 };

    assert.deepEqual(r.onTurnStart(p), []);
    assert.equal(p.insightPoints, 0, "적혀 있지 않은 일이 일어났다");
    assert.equal(r.buildBuff().regimeDepth, 1, "적혀 있는 일이 안 일어났다");
});

test("배당 통지서는 오른 턴에, 들고 있을 때만 터진다", () => {
    // 예전의 "비밀 장부 — 인사이트 +1" 은 **다음** 판의 시작 유물 수를 정하는 값이라
    // 이 판에서는 아무 일도 안 일어났다. 지금은 그 자리에서 현금이 는다.
    const r = new RoguelikeManager(12);
    r.relics = [{ id: "dividend", name: "배당 통지서", triggerType: "onTurnEnd", description: "" }];
    const p = { cash: 0, shares: 100, avgPrice: 1000, currentTurn: 1, maxTurns: 12, insightPoints: 0 };

    r.onTurnEnd(p, -3, 1000);
    assert.equal(p.cash, 0, "내린 턴에 터졌다");

    r.onTurnEnd(p, 3, 1000);
    assert.equal(p.cash, 1000, "평가액 100,000 의 1% 가 아니다");

    p.shares = 0;
    r.onTurnEnd(p, 3, 1000);
    assert.equal(p.cash, 1000, "한 주도 없는데 배당이 나왔다");
});

/* ── 경력 인사이트 — 오직 오르는 것 ─────────────────────────── */

test("경력 인사이트는 자본잠식돼도 안 깎인다", () => {
    // 다른 것은 다 처음으로 돌아간다. 이 하나만은 판을 굴린 것 자체를 세어 준다.
    const rich: Progress = {
        ...EMPTY, bankroll: 40_000_000, deck: ["peek", "bunker"],
        insightPoints: 90, careerIP: 200, tier: 3,
    };
    const after = applyRun(rich, ruin());

    assert.equal(after.bankroll, SEED_CASH, "자금이 안 되돌아갔다");
    assert.deepEqual(after.deck, [], "덱이 남았다");
    assert.equal(after.insightPoints, 0);
    assert.equal(after.tier, 0);
    assert.equal(after.careerIP, 200, "경력이 깎였다");
});

test("굴릴수록 경력만 계속 오른다", () => {
    let p: Progress = { ...EMPTY };
    for (let i = 0; i < 6; i++) p = applyRun(p, i % 2 === 0 ? run(20, 11) : ruin());
    assert.equal(p.careerIP, 33, "번 것만 더해져야 한다 (11 x 3)");
    assert.equal(p.ruins, 3);
});

/* ── 해금 ───────────────────────────────────────────────────── */

test("경력이 쌓이면 하나씩 열린다", () => {
    assert.deepEqual(unlockedIds(0), []);
    for (const u of UNLOCKS) {
        assert.equal(unlockedIds(u.at - 1).includes(u.id), false, `${u.id} 가 일찍 열렸다`);
        assert.equal(unlockedIds(u.at).includes(u.id), true, `${u.id} 가 안 열렸다`);
    }
    assert.equal(unlockedIds(99_999).length, UNLOCKS.length, "다 열려야 한다");
});

test("이번 판으로 새로 열린 것만 알려 준다", () => {
    const first = UNLOCKS[0]!;
    assert.deepEqual(newlyUnlocked(0, first.at).map(u => u.id), [first.id]);
    assert.deepEqual(newlyUnlocked(first.at, first.at + 1), [], "이미 열린 것을 또 알렸다");
});

test("안 열린 카드는 보상으로 안 나온다", () => {
    const locked = new RoguelikeManager(3);                       // 해금 없음
    const open = new RoguelikeManager(3, [], UNLOCKS.map(u => u.id));

    const lockedIds = new Set(locked.rewardPool);
    assert.equal(lockedIds.has("insider"), false, "안 열린 카드가 풀에 있다");
    assert.equal(lockedIds.has("margin"), false);
    assert.ok(lockedIds.has("stoploss"), "처음부터 있어야 할 카드가 없다");

    assert.ok(open.rewardPool.length > locked.rewardPool.length, "해금이 풀을 안 넓혔다");
    for (let seed = 0; seed < 20; seed++) {
        const offer = new RoguelikeManager(seed).offerCards();
        assert.ok(offer.every(c => lockedIds.has(c.id)), `시드 ${seed} 에 안 열린 카드가 나왔다`);
    }
});

test("안 열린 유물도 안 나온다", () => {
    const locked = new RoguelikeManager(4);
    const open = new RoguelikeManager(4, [], UNLOCKS.map(u => u.id));
    assert.equal(locked.relicPool.some(r => r.id === "hotline"), false);
    assert.ok(open.relicPool.some(r => r.id === "hotline"));

    locked.relics = [];
    assert.ok(locked.offerRelics().every(r => locked.relicPool.some(x => x.id === r.id)));

    locked.grantStartingRelics(999);
    assert.equal(locked.relics.length, locked.relicPool.length, "안 열린 것까지 쥐여 줬다");
});

/* ── 예보가 몇 턴 가는가 ────────────────────────────────────── */

const peekBuff = (n: number) => ({ ...NO_BUFF, peekTurns: n });

test("강화한 예보는 다음 턴에도 남는다", () => {
    // "두 턴" 이라면서 한 턴 만에 사라지면 0강과 다를 것이 없다.
    const r = new RoguelikeManager(5);
    r.remember(peekBuff(2));
    assert.equal(r.lastingLeft.peek, 2);

    r.consumeTurn();
    assert.equal(r.lastingLeft.peek, 1, "둘째 턴치가 사라졌다");

    r.consumeTurn();
    assert.equal(r.lastingLeft.peek, 0);
    r.consumeTurn();
    assert.equal(r.lastingLeft.peek, 0, "0 아래로 내려갔다");
});

test("더 멀리 보는 예보만 갈아 끼운다", () => {
    const r = new RoguelikeManager(6);
    r.remember(peekBuff(2));
    r.remember(peekBuff(1));                // 한 턴짜리로는 이미 본 것을 못 뺏는다
    assert.equal(r.lastingLeft.peek, 2);
    r.remember(peekBuff(3));
    assert.equal(r.lastingLeft.peek, 3);
});

test("수수료 면제와 손절 예약도 걸어 둔 턴만큼 간다", () => {
    // 강화의 축이 셋 다 "몇 턴 가는가" 다. 예보만 이어지고 나머지가 한 턴 만에 꺼지면
    // 카드 설명("3턴 동안")이 거짓말이 된다.
    const r = new RoguelikeManager(41);
    r.remember({ ...NO_BUFF, feeFreeTurns: 3, stopLossTurns: 2 });

    assert.equal(r.buildBuff().feeMult, 0);
    assert.ok(r.buildBuff().stopLoss > 0);

    r.consumeTurn();
    r.consumeTurn();
    assert.equal(r.buildBuff().feeMult, 0, "3턴짜리가 두 턴 만에 꺼졌다");
    assert.equal(r.buildBuff().stopLoss, 0, "2턴짜리가 셋째 턴까지 남았다");

    r.consumeTurn();
    assert.equal(r.buildBuff().feeMult, 1);
});

test("남은 예보는 값이 아니라 **턴 수**다", () => {
    // 값을 들고 있으면 그 사이에 헤지를 들어도 그림이 안 바뀌어, 차트가 오지 않을
    // 등락을 계속 가리킨다. 턴 수만 남기고 그림은 매번 engine.read 가 새로 낸다.
    const r = new RoguelikeManager(7);
    r.remember(peekBuff(2));
    assert.equal(typeof r.lastingLeft.peek, "number");
    // 남은 예보는 buildBuff 를 타고 나가야 화면이 다시 읽을 수 있다.
    assert.equal(r.buildBuff().peekTurns, 2, "남은 예보가 buff 에 안 실렸다");
    r.consumeTurn();
    assert.equal(r.buildBuff().peekTurns, 1);
});

test("정보 차단은 들고 있던 예보까지 가린다", () => {
    // 지난 턴에 정밀 예보로 봐 둔 것이 남아 있어도, 이 저주를 쥔 턴에는 안 보여야 한다.
    // 예전에는 씬이 들고 있던 값을 그대로 다시 그려서 저주가 아무 일도 안 했다.
    const r = new RoguelikeManager(31, ["blackout", "peek", "hedge"]);
    r.remember(peekBuff(2));

    const card = drawUntil(r, "blackout");
    assert.equal(r.playCard(card.uid), true);

    const b = r.buildBuff();
    assert.equal(b.blind, true);
    assert.deepEqual(new StockEngine(41).read(b).next, [], "저주가 아무 일도 안 했다");
});

/* ── 차수 — 다시 켤 이유 ────────────────────────────────────── */

test("완주하면 차수가 오르고 자본잠식이면 0 으로 돌아간다", () => {
    const up = applyRun({ ...EMPTY, tier: 2 }, run(10, 5));
    assert.equal(up.tier, 3);

    const down = applyRun({ ...EMPTY, tier: 3 }, ruin());
    assert.equal(down.tier, 0, "자본잠식은 게임 자체가 끝나는 것이다");
});

test("차수는 최대치 위로 안 간다", () => {
    assert.equal(applyRun({ ...EMPTY, tier: MAX_TIER }, run(10, 5)).tier, MAX_TIER);
});

test("관망만 한 판으로는 차수를 못 올린다", () => {
    // 12턴을 흘려보내 차수만 쌓는 길을 막는다.
    const next = applyRun({ ...EMPTY, tier: 1 }, run(0, 0, true));
    assert.equal(next.tier, 1);
    assert.equal(next.runs, 1, "그래도 판은 센다");
});

test("차수가 올라도 자본잠식선은 그대로다", () => {
    // 차수가 바꾸는 것은 시장(국면 길이·뉴스 빈도)이지 지는 선이 아니다. 자금이 판을
    // 넘어 이어지므로 선까지 따라 오르면 잘 굴린 사람이 더 높은 곳에서 죽는다.
    const low = new StockEngine(1, 0), high = new StockEngine(1, 4);
    assert.equal(low.ruinLine, RUIN_LINE);
    assert.equal(high.ruinLine, RUIN_LINE);
});

test("차수가 높으면 같은 성적에 인사이트를 더 준다", () => {
    // 차수는 시장 자체도 바꾸므로(국면이 짧아지고 뉴스가 잦아진다) 같은 시드라도 판이
    // 달라진다. 그래서 성적을 **똑같이 맞춰 놓고** 배수만 견준다.
    const earn = (tier: number) => {
        const e = new StockEngine(31, tier);
        e.buyAll();
        e.stock.currentPrice = Math.round(e.player.avgPrice * 1.4);   // 성적을 손으로 고정
        e.liquidate();
        return e.summarize();
    };
    const a = earn(0), b = earn(4);
    assert.ok(Math.abs(a.returnPct - b.returnPct) < 1, `성적이 ${a.returnPct} vs ${b.returnPct}`);
    assert.ok(b.earnedIP > a.earnedIP, `차수 4 가 ${b.earnedIP}, 차수 0 이 ${a.earnedIP}`);
});

/* ── 카드를 언제 쓰는가 ─────────────────────────────────────── */

test("카드마다 언제 쓰는지가 적혀 있다", () => {
    // 효과만 있고 쓰임이 없으면 무엇을 고를지가 안 보인다. 도감이 읽는 줄이기도 하다.
    for (const c of CARD_LIST) {
        assert.ok(c.when.length > 5, `${c.id} 에 when 이 없다`);
        // 단계마다 따로 적혀 있어야 한다. 강화한 카드가 0강 설명을 달고 있으면
        // 3턴 예보를 쥐고 "다음 1턴 미리보기" 를 읽게 된다.
        c.levels.forEach((lv, i) => {
            assert.ok(lv.effect.length > 5, `${c.id} +${i} 에 설명이 없다`);
            assert.ok(lv.short.length > 2, `${c.id} +${i} 에 한 줄 요약이 없다`);
        });
    }
});

test("화면에 나가는 글에 마크다운이 섞이지 않는다", () => {
    // 이 문자열들은 캔버스의 뉴스 줄과 도감에 **날것으로** 찍힌다. 강조 표시를 남기면
    // 별표가 그대로 보인다 — 실제로 한 번 그랬다.
    for (const c of CARD_LIST) {
        const texts = [["when", c.when] as const, ...c.levels.flatMap((lv, i) =>
            [[`+${i} 설명`, lv.effect] as const, [`+${i} 요약`, lv.short] as const])];
        for (const [field, text] of texts) {
            assert.ok(!/[*_`]/.test(text), `${c.id} 의 ${field} 에 마크다운이 있다: ${text}`);
        }
    }
    for (const r of RELIC_POOL) {
        assert.ok(!/[*_`]/.test(r.description), `${r.id} 의 설명에 마크다운이 있다`);
        assert.ok(r.description.length > 5, `${r.id} 에 설명이 없다`);
    }
});

test("현금만 쥐고 있으면 지킬 것도 팔 것도 없다", () => {
    const r = new RoguelikeManager(41);
    const broke = { shares: 0, cash: 10_000_000, price: 1000 };
    const held = { shares: 100, cash: 0, price: 1000 };

    for (const id of ["hedge", "hedge+2", "stoploss"]) {
        assert.equal(r.isIdle(id, broke), true, `${id} 가 현금일 때도 쓸모 있다고 한다`);
        assert.equal(r.isIdle(id, held), false, `${id} 가 보유 중인데 쓸모없다고 한다`);
    }
    // 가격을 올리는 카드는 사고 나서 쓰는 것이라 "지금 쓸모없음" 으로는 안 가른다.
    // 읽는 카드는 현금이든 보유든 언제나 값어치가 있다.
    assert.equal(r.isIdle("peek", broke), false);
    assert.equal(r.isIdle("analyst", broke), false);
});
/* ── 시작 덱 — 무작위 세 장 ─────────────────────────────────── */

test("아주 처음에는 기본 카드 중 무작위 세 장으로 연다", () => {
    const starters = new Set(CARD_LIST.filter(c => c.kind === "starter").map(c => c.id));
    for (let seed = 0; seed < 20; seed++) {
        const deck = openingDeck(mulberry(seed));
        assert.equal(deck.length, OPENING_DECK_SIZE, `시드 ${seed}`);
        assert.ok(deck.every(id => starters.has(id)), `시드 ${seed} 에 기본 카드가 아닌 것이 섞였다`);
        assert.equal(new Set(deck).size, deck.length, "같은 카드가 두 장 나왔다");
    }
});

test("덱을 안 넘겨주면 무작위 세 장, 넘겨주면 그대로 쓴다", () => {
    assert.equal(new RoguelikeManager(1).deckState.total, OPENING_DECK_SIZE);

    const carried = ["peek+1", "hedge+3", "stoploss", "nofee", "peek"];
    const r = new RoguelikeManager(1, carried);
    assert.equal(r.deckState.total, carried.length);
    assert.deepEqual([...r.deck].sort(), [...carried].sort());
});

test("저장이 상해도 판은 굴러간다", () => {
    // 모르는 id 는 조용히 버린다. 전부 모르는 것이면 새 게임처럼 연다.
    const r = new RoguelikeManager(2, ["없는카드", "peek", "또없는카드", "peek+9"]);
    assert.deepEqual(r.deck, ["peek"], "없는 강화 단계까지 살아남았다");
    assert.equal(new RoguelikeManager(2, ["없는카드"]).deckState.total, OPENING_DECK_SIZE);
});

test("옛 저장의 카드는 같은 값의 강화 단계로 옮겨 온다", () => {
    // 예전에는 셋을 모으면 **다른 카드**가 됐다. 그 이름들을 그냥 버리면 오래 굴린
    // 사람의 덱에서 센 카드가 소리 없이 사라진다.
    const r = new RoguelikeManager(51, ["forecast", "tipoff", "bunker", "probe"]);
    assert.deepEqual([...r.deck].sort(), ["analyst+1", "hedge+3", "peek+1"]);
});

test("판이 끝나면 덱이 그대로 다음 판으로 넘어간다", () => {
    const first = new RoguelikeManager(3);
    first.dealHand();
    first.addToDeck("stoploss");
    const carried = first.deck;

    const second = new RoguelikeManager(4, carried);
    assert.deepEqual([...second.deck].sort(), [...carried].sort(), "덱이 새어 나갔다");
});

/* ── 합성 — 같은 카드 셋을 한 장으로 ────────────────────────── */

test("같은 카드 셋이 모이면 한 장으로 합쳐진다", () => {
    const r = new RoguelikeManager(5, ["peek", "peek"]);
    r.addToDeck("peek");

    assert.deepEqual(r.deck, ["peek+1"], "셋이 한 장이 안 됐다");
    assert.deepEqual(r.takeMerges(), [{ from: "예고 시황", to: "예고 시황 +1" }]);
    assert.deepEqual(r.takeMerges(), [], "합성 알림을 두 번 읽었다");
});

test("셋씩 여러 번 모여 있으면 그만큼 한꺼번에 합쳐진다", () => {
    // 아홉 장이 세 장이 된다. 덱이 두꺼워지는 것을 막는 것이 합성의 일이다.
    const r = new RoguelikeManager(6, Array(8).fill("peek"));
    r.addToDeck("peek");
    // 아홉 장이 셋이 되고, 그 셋이 다시 한 장이 된다 — 연쇄가 끝까지 돈다.
    assert.deepEqual(r.deck, ["peek+2"]);
    assert.equal(r.takeMerges().length, 4);
});

test("3강이 끝이다 — 그 위로는 안 올라간다", () => {
    const r = new RoguelikeManager(7, ["peek+3", "peek+3"]);
    r.addToDeck("peek+3");
    assert.equal(r.deckState.total, 3, "최대 강화 위로 올라갔다");
    assert.deepEqual(r.takeMerges(), []);
    assert.deepEqual(r.deck, ["peek+3", "peek+3", "peek+3"]);
});

test("맨 카드 27장이 3강 한 장이 된다", () => {
    // 3장이 한 단계이므로 3의 세제곱. 도감이 그대로 적어 두는 수다.
    const r = new RoguelikeManager(71, Array(MERGE_COUNT ** MAX_LEVEL - 1).fill("hedge"));
    r.addToDeck("hedge");
    assert.deepEqual(r.deck, ["hedge+3"]);
});

test("저주 셋은 그대로 사라진다", () => {
    // 파쇄기 말고 저주를 덜어 내는 유일한 길이다.
    const r = new RoguelikeManager(8, ["blackout", "blackout", "peek"]);
    r.addToDeck("blackout");

    assert.deepEqual(r.deck, ["peek"]);
    assert.deepEqual(r.takeMerges(), [{ from: "정보 차단", to: null }]);
});

test("이번 턴에 고른 카드는 합성에 안 끌려간다", () => {
    // 효과가 이미 걸린 카드를 도로 가져가면 화면과 결과가 어긋난다.
    const r = new RoguelikeManager(9, ["peek", "peek"]);
    const picked = r.dealHand().find(c => c.id === "peek")!;
    r.playCard(picked.uid);

    r.addToDeck("peek");
    assert.equal(r.deck.filter(id => id === "peek").length, 3, "고른 장까지 태웠다");
    assert.deepEqual(r.takeMerges(), []);
});

test("쓴 카드가 손에서 돌아오면 그때 합쳐진다", () => {
    // 위 규칙의 뒷면이다. 손패가 덱으로 돌아가는 자리에서 다시 안 보면, 같은 카드 셋을
    // 들고 있는데 영영 안 합쳐진다 — 셋을 모았는데 아무 일도 안 일어나는 판이 됐다.
    const r = new RoguelikeManager(23, ["peek", "peek"]);
    const picked = r.dealHand().find(c => c.id === "peek")!;
    r.playCard(picked.uid);
    r.addToDeck("peek");
    assert.deepEqual(r.takeMerges(), [], "쓴 장을 그 턴에 태웠다");

    r.dealHand();
    assert.deepEqual(r.takeMerges(), [{ from: "예고 시황", to: "예고 시황 +1" }]);
    assert.equal(r.deck.filter(k => k === "peek").length, 0);
    assert.equal(r.deck.filter(k => k === "peek+1").length, 1);
});

/* ── 덱 펼쳐 보기 ───────────────────────────────────────────── */

test("덱 목록은 단계별로 세고 강화가 임박한 것을 위로 올린다", () => {
    const r = new RoguelikeManager(24, ["peek", "peek", "hedge", "nofee+3"]);
    const list = r.deckList;

    assert.equal(list[0]!.key, "peek", "한 장만 더면 합쳐지는 카드가 위가 아니다");
    assert.equal(list[0]!.count, 2);
    assert.equal(list[0]!.level, 0);
    assert.equal(list[0]!.ready, true);
    assert.equal(list[0]!.mergeInto, "예고 시황 +1");

    const hedge = list.find(e => e.key === "hedge")!;
    assert.equal(hedge.count, 1);
    assert.equal(hedge.ready, false, "한 장뿐인데 임박이라고 한다");
    assert.equal(hedge.mergeInto, "헤지 +1");

    // 3강은 더 오를 곳이 없어 키 자체가 없다 — 저주의 null(사라짐)과 다른 말이다.
    const top = list.find(e => e.key === "nofee+3")!;
    assert.equal(top.level, MAX_LEVEL);
    assert.equal(top.name, "수수료 면제 +3");
    assert.equal("mergeInto" in top, false);
    assert.equal(top.ready, false);

    assert.equal(list.reduce((s, e) => s + e.count, 0), r.deckState.total, "장수가 안 맞는다");
});

test("같은 카드라도 단계가 다르면 따로 센다", () => {
    // 0강 둘과 1강 둘은 서로 안 섞인다. 한 줄로 뭉치면 "한 장만 더" 가 거짓말이 된다.
    const r = new RoguelikeManager(27, ["peek", "peek", "peek+1", "peek+1"]);
    const list = r.deckList;
    assert.equal(list.length, 2);
    assert.equal(list.find(e => e.key === "peek")!.count, 2);
    assert.equal(list.find(e => e.key === "peek+1")!.count, 2);
    assert.ok(list.every(e => e.ready), "둘 다 한 장만 더면 오른다");
});

test("덱 목록은 저주가 사라지는 것도 말한다", () => {
    const r = new RoguelikeManager(25, ["blackout", "blackout"]);
    const e = r.deckList.find(c => c.id === "blackout")!;
    assert.equal(e.ready, true);
    assert.equal(e.mergeInto, null, "저주는 무엇이 되는 것이 아니라 사라진다");
});

test("덱 목록은 손에 든 장도 센다", () => {
    // 손패도 덱의 일부다. 빼고 세면 카드를 뽑는 것만으로 덱이 줄어든 것처럼 보인다.
    const r = new RoguelikeManager(26, ["peek", "peek", "hedge"]);
    r.dealHand();
    assert.equal(r.deckList.reduce((s, e) => s + e.count, 0), 3);
});

test("판을 열 때 넘어온 덱에 셋이 있으면 그 자리에서 합쳐진다", () => {
    // 보상을 건너뛰고 판을 끝냈거나 저장이 옛 규칙으로 쌓였으면 셋이 그대로 넘어온다.
    // 판을 여는 자리에서 한 번 훑어야 "셋이면 합쳐진다" 가 언제나 참이 된다.
    const r = new RoguelikeManager(21, ["peek", "peek", "peek", "hedge"]);
    assert.deepEqual([...r.deck].sort(), ["hedge", "peek+1"]);
    assert.deepEqual(r.takeMerges(), [{ from: "예고 시황", to: "예고 시황 +1" }]);
});

test("셋째 장이 될 카드는 고르기 전에 무엇이 되는지 말한다", () => {
    const r = new RoguelikeManager(22, ["peek", "peek", "blackout", "blackout"]);

    assert.equal(r.mergePreview("peek"), "예고 시황 +1");
    assert.equal(r.mergePreview("blackout"), "", "저주는 사라지므로 빈 문자열");
    assert.equal(r.mergePreview("hedge"), null, "한 장도 없는데 합성이 뜬다");

    // 실제로 넣어 보면 예고한 그대로다.
    r.addToDeck("peek");
    assert.deepEqual(r.takeMerges(), [{ from: "예고 시황", to: "예고 시황 +1" }]);
});

test("보상에 기본 카드가 섞여 나온다 — 합성이 닿을 수 있는 유일한 길", () => {
    // 보상 카드는 위층이 없어 안 합쳐지고, 처음 세 장은 서로 다르다. 보상 풀에 기본
    // 카드가 없으면 셋이 모일 길이 아예 없어 합성이 죽은 규칙이 된다.
    const pool = new Set(new RoguelikeManager(11).rewardPool);
    for (const c of CARD_LIST.filter(c => c.kind === "starter")) {
        assert.ok(pool.has(c.id), `${c.name} 이(가) 보상으로 안 나온다`);
    }
    assert.equal([...pool].some(id => CARD_LIST.find(c => c.id === id)?.kind === "curse"), false,
        "저주가 보상으로 나온다");
});

test("합쳐진 카드가 실제로 손에 잡힌다", () => {
    const r = new RoguelikeManager(10, ["hedge", "hedge", "nofee"]);
    r.addToDeck("hedge");
    const got = drawUntil(r, "hedge+1");
    assert.equal(got.id, "hedge");
    assert.equal(got.level, 1);
    assert.equal(got.name, "헤지 +1", "강화 표시가 이름에 안 붙었다");
    assert.equal(got.shortDescription, "하락 50% 차단", "0강 설명을 달고 나왔다");
});

/* ── 자본잠식 — 지는 방법 ───────────────────────────────────── */

test("자금이 잠식선 아래면 끝이다", () => {
    assert.equal(isRuined(RUIN_LINE), false, "선 위는 살아 있다");
    assert.equal(isRuined(RUIN_LINE - 1), true);
    assert.equal(isRuined(0), true);
});

test("자본잠식이면 자금·덱·차수·인사이트가 처음으로 돌아간다", () => {
    const rich: Progress = {
        ...EMPTY, bankroll: 80_000_000, deck: ["forecast", "bunker"],
        insightPoints: 90, runs: 4, bestReturn: 40, tier: 5,
    };
    const after = applyRun(rich, ruin());

    assert.equal(after.bankroll, SEED_CASH);
    assert.deepEqual(after.deck, []);
    assert.equal(after.insightPoints, 0);
    assert.equal(after.tier, 0);
    assert.equal(after.ruins, 1);
    assert.equal(after.runs, 5, "자본잠식된 판도 판이다");
    assert.equal(after.bestReturn, 40, "최고 기록까지 지우지는 않는다");
});

test("자본잠식은 인사이트를 안 준다", () => {
    // 엔진이 earnedIP 를 0 으로 내주지만, 값이 새어 들어와도 여기서 막힌다.
    const p = applyRun({ ...EMPTY, insightPoints: 10 }, { ...ruin(), earnedIP: 99 });
    assert.equal(p.insightPoints, 0);
});

test("무사히 끝낸 판은 자금과 덱을 그대로 들고 간다", () => {
    const p: Progress = { ...EMPTY, insightPoints: 10, bankroll: 12_000_000 };
    const after = applyRun(p, run(5, 4, false, ["peek", "bunker"]));

    assert.equal(after.bankroll, Math.round(SEED_CASH * 1.05), "판의 최종 자산이 다음 자금이다");
    assert.deepEqual(after.deck, ["peek", "bunker"]);
    assert.equal(after.insightPoints, 14);
    assert.equal(after.ruins, 0);
    assert.equal(after.tier, 1);
});

test("잘 굴린 자금은 다음 판의 시작 자금이 된다", () => {
    const e = new StockEngine(21, 0, 55_000_000);
    assert.equal(e.player.cash, 55_000_000);
    assert.equal(e.equity, 55_000_000);
    assert.equal(e.summarize().startEquity, 55_000_000);
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
