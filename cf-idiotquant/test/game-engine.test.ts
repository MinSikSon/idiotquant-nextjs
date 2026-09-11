// 코어 — 주가·체결·챕터·회귀.
//
// 이 파일이 존재할 수 있다는 것이 설계의 값이다. `core/` 가 Phaser 를 import 하지 않으므로
// 브라우저도 캔버스도 없이 규칙만 돌려 볼 수 있다.
//
// 값을 박제하지 않고 상수와 정의에서 식을 세워 견준다. 계수를 바꾸면 테스트도 같이
// 따라와야 "규칙이 바뀐 것" 이고, 식이 어긋나면 그때 깨진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    StockEngine, SEED_CASH, RUIN_RATIO, RUIN_FLOOR, ENERGY_START,
    BUY_FEE_NUM, SELL_FEE_NUM, SELL_TAX_NUM,
} from "@/lib/game/core/StockEngine";
import {
    CHAPTERS, TOTAL_TURNS, UNIVERSE, newlyListedAt, regimeTimeline,
} from "@/lib/game/core/chapters";
import { NO_BUFF, type TurnBuff } from "@/lib/game/core/types";
import { advisoryFee, FEE_BASE, FEE_BY_ENERGY } from "@/lib/game/core/energy";
import { CLIENTS, entrustAmount, needOf } from "@/lib/game/core/clients";
import { odds } from "@/lib/game/core/check";

const buff = (over: Partial<TurnBuff> = {}): TurnBuff => ({ ...NO_BUFF, ...over });

/** 지금 챕터를 끝까지 굴린다. */
function playChapter(e: StockEngine, b: TurnBuff = NO_BUFF) {
    while (!e.isOver) { e.tick(b); e.advanceTurn(); }
}

/** 프롤로그부터 마지막 챕터까지 흘려보낸다. */
function playAll(e: StockEngine, b: TurnBuff = NO_BUFF) {
    for (;;) {
        playChapter(e, b);
        e.endChapter();
        if (!e.startNextChapter()) break;
    }
}

/* ── 판 만들기 ───────────────────────────────────────────────── */

test("판은 프롤로그 1997 에서 시작하고 에너지는 50 이다", () => {
    const e = new StockEngine(1);
    assert.equal(e.chapter.id, "1997");
    assert.equal(e.player.currentTurn, 1);
    assert.equal(e.player.energy, ENERGY_START);
    assert.equal(e.player.debt, 0);
});

test("프롤로그는 이미 물려 있는 자리를 물려받는다", () => {
    const e = new StockEngine(1);
    const held = Object.keys(e.player.positions);
    assert.ok(held.length > 0, "판이 열릴 때 이미 들고 있어야 한다");
    // 평단가가 지금 값보다 높다 — 판이 열리기 전에 이미 무너지기 시작했다.
    for (const id of held) {
        assert.ok(e.positionOf(id).avgPrice > e.priceOf(id),
            `${id} 는 이미 손실 상태여야 한다`);
    }
});

test("맡은 돈은 현금과 평가액의 합이다", () => {
    const e = new StockEngine(7);
    assert.equal(e.equity, e.player.cash + e.positionValue);
});

/* ── 반기마다 하나씩 상장한다 ───────────────────────────────── */

test("시작 셋 + 여섯 반기 = 아홉 종목", () => {
    assert.equal(UNIVERSE.length, 9);
    assert.equal(UNIVERSE.filter(s => s.listedAt === 1).length, 3);
});

test("각 챕터의 1턴과 7턴에 정확히 하나씩 상장한다", () => {
    const listingTurns = UNIVERSE.map(s => s.listedAt).filter(t => t > 1).sort((a, b) => a - b);
    // 프롤로그(4턴)를 뺀 세 챕터의 반기 첫 턴들.
    const expected = CHAPTERS.slice(1).flatMap(c => [c.startTurn, c.startTurn + 6]);
    assert.deepEqual(listingTurns, expected.sort((a, b) => a - b));
    for (const t of expected) {
        assert.ok(newlyListedAt(t), `${t}턴에 상장이 있어야 한다`);
    }
});

test("상장 전 종목은 목록에도 봉에도 없다", () => {
    const e = new StockEngine(3);
    const late = UNIVERSE.find(s => s.listedAt > 1)!;
    assert.ok(!e.listed.some(s => s.id === late.id), "프롤로그에는 안 보여야 한다");
    assert.equal(e.stockOf(late.id)!.history.length, 0, "상장 전에는 봉이 없다");

    playAll(e);
    assert.ok(e.stockOf(late.id)!.history.length > 0, "상장 뒤에는 봉이 쌓인다");
});

/* ── 국면은 하나, 베타는 종목마다 ───────────────────────────── */

test("같은 국면에서 고베타가 저베타보다 크게 움직인다", () => {
    // 국면이 하나라 방향은 같고 폭만 갈려야 한다. 노이즈를 이기려면 여러 시드로 본다.
    const lowId = UNIVERSE.reduce((a, b) => (a.beta <= b.beta ? a : b)).id;
    const highId = UNIVERSE.reduce((a, b) => (a.beta >= b.beta ? a : b)).id;

    let lowMove = 0, highMove = 0;
    for (let seed = 1; seed <= 40; seed++) {
        const e = new StockEngine(seed);
        const lowStart = e.priceOf(lowId), highStart = e.priceOf(highId);
        playAll(e);
        // 상장 시점이 달라 절대 가격이 아니라 **정의된 시작가 대비**로 본다.
        const low = UNIVERSE.find(s => s.id === lowId)!;
        const high = UNIVERSE.find(s => s.id === highId)!;
        lowMove += Math.abs(e.priceOf(lowId) / (lowStart || low.price) - 1);
        highMove += Math.abs(e.priceOf(highId) / (highStart || high.price) - 1);
    }
    assert.ok(highMove > lowMove,
        `고베타(${highMove.toFixed(1)})가 저베타(${lowMove.toFixed(1)})보다 크게 움직여야 한다`);
});

test("국면 스크립트는 시드와 무관하게 같다 — 회귀가 기억을 쓸모 있게 하는 근거", () => {
    for (const ch of CHAPTERS) {
        const a = regimeTimeline(ch).map(s => s.kind);
        const b = regimeTimeline(ch).map(s => s.kind);
        assert.deepEqual(a, b);
        assert.equal(a.length, ch.turns, `${ch.id} 국면 길이가 턴 수와 같아야 한다`);
    }
});

/* ── 프롤로그는 이길 수 없다 ────────────────────────────────── */

test("프롤로그 1997 은 어떤 정책으로도 이길 수 없다", () => {
    const policies: Array<{ name: string; run: (e: StockEngine) => void }> = [
        { name: "즉시 전량 매도", run: e => { e.liquidateAll(); playChapter(e); } },
        { name: "그냥 들고 있기", run: e => playChapter(e) },
        { name: "더 사기", run: e => { for (const s of e.listed) e.buyAll(s.id); playChapter(e); } },
        { name: "방어를 들고 버티기", run: e => playChapter(e, buff({ downshieldRatio: 0.4 })) },
        { name: "매 턴 팔고 다시 사기", run: e => {
            while (!e.isOver) {
                e.liquidateAll();
                const first = e.listed[0];
                if (first) e.buyHalf(first.id);
                e.tick(); e.advanceTurn();
            }
        } },
    ];
    for (const p of policies) {
        for (let seed = 1; seed <= 25; seed++) {
            const e = new StockEngine(seed);
            const start = e.equity;
            p.run(e);
            assert.ok(e.equity < start,
                `${p.name} · 시드 ${seed}: 프롤로그는 이길 수 없어야 하는데 ${start} → ${e.equity}`);
        }
    }
});

test("프롤로그가 끝나면 빚이 생긴다", () => {
    const e = new StockEngine(5);
    playChapter(e);
    const sum = e.endChapter();
    assert.equal(sum.debt, CHAPTERS[0]!.debtOnEnd);
    assert.ok(e.player.debt > 0);
});

/* ── 체결 ───────────────────────────────────────────────────── */

test("매수는 수수료까지 예산 안에서 끝난다", () => {
    const e = new StockEngine(11);
    e.liquidateAll();
    const id = e.listed[0]!.id;
    const before = e.player.cash;
    const r = e.buy(id, before);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.fee, Math.floor((r.price * r.qty * BUY_FEE_NUM) / 100_000));
    assert.equal(e.player.cash, before - r.price * r.qty - r.fee);
    assert.ok(e.player.cash >= 0, "예산을 넘겨 사지 않는다");
});

test("매도는 수수료와 거래세를 함께 낸다", () => {
    const e = new StockEngine(11);
    e.liquidateAll();
    const id = e.listed[0]!.id;
    e.buyAll(id);
    const qty = e.positionOf(id).shares;
    const price = e.priceOf(id);
    const cashBefore = e.player.cash;

    const r = e.sellAll(id);
    assert.ok(r.ok);
    if (!r.ok) return;
    const gross = price * qty;
    const expected = Math.floor((gross * SELL_FEE_NUM) / 100_000) + Math.floor((gross * SELL_TAX_NUM) / 100_000);
    assert.equal(r.fee, expected);
    assert.equal(e.player.cash, cashBefore + gross - expected);
    assert.equal(e.positionOf(id).shares, 0);
});

test("상장 전 종목은 살 수 없다", () => {
    const e = new StockEngine(2);
    const late = UNIVERSE.find(s => s.listedAt > 1)!;
    const r = e.buy(late.id, 1_000_000);
    assert.equal(r.ok, false);
});

test("여러 종목을 동시에 들고 있어도 평가액이 맞는다", () => {
    const e = new StockEngine(13);
    e.liquidateAll();
    const ids = e.listed.slice(0, 3).map(s => s.id);
    for (const id of ids) e.buy(id, Math.floor(e.player.cash / 3));

    let sum = 0;
    for (const id of ids) sum += e.positionOf(id).shares * e.priceOf(id);
    assert.equal(e.positionValue, sum);
    assert.equal(e.equity, e.player.cash + sum);
});

/* ── 챕터를 넘는다 ──────────────────────────────────────────── */

test("보유는 챕터를 넘어 유지되고 그 시점 주가로 평가된다", () => {
    const e = new StockEngine(17);
    playChapter(e); e.endChapter(); e.startNextChapter();   // 1998
    // **1998 은 계좌 0 원으로 열린다.** 굴릴 돈은 고객이 맡겨야 생긴다.
    e.entrust(20_000_000);
    const id = e.listed[0]!.id;
    e.buyAll(id);
    const qty = e.positionOf(id).shares;
    assert.ok(qty > 0);

    playChapter(e); e.endChapter();
    const ok = e.startNextChapter();                        // 1999
    assert.ok(ok);
    assert.equal(e.positionOf(id).shares, qty, "챕터가 바뀌어도 주식은 그대로 있다");
    assert.equal(e.positionValue, qty * e.priceOf(id), "그 시점 주가로 평가된다");
});

test("1999 에 산 고베타를 2000 까지 들고 가면 저베타보다 크게 잃는다", () => {
    let highWorse = 0;
    for (let seed = 1; seed <= 30; seed++) {
        const e = new StockEngine(seed);
        // 1999 하반기까지 간다.
        while (e.chapter.id !== "1999") { playChapter(e); e.endChapter(); e.startNextChapter(); }
        while (e.player.currentTurn < 7 && !e.isOver) { e.tick(); e.advanceTurn(); }

        const listed = e.listed;
        const high = listed.reduce((a, b) => (a.beta >= b.beta ? a : b));
        const low = listed.reduce((a, b) => (a.beta <= b.beta ? a : b));
        const hp = e.priceOf(high.id), lp = e.priceOf(low.id);

        playChapter(e); e.endChapter(); e.startNextChapter();  // 2000
        playChapter(e);

        const hRet = e.priceOf(high.id) / hp - 1;
        const lRet = e.priceOf(low.id) / lp - 1;
        if (hRet < lRet) highWorse++;
    }
    assert.ok(highWorse >= 24,
        `2000년 붕괴에서 고베타가 더 죽어야 한다 — 30판 중 ${highWorse}판`);
});

test("챕터 끝에 자동 청산하지 않는다 — 들고 넘어가는 것이 요점이다", () => {
    const e = new StockEngine(19);
    playChapter(e); e.endChapter(); e.startNextChapter();
    e.entrust(20_000_000);
    const id = e.listed[0]!.id;
    e.buyAll(id);
    playChapter(e);
    e.endChapter();
    assert.ok(e.positionOf(id).shares > 0, "챕터가 끝나도 주식이 남아 있어야 한다");
});

test("남은 빚에는 챕터마다 이자가 붙는다", () => {
    const e = new StockEngine(23);
    playChapter(e); e.endChapter(); e.startNextChapter();   // 빚 3,000만
    const before = e.player.debt;
    playChapter(e);
    const sum = e.endChapter();
    assert.equal(sum.debt, Math.round(before * (1 + CHAPTERS[1]!.interest)));
});

test("전 구간은 40턴이고 마지막 챕터에서 끝난다", () => {
    assert.equal(TOTAL_TURNS, 4 + 12 * 3);
    const e = new StockEngine(29);
    playAll(e);
    assert.ok(e.isFinalChapter);
    assert.equal(e.chapter.id, "2000");
});

/* ── 끝나는 법 ─────────────────────────────────────────────── */

test("자본잠식선 아래로 떨어지면 그 자리에서 끝난다", () => {
    const e = new StockEngine(31);
    // 최고치가 기준이므로 먼저 최고치를 세운다 — 프롤로그는 이미 그만큼 굴리고 있다.
    e.advanceTurn();
    assert.ok(e.peakEquity >= RUIN_FLOOR, "프롤로그는 자본잠식이 발동할 규모다");
    e.player.cash = 0;
    for (const id of Object.keys(e.player.positions)) delete e.player.positions[id];
    assert.equal(e.ruinLine, Math.round(e.peakEquity * RUIN_RATIO));
    assert.ok(e.equity < e.ruinLine);
    assert.ok(e.isRuined);
    assert.ok(e.isOver);
});

test("아직 아무것도 안 맡은 계좌는 잠식될 것도 없다", () => {
    // **1998 이 열리는 자리다.** 고정 금액을 선으로 쓰던 동안에는 계좌 0 원이 곧
    // 자본잠식이라, 판이 열리자마자 끝났다.
    const e = new StockEngine(31);
    e.endChapter();
    e.startNextChapter();
    assert.equal(e.equity, 0);
    assert.equal(e.ruinLine, 0);
    assert.ok(!e.isRuined, "0 원으로 여는 챕터가 그 자리에서 끝나면 안 된다");
});

test("작게 굴려 본 판은 잠식으로 안 끝난다 — 바닥값이 그것을 막는다", () => {
    const e = new StockEngine(31);
    e.endChapter();
    e.startNextChapter();
    e.entrust(RUIN_FLOOR - 1);
    e.advanceTurn();
    assert.equal(e.ruinLine, 0);
    e.player.cash = 0;
    assert.ok(!e.isRuined);
});

test("에너지가 0 이면 턴이 남아도 끝난다", () => {
    const e = new StockEngine(37);
    e.player.energy = 0;
    assert.ok(e.burnedOut);
    assert.ok(e.isOver);
});

/* ── 같은 시드는 같은 판을 준다 ─────────────────────────────── */

test("같은 시드는 아홉 종목의 전 구간을 똑같이 준다", () => {
    const a = new StockEngine(4242); const b = new StockEngine(4242);
    playAll(a); playAll(b);
    for (const s of UNIVERSE) {
        assert.deepEqual(a.stockOf(s.id)!.history, b.stockOf(s.id)!.history, `${s.name} 이 갈렸다`);
    }
});

test("다른 시드는 세부만 다르고 국면은 같다", () => {
    const a = new StockEngine(1); const b = new StockEngine(2);
    // 국면은 챕터가 정하므로 시드와 무관하다 — 기억이 쓸모 있으려면 그래야 한다.
    assert.deepEqual(
        CHAPTERS.map(c => regimeTimeline(c).map(s => s.kind)),
        CHAPTERS.map(c => regimeTimeline(c).map(s => s.kind)),
    );
    playAll(a); playAll(b);
    const id = UNIVERSE[0]!.id;
    assert.notDeepEqual(a.stockOf(id)!.history, b.stockOf(id)!.history, "세부는 달라야 한다");
});

/* ── 보수 — 빚이 줄어드는 단 하나의 자리 ─────────────────────── */

test("손해를 본 챕터에는 보수가 없다", () => {
    assert.equal(advisoryFee(0, 100), 0);
    assert.equal(advisoryFee(-1_000_000, 100), 0);
});

test("빚은 갚을 수 있어야 한다 — 완납이 도달 가능한가", () => {
    // **이 게임에서 이기는 방법은 빚 완납 하나뿐인데, 한동안 그것이 도달 불가능했다.**
    // 눈으로는 안 보이는 종류의 고장이라 여기 셈으로 박아 둔다.
    //
    // ── 무엇이 바뀌었나 ─────────────────────────────────────
    // 예전 이 셈은 「2,500만을 들고 시작해서 장마다 배로 불린다」를 가정했다. 이제
    // 계좌는 0 에서 열리고 **고객이 맡겨야** 커지므로, 운용 규모는 `SEED_CASH` 가
    // 아니라 `entrustAmount` 와 에너지가 정한다. 그리고 보수는 빚에서 자동으로
    // 깎이지 않고 지갑을 거친다 — 그 두 가지를 이 셈이 따라가야 한다.
    //
    // ── 왜 2000년을 빼고 세는가 ─────────────────────────────
    // 마지막 장은 국면이 처음부터 끝까지 하락이라(`chapters.ts`) 수익이 안 나고,
    // 수익이 없으면 보수도 0 이다. 즉 **마지막 장에 기대면 안 된다** — 빚은 그 전에
    // 끝나 있어야 하고, 2000년은 갚는 장이 아니라 지키는 장이다.
    const prologue = CHAPTERS.find(c => c.debtOnEnd);
    assert.ok(prologue?.debtOnEnd, "프롤로그가 빚을 안 남긴다");

    let debt = prologue.debtOnEnd!;
    let wallet = 0;
    for (const ch of CHAPTERS) {
        if (ch.debtOnEnd) continue;      // 빚이 생기는 장은 갚는 장이 아니다
        if (ch === CHAPTERS[CHAPTERS.length - 1]) break;   // 2000 — 하락장

        // 아주 잘 굴린 장: 에너지가 가득 찬 채로 열두 턴 중 여섯 턴을 권하고,
        // 맡은 돈이 절반 늘었다. 맡는 사람은 평균 형편(purse 평균)으로 잡는다.
        //
        // **권한 여섯 번이 다 통하지는 않는다.** 설득은 주사위 판정이라
        // (`core/check.ts`), 근거를 대도 네 사람 평균 83% 만 통한다. 그 몫을 안 세면
        // 이 셈이 실제보다 후해져서, 밸런스가 무너져도 테스트가 안 걸린다.
        const purse = CLIENTS.reduce((a, c) => a + c.purse, 0) / CLIENTS.length;
        const pass = CLIENTS.reduce((a, c) => a + odds(needOf(c, true)), 0) / CLIENTS.length;
        const taken = entrustAmount({ ...CLIENTS[0]!, purse }, 100, true) * 6 * pass;
        const fee = advisoryFee(taken * 0.5, 100);

        // **이자가 붙기 전에 갚는다** — 장부 화면이 그러라고 말하는 자리다.
        const paid = Math.min(wallet, debt);
        debt -= paid; wallet -= paid;
        debt = Math.round(debt * (1 + ch.interest));
        wallet += fee;
    }
    // 마지막 장에 들어가기 전에 지갑으로 남은 빚을 덮을 수 있어야 한다.
    assert.ok(wallet >= debt,
        `완벽하게 굴려도 1999년 끝에 ${(debt - wallet).toLocaleString()}원이 모자란다 — `
        + "빚 완납이 도달 불가능하다. 맡기는 액수(ENTRUST_BASE)·이자·보수율 셋 중 하나를 고쳐야 한다.");
});

test("보수는 에너지에 비례한다 — 에너지가 곧 빚을 갚는 속도다", () => {
    const profit = 10_000_000;
    assert.equal(advisoryFee(profit, 0), Math.floor(profit * FEE_BASE));
    assert.equal(advisoryFee(profit, 100), Math.floor(profit * (FEE_BASE + FEE_BY_ENERGY)));
    // 사이는 단조 증가한다.
    let prev = -1;
    for (let t = 0; t <= 100; t += 10) {
        const f = advisoryFee(profit, t);
        assert.ok(f > prev, `에너지 ${t} 에서 보수가 안 늘었다`);
        prev = f;
    }
    // 범위를 벗어난 에너지도 상한·하한으로 잘린다.
    assert.equal(advisoryFee(profit, 999), advisoryFee(profit, 100));
    assert.equal(advisoryFee(profit, -5), advisoryFee(profit, 0));
});

test("챕터가 끝나면 보수는 지갑으로 가고, 남은 빚에 이자가 붙는다", () => {
    // **보수가 빚에서 자동으로 깎이던 규칙으로 되돌아가면 여기서 걸린다.**
    // 갚는 것은 이제 `repayDebt` 를 눌러야 일어난다.
    const e = new StockEngine(4242, SEED_CASH);
    const ch = e.chapter;
    e.player.debt = 50_000_000;
    // **이익이 나 있어야 보수가 0 이 아니다.** 프롤로그는 하락장이라 그냥 두면 보수가
    // 0 이고, 그러면 「지갑으로 갔나 빚으로 갔나」를 가리는 이 판정이 통째로 헛돈다.
    e.player.cash += 10_000_000;
    assert.ok(e.equity > e.chapterStart);

    const before = e.player.debt;
    const beforeWallet = e.player.wallet;
    const sum = e.endChapter([]);

    assert.ok(sum.fee > 0, "보수가 0 이면 이 판정은 아무것도 안 지킨다");
    assert.equal(e.player.debt, Math.round(before * (1 + ch.interest)) + (ch.debtOnEnd ?? 0),
        "보수가 빚을 깎았다 — 갚는 것은 `repayDebt` 하나뿐이어야 한다");
    assert.equal(e.player.wallet, beforeWallet + sum.fee, "보수가 지갑에 안 들어왔다");
});

test("갚는 것은 지갑에 있는 것까지, 남은 빚까지 — 마이너스는 없다", () => {
    const e = new StockEngine(99, SEED_CASH);
    e.player.debt = 1_000_000;
    e.player.wallet = 5_000_000;

    const r = e.repayDebt(99_000_000);
    assert.equal(r.paid, 1_000_000, "빚보다 더 갚을 수는 없다");
    assert.equal(e.player.debt, 0, "빚이 음수가 됐다");
    assert.equal(e.player.wallet, 4_000_000, "거스름돈이 안 돌아왔다");

    // 지갑이 빌 때까지만.
    e.player.debt = 99_000_000;
    const r2 = e.repayDebt(99_000_000);
    assert.equal(r2.paid, 4_000_000);
    assert.equal(e.player.wallet, 0, "지갑이 음수가 됐다");
});
