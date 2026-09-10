// 상황카드·에너지·회귀.
//
// 이 셋은 서로 물려 있다. 상황카드는 겪은 장면이고, 겪은 장면은 회귀해도 남고,
// 그 장면 중 `info` 갈래는 근거가 되어 에너지를 움직인다. 그래서 한자리에서 본다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    SITUATIONS, SITUATION_BY_ID, STARTER_IDS, EMPTY_FACTS,
    isMet, newlyEarned, nextUp, countsAsThesis, type SituationFacts,
} from "@/lib/game/core/situations";
import { DeckManager, HAND_SIZE, LOADOUT_SIZE } from "@/lib/game/core/DeckManager";
import { CLIENTS, clientAt } from "@/lib/game/core/clients";
import {
    energyDelta, decay, clampEnergy, ENERGY_DECAY,
    ENERGY_GAIN_WITH_THESIS, ENERGY_LOSS_WITH_THESIS, ENERGY_LOSS_BLIND,
} from "@/lib/game/core/energy";
import {
    researchBuff, verdictOf, verdictSay, worthRecommending,
    RESEARCH_COST, RESEARCH_DEPTH,
} from "@/lib/game/core/research";
import { ENERGY_START } from "@/lib/game/core/StockEngine";
import { EMPTY, remember, regress, endReasonOf, breaksLoop } from "@/lib/game/core/progress";
import type { ChapterSummary } from "@/lib/game/core/types";

const facts = (over: Partial<SituationFacts> = {}): SituationFacts => ({ ...EMPTY_FACTS, ...over });
const kim = CLIENTS.find(c => c.id === "kim")!;

/* ── 결과 × 근거 — 이 게임의 논지 ──────────────────────────── */

test("근거를 대고 벌면 에너지가 오른다", () => {
    const d = energyDelta({ hadThesis: true, gained: true, client: kim });
    assert.equal(d, Math.round(ENERGY_GAIN_WITH_THESIS * kim.gain));
    assert.ok(d > 0);
});

test("근거를 대고 잃으면 조금만 깎인다 — 설명할 수 있는 손실", () => {
    const d = energyDelta({ hadThesis: true, gained: false, client: kim });
    assert.equal(d, -Math.round(ENERGY_LOSS_WITH_THESIS * kim.loss));
    assert.ok(d < 0);
});

test("근거 없이 벌면 **그대로다** — 운으로 번 것은 실력이 아니다", () => {
    for (const c of CLIENTS) {
        assert.equal(energyDelta({ hadThesis: false, gained: true, client: c }), 0,
            `${c.name} 앞에서도 근거 없는 수익은 에너지를 안 올린다`);
    }
});

test("근거 없이 잃으면 가장 크게 깎인다", () => {
    const blind = -energyDelta({ hadThesis: false, gained: false, client: kim });
    const withThesis = -energyDelta({ hadThesis: true, gained: false, client: kim });
    assert.equal(blind, Math.round(ENERGY_LOSS_BLIND * kim.loss));
    assert.ok(blind > withThesis * 2, "도박의 값은 설명할 수 있는 손실보다 훨씬 커야 한다");
});

test("네 칸의 크기 순서가 규칙대로다", () => {
    const c = kim;
    const gainT = energyDelta({ hadThesis: true, gained: true, client: c });
    const lossT = energyDelta({ hadThesis: true, gained: false, client: c });
    const gainB = energyDelta({ hadThesis: false, gained: true, client: c });
    const lossB = energyDelta({ hadThesis: false, gained: false, client: c });
    assert.ok(gainT > 0 && gainB === 0 && lossT < 0 && lossB < lossT);
});

test("에너지는 매 턴 저절로 준다 — 가만히 있어도 준다", () => {
    assert.equal(decay(50), 50 - ENERGY_DECAY);
    // 흘려보내는 것만으로도 한 챕터에 시작값의 절반 가까이가 빠진다.
    assert.ok(ENERGY_DECAY * 12 >= (ENERGY_START - 20) * 0.7,
        "12턴을 흘려보내면 바닥이 보여야 한다");
});

test("알아보는 값이 맞힌 근거의 값보다 싸다", () => {
    // 비싸면 아무도 안 알아보고, 안 알아보면 이 게임의 규칙 절반이 안 돌아간다.
    const gained = energyDelta({ hadThesis: true, gained: true, client: kim });
    assert.ok(gained > RESEARCH_COST, `근거로 얻는 ${gained} 가 ${RESEARCH_COST} 보다 커야 한다`);
});

test("알아보면 근거와 국면이 함께 열린다", () => {
    // 둘이 갈리면 「알아봤는데 아무것도 안 보인다」거나 그 반대가 된다.
    const none = researchBuff(null);
    assert.equal(none.thesis, null);
    assert.equal(none.regimeDepth, 0);

    const got = researchBuff("동방해운");
    assert.equal(got.thesis, "동방해운");
    assert.equal(got.regimeDepth, RESEARCH_DEPTH);
});

test("알아보는 것 말고는 아무것도 안 열린다", () => {
    // 카드가 채우던 손절·헤지·수수료 면제는 같이 사라졌다. 여기 값이 새로 생기면
    // 그 규칙을 어디선가 만들었다는 뜻이다.
    const b = researchBuff("동방해운");
    assert.equal(b.stopLoss, 0);
    assert.equal(b.moveMult, 1);
    assert.equal(b.feeMult, 1);
    assert.equal(b.blind, false);
});
test("에너지는 0~100 안에 갇힌다", () => {
    assert.equal(clampEnergy(-9), 0);
    assert.equal(clampEnergy(140), 100);
});

/* ── 고객 ───────────────────────────────────────────────────── */

test("어머니는 근거 없이 권해도 받고, 박 대리는 거의 거절한다", () => {
    const mother = CLIENTS.find(c => c.id === "mother")!;
    const park = CLIENTS.find(c => c.id === "park")!;
    assert.equal(mother.acceptsBlind, 1);
    assert.ok(park.acceptsBlind < 0.2);
    // 무조건 받아 주는 사람이 잃을 때 제일 아프다.
    assert.ok(mother.loss > kim.loss);
});

test("떠난 고객은 다시 안 나온다", () => {
    const gone = ["kim", "mother"];
    for (let t = 1; t <= 40; t++) {
        const c = clientAt(1, "1998", t, gone);
        assert.ok(c && !gone.includes(c.id), "떠난 사람이 다시 앉으면 안 된다");
    }
});

test("아무도 안 남으면 앉을 사람이 없다", () => {
    assert.equal(clientAt(1, "1998", 1, CLIENTS.map(c => c.id)), null);
});

/* ── 상황카드 — 조건과 진행도 ──────────────────────────────── */

test("progress 가 목표에 닿는 순간이 곧 획득이다", () => {
    for (const s of SITUATIONS) {
        if (s.starter) continue;
        const empty = s.progress(EMPTY_FACTS);
        assert.equal(isMet(s, EMPTY_FACTS), empty[0] >= empty[1],
            `${s.name}: met 과 progress 가 어긋난다`);
        assert.ok(empty[1] > 0, `${s.name}: 목표가 0 이면 진행도를 못 그린다`);
    }
});

test("조건마다 정확히 그때 채워진다", () => {
    const cases: Array<[string, SituationFacts]> = [
        ["phone", facts({ bestChapterEndEnergy: 60 })],
        ["stoploss", facts({ stopHits: 3 })],
        ["explained", facts({ thesisLosses: 3 })],
        ["kimsmile", facts({ kimStreak: 3 })],
        ["patience", facts({ waitsThisChapter: 5 })],
        ["margin", facts({ blindLosses: 3 })],
        ["bottom", facts({ everRuined: true })],
        ["spread", facts({ mostHoldingsAtChapterEnd: 3 })],
        ["insider", facts({ blindGains: 3 })],
        ["everyone", facts({ blindLosses: 1 })],
    ];
    for (const [id, f] of cases) {
        const s = SITUATION_BY_ID[id]!;
        assert.ok(isMet(s, f), `${s.name} 은 이 사실에서 채워져야 한다`);
        assert.ok(!isMet(s, EMPTY_FACTS), `${s.name} 이 빈 사실에서 채워지면 안 된다`);
    }
});

test("한 걸음 모자라면 아직 아니다", () => {
    assert.ok(!isMet(SITUATION_BY_ID.stoploss!, facts({ stopHits: 2 })));
    assert.ok(!isMet(SITUATION_BY_ID.phone!, facts({ bestChapterEndEnergy: 59 })));
});

test("이미 가진 것은 다시 안 나온다 — 겪은 장면은 하나뿐이다", () => {
    const f = facts({ stopHits: 3, blindLosses: 3 });
    const first = newlyEarned(f, [...STARTER_IDS]).map(s => s.id);
    assert.ok(first.includes("stoploss"));
    const again = newlyEarned(f, [...STARTER_IDS, ...first]).map(s => s.id);
    assert.equal(again.length, 0, "두 번째에는 아무것도 안 나와야 한다");
});

test("처음 셋은 갈래가 겹치지 않는다 — 정보·집행·방어 하나씩", () => {
    const lanes = STARTER_IDS.map(id => SITUATION_BY_ID[id]!.lane);
    assert.equal(new Set(lanes).size, STARTER_IDS.length);
    assert.ok(lanes.includes("info"), "근거를 댈 수 있는 카드가 처음부터 있어야 한다");
});

test("가장 가까운 것부터 보여 준다", () => {
    const f = facts({ stopHits: 2, blindGains: 0 });
    const up = nextUp(f, [...STARTER_IDS], 3).map(s => s.id);
    assert.ok(up.includes("stoploss"), "2/3 인 것이 위에 와야 한다");
    assert.equal(up.length, 3);
});

/* ── 근거가 되는 것과 아닌 것 ──────────────────────────────── */

test("정보 갈래는 근거가 되지만 「내부자 제보」만은 아니다", () => {
    for (const s of SITUATIONS) {
        if (s.id === "insider") {
            assert.equal(countsAsThesis(s), false, "얻어들은 것은 근거가 아니다");
        } else if (s.lane === "info") {
            assert.equal(countsAsThesis(s), true, `${s.name} 은 근거가 되어야 한다`);
        } else {
            assert.equal(countsAsThesis(s), false);
        }
    }
});

/* ── 덱 ────────────────────────────────────────────────────── */

test("손패는 셋이고 들고 나간 것에서만 나온다", () => {
    const loadout = [...STARTER_IDS, "stoploss", "phone", "margin"].slice(0, LOADOUT_SIZE);
    const d = new DeckManager(1, loadout);
    const hand = d.dealHand();
    assert.equal(hand.length, HAND_SIZE);
    for (const c of hand) assert.ok(loadout.includes(c.id), `${c.name} 은 덱에 없는 카드다`);
});

test("정보 카드를 내면 근거가 박히고, 저주가 있으면 지워진다", () => {
    const d = new DeckManager(2, ["report", "everyone"]);
    const hand = d.dealHand();
    const report = hand.find(c => c.id === "report");
    assert.ok(report, "덱에 넣은 카드는 손에 잡혀야 한다");
    d.playCard(report!.uid);
    assert.equal(d.buildBuff().thesis, SITUATION_BY_ID.report!.name);

    const curse = hand.find(c => c.id === "everyone");
    if (curse) {
        d.playCard(curse.uid);
        assert.equal(d.buildBuff().thesis, null, "저주가 걸린 턴에는 근거를 못 댄다");
    }
});

test("「내부자 제보」를 내도 근거가 안 박힌다", () => {
    const d = new DeckManager(3, ["insider"]);
    const hand = d.dealHand();
    d.playCard(hand[0]!.uid);
    const b = d.buildBuff();
    assert.ok(b.peekTurns >= 2, "미리 보기는 열린다");
    assert.equal(b.thesis, null, "그러나 근거는 아니다");
});

test("덱이 손패보다 짧아도 돌아간다", () => {
    const d = new DeckManager(4, ["report"]);
    assert.equal(d.dealHand().length, 1);
});

test("낸 카드는 버린 더미로 가고 다시 섞여 돌아온다", () => {
    const d = new DeckManager(5, ["report", "split", "burned"]);
    for (let turn = 0; turn < 6; turn++) {
        const hand = d.dealHand();
        assert.ok(hand.length > 0, `${turn}턴에 손패가 비면 안 된다`);
        d.playCard(hand[0]!.uid);
        d.consumeTurn(d.buildBuff());
    }
});

/* ── 회귀 ──────────────────────────────────────────────────── */

const summary = (over: Partial<ChapterSummary> = {}): ChapterSummary => ({
    returnPct: 0, fee: 0, startEquity: 1, finalEquity: 1, energy: 50, debt: 0,
    idle: false, ruined: false, burnedOut: false, earned: [], ...over,
});

test("겪은 것은 기억에 남고 중복되지 않는다", () => {
    const m1 = remember(EMPTY, summary({ earned: ["stoploss"] }), 1);
    assert.ok(m1.situations.includes("stoploss"));
    const m2 = remember(m1, summary({ earned: ["stoploss"] }), 1);
    assert.equal(m2.situations.filter(id => id === "stoploss").length, 1);
});

test("회귀하면 회차가 오르고 사실은 지워지지만 상황카드는 남는다", () => {
    const before = remember(EMPTY, summary({ earned: ["stoploss", "phone"] }), 2);
    const after = regress({ ...before, facts: facts({ stopHits: 3, kimStreak: 2 }) }, "burnout");
    assert.equal(after.cycle, before.cycle + 1);
    assert.deepEqual(after.situations, before.situations, "겪은 장면은 되돌릴 수 없다");
    assert.equal(after.facts.stopHits, 0, "회차 안에서 쌓은 사실은 지워진다");
    assert.equal(after.facts.kimStreak, 0);
});

test("바닥을 본 사실만은 회차를 넘어 남는다", () => {
    const after = regress(EMPTY, "ruined");
    assert.equal(after.facts.everRuined, true);
    // 그래서 다음 회차에 「바닥을 본 적 있다」가 열린다.
    assert.ok(isMet(SITUATION_BY_ID.bottom!, after.facts));
});

test("루프를 끊는 것은 빚 완납 하나뿐이다", () => {
    assert.equal(breaksLoop("debtCleared"), true);
    for (const r of ["debtRemains", "burnout", "ruined"] as const) {
        assert.equal(breaksLoop(r), false, `${r} 는 1997 로 돌아가야 한다`);
    }
});

test("빚을 갚은 기록은 그 뒤 회차에도 남는다", () => {
    // 시작 화면이 「해낸 적 있다」를 보여 주는 근거다. 이 기록이 없으면 회차가 쌓여도
    // 무엇이 남았는지 알 수 없고, 회귀가 그냥 도는 것처럼 보인다.
    const won = regress(EMPTY, "debtCleared");
    assert.equal(won.escaped, true);
    assert.equal(won.cycle, EMPTY.cycle + 1);

    const later = regress(regress(won, "ruined"), "burnout");
    assert.equal(later.escaped, true, "한 번 빠져나온 기록은 지워지지 않는다");
    assert.equal(later.cycle, EMPTY.cycle + 3);

    // 반대로 진 판만으로는 이 기록이 안 생긴다.
    assert.equal(regress(regress(EMPTY, "ruined"), "debtRemains").escaped, false);
});

test("끝난 이유는 하나만 말한다 — 빚을 갚았으면 그것이 먼저다", () => {
    assert.equal(endReasonOf({ debt: 0, energy: 0, ruined: true, finalChapterDone: true }), "debtCleared");
    assert.equal(endReasonOf({ debt: 100, energy: 50, ruined: true, finalChapterDone: false }), "ruined");
    assert.equal(endReasonOf({ debt: 100, energy: 0, ruined: false, finalChapterDone: false }), "burnout");
    assert.equal(endReasonOf({ debt: 100, energy: 50, ruined: false, finalChapterDone: true }), "debtRemains");
    assert.equal(endReasonOf({ debt: 100, energy: 50, ruined: false, finalChapterDone: false }), null);
});

test("들고 나갈 덱은 가진 것 안에서만 고른다", () => {
    const m = remember(EMPTY, summary({ earned: ["stoploss"] }), 1);
    assert.ok(m.loadout.every(id => m.situations.includes(id)));
    assert.ok(m.loadout.length <= LOADOUT_SIZE);
});

/* ── 알아본 것이 무슨 말을 하는가 ───────────────────────────── */

test("판정은 국면에서 나온다 — 상승이면 지금, 하락이면 아니다", () => {
    const read = (regime: "bull" | "bear" | "chop" | null) => ({
        next: [], regime, regimeDrift: null, turnsLeft: null, nextRegime: null, nextDrift: null,
    });
    assert.equal(verdictOf(read("bull")), "buy");
    assert.equal(verdictOf(read("bear")), "avoid");
    assert.equal(verdictOf(read("chop")), "unclear");
});

test("안 알아본 종목은 판정이 「모른다」다", () => {
    // **화면이 null 을 넘겨야 하는 자리다.** 국면은 시장에 하나뿐이라 아무 종목의 read 나
    // 넘기면 3 에너지로 아홉 종목이 다 열린다 — 실제로 그렇게 새고 있었다.
    assert.equal(verdictOf(null), "unknown");
    assert.equal(verdictOf(undefined), "unknown");
    assert.equal(verdictOf({
        next: [], regime: null, regimeDrift: null, turnsLeft: null,
        nextRegime: null, nextDrift: null,
    }), "unknown");
});

test("권할 값어치가 있는 것은 상승 하나뿐이다", () => {
    // 「이 종목은 아니다」라고 말해 놓고 「권한다」를 제일 밝게 두면 화면이 스스로와 싸운다.
    assert.equal(worthRecommending("buy"), true);
    for (const v of ["avoid", "unclear", "unknown"] as const) {
        assert.equal(worthRecommending(v), false, `${v} 는 권할 자리가 아니다`);
    }
});

test("판정마다 다른 말을 하고, 빈 문구가 없다", () => {
    const heads = new Set<string>();
    for (const v of ["buy", "avoid", "unclear", "unknown"] as const) {
        const { head, sub } = verdictSay(v);
        assert.ok(head.length > 0 && sub.length > 0, `${v} 의 문구가 비었다`);
        heads.add(head);
    }
    assert.equal(heads.size, 4, "판정 넷이 같은 말을 한다");
});
