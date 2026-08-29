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
    StockEngine, START_CASH, MAX_TURNS, BUY_FEE_NUM, SELL_FEE_NUM, SELL_TAX_NUM,
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

    e.tick(buff({ priceBias: 0.2 }));   // 값이 오른 뒤
    const second = e.buyHalf();
    if (!second.ok) return;

    assert.ok(e.player.avgPrice > p1, "비싸게 더 샀는데 평단이 안 올랐다");
    assert.ok(e.player.avgPrice < second.price * 1.01, "평단이 두 번째 값보다 비싸다");
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
    const b = waived.sellAll(buff({ feeWaived: true }));

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

test("인사이더 호재는 주가를 올린다", () => {
    // 한 판만 보면 랜덤워크에 묻힌다. 여러 시드에서 평균이 갈리는지를 본다.
    let plain = 0, boosted = 0;
    for (let seed = 0; seed < 40; seed++) {
        plain += new StockEngine(seed).tick(NO_BUFF).changePct;
        boosted += new StockEngine(seed).tick(buff({ priceBias: 0.12 })).changePct;
    }
    assert.ok(boosted > plain + 40 * 8, `호재가 안 먹었다: ${plain / 40} → ${boosted / 40}`);
});

test("방어막은 내릴 때만 듣는다", () => {
    for (let seed = 0; seed < 40; seed++) {
        const bare = new StockEngine(seed).tick(NO_BUFF).changePct;
        const shielded = new StockEngine(seed).tick(buff({ downshieldRatio: 0.5 })).changePct;
        if (bare < 0) assert.ok(shielded > bare, `시드 ${seed}: 하락을 안 줄였다`);
        else assert.ok(Math.abs(shielded - bare) < 1e-9, `시드 ${seed}: 상승까지 건드렸다`);
    }
});

test("급반등은 내린 턴을 오른 턴으로 뒤집는다", () => {
    let flipped = 0, down = 0;
    for (let seed = 0; seed < 40; seed++) {
        const bare = new StockEngine(seed).tick(NO_BUFF).changePct;
        if (bare >= 0) continue;
        down++;
        if (new StockEngine(seed).tick(buff({ reboundRatio: 1 })).changePct > 0) flipped++;
    }
    assert.ok(down > 0, "내린 턴이 하나도 없어 견줄 수가 없다");
    assert.equal(flipped, down, `${down}번 중 ${flipped}번만 뒤집혔다`);
});

test("카드가 겹쳐도 하루에 주가가 두 배가 되지는 않는다", () => {
    // 등락률이 아니라 **값**으로 잰다. 종가는 정수로 반올림되므로 45% 를 1원 넘길 수
    // 있는데, 그건 규칙이 샌 것이 아니라 반올림이다.
    for (let seed = 0; seed < 30; seed++) {
        const e = new StockEngine(seed);
        const open = e.stock.currentPrice;
        e.tick(buff({ priceBias: 5, volatilityMult: 10 }));
        assert.ok(e.stock.currentPrice <= Math.round(open * 1.45),
            `시드 ${seed}: ${open} → ${e.stock.currentPrice}`);
    }
});

test("주가는 0 아래로 안 내려간다", () => {
    const e = new StockEngine(61);
    for (let i = 0; i < 200; i++) {
        e.tick(buff({ priceBias: -5, volatilityMult: 10 }));
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

test("굴린 판은 잃었어도 인사이트가 남는다", () => {
    // 바닥이 0 이 아니다 — 한 판을 끝까지 굴린 것 자체에 값을 준다
    const e = new StockEngine(107);
    e.buyAll();
    playOut(e);
    e.liquidate();
    const sum = e.summarize();
    assert.equal(sum.idle, false);
    assert.ok(sum.earnedIP >= 1, `${sum.returnPct}% 인데 IP 가 ${sum.earnedIP} 다`);
});

test("잘한 판일수록 인사이트가 많다", () => {
    const bad = new StockEngine(109);
    bad.buyAll(); playOut(bad, buff({ priceBias: -0.05 })); bad.liquidate();

    const good = new StockEngine(109);
    good.buyAll(); playOut(good, buff({ priceBias: 0.05 })); good.liquidate();

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
