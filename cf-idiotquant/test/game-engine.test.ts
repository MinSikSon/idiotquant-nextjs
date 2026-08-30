// 로그라이크 코어 — 주가·체결·정산.
//
// 이 파일이 존재할 수 있다는 것이 설계의 값이다. StockEngine 이 Phaser 를 import 하지
// 않으므로 브라우저도 캔버스도 없이 규칙만 돌려 볼 수 있다.
//
// 값을 박제하지 않고 상수에서 식을 세워 견준다. 계수를 바꾸면 테스트도 같이 따라와야
// "규칙이 바뀐 것"이고, 식이 어긋나면 그때 깨진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    StockEngine, START_CASH, MAX_TURNS, BUST_RATIO,
    BUY_FEE_NUM, SELL_FEE_NUM, SELL_TAX_NUM,
} from "@/lib/game/core/StockEngine";
import { NO_BUFF, type TurnBuff } from "@/lib/game/core/types";

const buff = (over: Partial<TurnBuff> = {}): TurnBuff => ({ ...NO_BUFF, ...over });

/** 12턴을 끝까지 굴린다. 매 턴 같은 버프를 쓴다. */
function playOut(e: StockEngine, b: TurnBuff = NO_BUFF) {
    while (!e.isOver) { e.tick(b); e.advanceTurn(); }
}

/* ── 판 만들기 ───────────────────────────────────────────────── */

test("판은 현금 1,000만과 1턴에서 시작한다", () => {
    const e = new StockEngine(1);
    assert.equal(e.player.cash, START_CASH);
    assert.equal(e.player.shares, 0);
    assert.equal(e.player.currentTurn, 1);
    assert.equal(e.player.maxTurns, MAX_TURNS);
    assert.equal(e.equity, START_CASH);
    assert.equal(e.totalReturnPct, 0);
});

test("시작할 때 이미 볼 캔들이 있다", () => {
    // 첫 턴에 차트가 점 하나면 무엇을 보고 사야 할지 알 수 없다
    const e = new StockEngine(2);
    assert.ok(e.stock.history.length >= 5, `컨텍스트 봉이 ${e.stock.history.length}개뿐이다`);
    assert.ok(e.stock.currentPrice > 0);
});

/* ── 시드 ───────────────────────────────────────────────────── */

test("같은 시드는 같은 판을 준다", () => {
    // 로그라이크는 "그 판이 어땠는지" 를 말할 수 있어야 한다
    const a = new StockEngine(12345), b = new StockEngine(12345);
    assert.equal(a.stock.ticker, b.stock.ticker);

    for (let i = 0; i < 12; i++) {
        assert.deepEqual(a.tick(NO_BUFF).candle, b.tick(NO_BUFF).candle, `${i}턴이 갈라졌다`);
    }
});

test("다른 시드는 다른 판을 준다", () => {
    const a = new StockEngine(1), b = new StockEngine(999);
    const ta = Array.from({ length: 12 }, () => a.tick(NO_BUFF).candle.c);
    const tb = Array.from({ length: 12 }, () => b.tick(NO_BUFF).candle.c);
    assert.notDeepEqual(ta, tb);
});

/* ── 매수 ───────────────────────────────────────────────────── */

test("절반 매수는 현금의 절반만 쓴다", () => {
    const e = new StockEngine(7);
    const before = e.player.cash;
    const res = e.buyHalf();
    assert.equal(res.ok, true);
    if (!res.ok) return;

    const spent = before - e.player.cash;
    assert.ok(spent <= Math.floor(before / 2), `절반보다 많이 썼다: ${spent}`);
    // 한 주 값만큼의 오차는 남는다 — 주는 쪼갤 수 없다
    assert.ok(spent > Math.floor(before / 2) - res.price * 2, `절반에 한참 못 미친다: ${spent}`);
    assert.equal(e.player.shares, res.qty);
});

test("수수료까지 예산 안에 들어온다 — 현금이 음수가 되지 않는다", () => {
    // 수수료를 뺀 뒤 수량을 잡으면 마지막 한 주에서 현금이 음수가 된다
    for (const seed of [1, 2, 3, 42, 777]) {
        const e = new StockEngine(seed);
        const res = e.buyAll();
        assert.equal(res.ok, true, `시드 ${seed} 에서 못 샀다`);
        assert.ok(e.player.cash >= 0, `시드 ${seed} 에서 현금이 ${e.player.cash} 다`);
    }
});

test("평단가는 수수료까지 담은 실제 원가다", () => {
    const e = new StockEngine(11);
    const res = e.buyAll();
    if (!res.ok) return;

    const total = res.price * res.qty + res.fee;
    assert.equal(Math.round(e.player.avgPrice * res.qty), total);
    // 그래서 사자마자는 늘 살짝 마이너스다 — 그게 "본전" 의 진짜 자리다
    assert.ok(e.unrealizedPct < 0, `사자마자 ${e.unrealizedPct}% 다`);
});

test("두 번 나눠 사면 평단이 둘 사이에 놓인다", () => {
    const e = new StockEngine(23);
    const first = e.buyHalf();
    if (!first.ok) return;
    const p1 = e.player.avgPrice;

    // 값이 오를지 내릴지는 국면이 정한다. 방향을 가정하지 말고 **사이에 놓이는지**만 본다.
    for (let i = 0; i < 3; i++) e.tick();
    const second = e.buyHalf();
    if (!second.ok) return;

    const lo = Math.min(first.price, second.price), hi = Math.max(first.price, second.price);
    assert.ok(e.player.avgPrice >= lo * 0.99, `평단 ${e.player.avgPrice} 이 둘보다 싸다`);
    assert.ok(e.player.avgPrice <= hi * 1.02, `평단 ${e.player.avgPrice} 이 둘보다 비싸다`);
    assert.equal(e.player.shares, first.qty + second.qty);
});

test("현금이 한 주 값에 못 미치면 거절한다", () => {
    const e = new StockEngine(5);
    e.buyAll();
    const again = e.buyAll();
    assert.equal(again.ok, false);
    if (again.ok) return;
    assert.match(again.error, /현금/);
});

/* ── 매도 ───────────────────────────────────────────────────── */

test("안 들고 있으면 못 판다", () => {
    const e = new StockEngine(3);
    const res = e.sellAll();
    assert.equal(res.ok, false);
});

test("매도에는 수수료와 거래세가 둘 다 붙는다", () => {
    const e = new StockEngine(31);
    e.buyAll();
    const qty = e.player.shares;
    const price = e.stock.currentPrice;

    const res = e.sellAll();
    assert.equal(res.ok, true);
    if (!res.ok) return;

    const gross = price * qty;
    const expected = Math.floor((gross * SELL_FEE_NUM) / 100_000)
        + Math.floor((gross * SELL_TAX_NUM) / 100_000);
    assert.equal(res.fee, expected);
    assert.equal(e.player.shares, 0);
    assert.equal(e.player.avgPrice, 0);
});

test("수수료 면제 카드는 세금까지 면제한다", () => {
    const plain = new StockEngine(41);
    plain.buyAll();
    const a = plain.sellAll();

    const waived = new StockEngine(41);
    waived.buyAll();
    const b = waived.sellAll(buff({ feeMult: 0 }));

    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.ok(a.fee > 0);
    assert.equal(b.fee, 0);
    assert.ok(waived.player.cash > plain.player.cash, "면제받았는데 현금이 안 늘었다");
});

test("사고 바로 팔면 수수료만큼 손해다", () => {
    // 값이 안 움직였는데 이익이 나면 수수료가 어딘가에서 새고 있는 것이다
    const e = new StockEngine(53);
    e.buyAll();
    e.sellAll();
    assert.ok(e.player.cash < START_CASH, `사고 팔았는데 ${e.player.cash} 다`);

    const lost = START_CASH - e.player.cash;
    const bp = (BUY_FEE_NUM + SELL_FEE_NUM + SELL_TAX_NUM) / 100_000;
    assert.ok(lost < START_CASH * bp * 1.1, `수수료보다 많이 잃었다: ${lost}`);
});

/* ── 주가 ───────────────────────────────────────────────────── */

test("판의 등락은 시드에서 미리 정해진다 — 예보는 그것을 앞당겨 볼 뿐이다", () => {
    // 이 성질이 없으면 "예보" 는 정보가 아니라 그냥 좋은 일이 일어나는 카드가 된다.
    const e = new StockEngine(301);
    const seen = e.read(buff({ peekTurns: 2 })).next;
    assert.equal(seen.length, 2);

    const first = e.tick().changePct;
    assert.ok(Math.abs(first - seen[0]!) < 0.5, `예보 ${seen[0]}% 인데 실제 ${first}%`);
    const second = e.tick().changePct;
    assert.ok(Math.abs(second - seen[1]!) < 0.5, `둘째 턴 예보가 어긋났다`);
});

test("카드를 안 쓰면 아무것도 안 보인다", () => {
    const r = new StockEngine(302).read(NO_BUFF);
    assert.deepEqual(r.next, []);
    assert.equal(r.regime, null);
    assert.equal(r.turnsLeft, null);
});

test("정보 차단은 무엇을 읽어도 가린다", () => {
    // 저주 하나가 그 턴의 정보를 통째로 지운다.
    const e = new StockEngine(303);
    const r = e.read(buff({ peekTurns: 2, revealRegime: true, revealClock: true, blind: true }));
    assert.deepEqual(r.next, []);
    assert.equal(r.regime, null);
});

test("국면은 세 종류뿐이고 몇 턴씩 이어진다", () => {
    // 이어지지 않으면 차트에 읽을 것이 없다. 이 게임의 심장이다.
    let runs = 0, total = 0;
    for (let seed = 0; seed < 60; seed++) {
        const e = new StockEngine(seed);
        let prev: string | null = null, len = 0;
        for (let t = 0; t < 12; t++) {
            const now = e.read(buff({ revealRegime: true })).regime!;
            assert.ok(["bull", "bear", "chop"].includes(now));
            if (now === prev) len++;
            else { if (prev !== null) { runs++; total += len; } prev = now; len = 1; }
            e.tick();
        }
    }
    const avg = total / runs;
    assert.ok(avg >= 2 && avg <= 6, `국면이 평균 ${avg.toFixed(1)}턴 — 너무 짧거나 길다`);
});

test("오른 턴 다음에 또 오를 확률이 동전보다 높다", () => {
    // 51.6% 이던 시절엔 차트가 장식이었다. 읽을 것이 생겼는지를 재는 유일한 잣대다.
    let up = 0, again = 0;
    for (let seed = 0; seed < 300; seed++) {
        const e = new StockEngine(seed);
        let prev = 0;
        for (let t = 0; t < 12; t++) {
            const c = e.tick().changePct;
            if (prev > 0) { up++; if (c > 0) again++; }
            prev = c;
        }
    }
    const rate = again / up;
    assert.ok(rate > 0.56, `오른 턴 다음 상승 확률이 ${(rate * 100).toFixed(1)}% — 읽을 것이 없다`);
});

test("헤지는 위아래를 함께 줄인다", () => {
    for (let seed = 0; seed < 30; seed++) {
        const bare = new StockEngine(seed).tick().changePct;
        const hedged = new StockEngine(seed).tick(buff({ moveMult: 0.5 })).changePct;
        assert.ok(Math.abs(hedged) <= Math.abs(bare) + 0.01, `시드 ${seed}: 헤지가 키웠다`);
        if (Math.abs(bare) > 1) {
            assert.ok(Math.sign(hedged) === Math.sign(bare), `시드 ${seed}: 방향이 뒤집혔다`);
        }
    }
});

test("벙커는 내릴 때만 듣는다", () => {
    for (let seed = 0; seed < 30; seed++) {
        const bare = new StockEngine(seed).tick().changePct;
        const guarded = new StockEngine(seed).tick(buff({ downshieldRatio: 0.9 })).changePct;
        if (bare < 0) assert.ok(guarded > bare, `시드 ${seed}: 하락을 못 막았다`);
        else assert.ok(Math.abs(guarded - bare) < 1e-9, `시드 ${seed}: 상승까지 건드렸다`);
    }
});

test("손절 예약은 정해 둔 만큼 빠졌을 때만 던진다", () => {
    let fired = 0, held = 0;
    for (let seed = 0; seed < 60; seed++) {
        const e = new StockEngine(seed);
        e.buyAll();
        const b = buff({ stopLoss: 0.08 });
        const res = e.tick(b);
        if (res.changePct <= -8) {
            assert.equal(e.player.shares, 0, `시드 ${seed}: ${res.changePct}% 인데 안 던졌다`);
            assert.equal(e.stoppedOut, true);
            fired++;
        } else {
            assert.ok(e.player.shares > 0, `시드 ${seed}: ${res.changePct}% 인데 던졌다`);
            held++;
        }
    }
    assert.ok(fired > 0 && held > 0, "한쪽만 나와 견줄 수가 없다");
});

test("신용은 현금보다 많이 사게 하고, 그만큼 빚이 된다", () => {
    const plain = new StockEngine(304); plain.buyAll();
    const lev = new StockEngine(304); lev.buyAll(buff({ buyingPowerMult: 2 }));

    assert.ok(lev.player.shares > plain.player.shares, "신용인데 더 못 샀다");
    assert.ok(lev.player.cash < 0, "빚이 안 생겼다");
    assert.ok(lev.equity < plain.equity + 1, "공짜로 자산이 늘었다");
});

test("이자는 현금에서만 빠진다", () => {
    const e = new StockEngine(305);
    const before = e.player.cash;
    e.tick(buff({ cashDrainPct: 0.05 }));
    assert.equal(e.player.cash, before - Math.floor(before * 0.05));
});

test("수수료 배수는 세 배로도 간다", () => {
    const one = new StockEngine(306); one.buyAll();
    const three = new StockEngine(306); three.buyAll();
    const a = one.sellAll();
    const b = three.sellAll(buff({ feeMult: 3 }));
    assert.ok(a.ok && b.ok);
    if (a.ok && b.ok) assert.equal(b.fee, a.fee * 3);
});

test("카드가 겹쳐도 하루에 주가가 두 배가 되지는 않는다", () => {
    // 등락률이 아니라 **값**으로 잰다. 종가는 정수로 반올림되므로 45% 를 1원 넘길 수
    // 있는데, 그건 규칙이 샌 것이 아니라 반올림이다.
    for (let seed = 0; seed < 30; seed++) {
        const e = new StockEngine(seed);
        const open = e.stock.currentPrice;
        e.tick(buff({ moveMult: 10 }));
        assert.ok(e.stock.currentPrice <= Math.round(open * 1.45),
            `시드 ${seed}: ${open} → ${e.stock.currentPrice}`);
    }
});

test("주가는 0 아래로 안 내려간다", () => {
    const e = new StockEngine(61);
    for (let i = 0; i < 200; i++) {
        e.tick(buff({ moveMult: 10, downshieldRatio: 0 }));
        assert.ok(e.stock.currentPrice > 0, `${i}번째에 ${e.stock.currentPrice} 가 됐다`);
    }
});

test("틱마다 봉이 하나씩 자란다", () => {
    const e = new StockEngine(71);
    const before = e.stock.history.length;
    for (let i = 1; i <= 5; i++) {
        e.tick(NO_BUFF);
        assert.equal(e.stock.history.length, before + i);
    }
});

test("봉의 고가·저가는 몸통을 감싼다", () => {
    const e = new StockEngine(83);
    for (let i = 0; i < 30; i++) {
        const c = e.tick(NO_BUFF).candle;
        assert.ok(c.h >= Math.max(c.o, c.c), `고가가 몸통 안에 있다: ${JSON.stringify(c)}`);
        assert.ok(c.l <= Math.min(c.o, c.c), `저가가 몸통 안에 있다: ${JSON.stringify(c)}`);
        assert.ok(c.l > 0);
    }
});

/* ── 턴과 정산 ──────────────────────────────────────────────── */

test("12턴을 넘기면 판이 끝난다", () => {
    const e = new StockEngine(97);
    for (let i = 0; i < MAX_TURNS - 1; i++) {
        e.advanceTurn();
        assert.equal(e.isOver, false, `${e.player.currentTurn}턴에 벌써 끝났다`);
    }
    e.advanceTurn();
    assert.equal(e.isOver, true);
});

test("청산하면 주식이 현금이 된다", () => {
    const e = new StockEngine(101);
    e.buyAll();
    playOut(e);
    assert.ok(e.player.shares > 0);

    e.liquidate();
    assert.equal(e.player.shares, 0);
    assert.equal(e.equity, e.player.cash);
});

test("한 주도 안 산 판은 인사이트가 0 이다", () => {
    // 아무것도 안 하는 것이 쌓이면 게임이 멈춘다
    const e = new StockEngine(103);
    playOut(e);
    const sum = e.summarize();
    assert.equal(sum.idle, true);
    assert.equal(sum.earnedIP, 0);
    assert.equal(e.player.insightPoints, 0);
});

test("청산선 위에서 끝냈으면 잃었어도 인사이트가 남는다", () => {
    // 바닥이 0 이 아니다 — 한 판을 **끝까지 굴린 것** 자체에 값을 준다. 다만 청산되면
    // 그 값도 사라진다(아래 청산 테스트). 그 둘을 가르는 것이 청산선이다.
    let checked = 0;
    for (const seed of [107, 131, 149, 151, 163]) {
        const e = new StockEngine(seed);
        e.buyAll();
        playOut(e);
        e.liquidate();
        const sum = e.summarize();
        assert.equal(sum.idle, false);
        if (sum.bankrupt) continue;               // 청산된 판은 여기서 볼 것이 아니다
        assert.ok(sum.earnedIP >= 1, `${sum.returnPct}% 인데 IP 가 ${sum.earnedIP} 다`);
        checked++;
    }
    assert.ok(checked > 0, "청산선 위에서 끝난 판이 하나도 없다");
});

test("잘한 판일수록 인사이트가 많다", () => {
    const bad = new StockEngine(109);
    bad.buyAll(); playOut(bad, buff({ moveMult: 1 })); bad.liquidate();

    const good = new StockEngine(109);
    good.buyAll(); playOut(good, buff({ downshieldRatio: 1 })); good.liquidate();

    assert.ok(good.summarize().earnedIP > bad.summarize().earnedIP);
});

test("정산은 시작 자산 대비로 잰다", () => {
    const e = new StockEngine(113);
    e.buyAll();
    playOut(e);
    e.liquidate();
    const sum = e.summarize();

    assert.equal(sum.startEquity, START_CASH);
    assert.equal(sum.finalEquity, e.equity);
    assert.ok(Math.abs(sum.returnPct - ((sum.finalEquity - START_CASH) / START_CASH) * 100) < 1e-9);
});

test("끝난 판도 총자산 계산이 맞는다", () => {
    const e = new StockEngine(127);
    e.buyHalf();
    playOut(e);
    assert.equal(e.equity, e.player.cash + e.player.shares * e.stock.currentPrice);
});

/* ── 청산 — 지는 방법 ───────────────────────────────────────── */

test("청산선은 시작 자금의 75% 다", () => {
    const e = new StockEngine(200);
    assert.equal(e.bustLine, Math.round(START_CASH * BUST_RATIO));
    assert.equal(e.isBust, false, "시작하자마자 청산일 수는 없다");
    assert.equal(e.isOver, false);
});

test("청산선 아래로 떨어지면 12턴을 못 채우고 끝난다", () => {
    const e = new StockEngine(201);
    e.buyAll();
    // 들고 있는 주식이 반의 반이 되도록 주가를 직접 끌어내린다. 엔진의 난수를 기다리는
    // 대신 상태를 세워 두는 편이 규칙 하나만 보게 해 준다.
    e.stock.currentPrice = Math.max(1, Math.floor(e.stock.currentPrice * 0.25));

    assert.ok(e.equity < e.bustLine, "판을 못 세웠다");
    assert.equal(e.isBust, true);
    assert.equal(e.isOver, true, "턴이 남았어도 끝난 것이다");
    assert.ok(e.player.currentTurn <= MAX_TURNS);
});

test("청산된 판은 인사이트를 한 점도 안 준다", () => {
    const e = new StockEngine(202);
    e.buyAll();
    e.stock.currentPrice = Math.max(1, Math.floor(e.stock.currentPrice * 0.2));
    e.liquidate();

    const sum = e.summarize();
    assert.equal(sum.bankrupt, true);
    assert.equal(sum.earnedIP, 0, "청산인데 점수를 줬다");
    assert.equal(e.player.insightPoints, 0);
});

test("살아서 끝낸 판은 청산이 아니다", () => {
    const e = new StockEngine(203);
    e.buyHalf();
    playOut(e);
    e.liquidate();
    const sum = e.summarize();

    // 12턴을 채웠으면 성적이 나빠도 청산선 위에 있는 한 청산이 아니다.
    assert.equal(sum.bankrupt, e.equity < e.bustLine);
    if (!sum.bankrupt) assert.ok(sum.earnedIP >= 0);
});

test("현금만 들고 있으면 청산되지 않는다", () => {
    // 청산은 주가에 물려 잃는 것이지, 가만히 있다고 오는 것이 아니다.
    const e = new StockEngine(204);
    playOut(e);
    assert.equal(e.isBust, false);
    assert.equal(e.summarize().bankrupt, false);
});
