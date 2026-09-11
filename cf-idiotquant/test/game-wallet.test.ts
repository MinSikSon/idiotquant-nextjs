// 지갑 — **내 돈이 도는 길이 화면이 말하는 대로인가.**
//
// 이 파일이 지키는 것은 셋이다.
//
//   1. 지갑은 음수가 안 된다. 모자란 것은 빚이 되지 지갑이 마이너스가 되지 않는다.
//   2. 갚는 것은 `repay` 하나를 지난다 — 지갑에 있는 것까지, 남은 빚까지.
//   3. 알바와 생활비의 **비율**이 「알바에 갇히는」 판을 안 만든다.
//
// 셋째가 이 파일에서 제일 중요하다. 일당이 생활비의 두 배쯤이던 동안에는 번 돈이
// 그날 생활비로 거의 다 나가 **다음 턴에 또 팔아야 했고**, 에너지가 말라 넉 턴 만에
// 소진으로 끝났다. 눈으로는 안 보이고 300판을 굴려야 보이는 종류의 고장이라 여기 박는다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    LIVING_COST, PARTTIME_ENERGY, PARTTIME_PAY, SHORTFALL_DEBT, WALLET_START,
    payLiving, repay, repayable, turnsAfloat,
} from "@/lib/game/core/wallet";
import { RESEARCH_COST } from "@/lib/game/core/research";
import { StockEngine, ENERGY_START } from "@/lib/game/core/StockEngine";
import { BLIND_ENTRUST, CLIENTS, entrustAmount } from "@/lib/game/core/clients";

/* ── 생활비 ─────────────────────────────────────────────────── */

test("생활비는 지갑에서 나가고, 지갑은 음수가 되지 않는다", () => {
    const r = payLiving(100_000, 0);
    assert.equal(r.paid, LIVING_COST);
    assert.equal(r.wallet, 100_000 - LIVING_COST);
    assert.equal(r.debt, 0);
    assert.equal(r.short, false);
});

test("못 내면 모자란 만큼이 아니라 급전이 통째로 빚에 얹힌다", () => {
    const r = payLiving(0, 1_000_000);
    assert.equal(r.wallet, 0, "지갑이 음수가 됐다");
    assert.equal(r.debt, 1_000_000 + SHORTFALL_DEBT);
    assert.ok(r.short);

    // 일부만 있어도 마찬가지다 — 있는 것은 내고, 못 낸 사실은 사실이다.
    const half = payLiving(Math.floor(LIVING_COST / 2), 0);
    assert.equal(half.wallet, 0);
    assert.ok(half.short);
    assert.equal(half.debt, SHORTFALL_DEBT);
});

test("몇 턴치인가는 생활비로 나눈 몫이다", () => {
    assert.equal(turnsAfloat(LIVING_COST * 4), 4);
    assert.equal(turnsAfloat(LIVING_COST - 1), 0);
    assert.equal(turnsAfloat(0), 0);
});

/* ── 갚는다 ─────────────────────────────────────────────────── */

test("지갑에 있는 것까지, 남은 빚까지 — 거스름돈도 마이너스도 없다", () => {
    assert.deepEqual(repay(5_000_000, 1_000_000, 9_000_000),
        { wallet: 4_000_000, debt: 0, paid: 1_000_000 });
    assert.deepEqual(repay(1_000_000, 5_000_000, 9_000_000),
        { wallet: 0, debt: 4_000_000, paid: 1_000_000 });
    assert.equal(repay(1_000_000, 5_000_000, -5).paid, 0, "음수를 갚을 수는 없다");
    assert.equal(repay(0, 5_000_000, 100).paid, 0);
});

test("repayable 은 버튼이 적을 값이고, repay 가 실제로 내는 값과 같다", () => {
    for (const [w, d] of [[0, 0], [5_000_000, 0], [0, 5_000_000], [3_000_000, 7_000_000],
                          [7_000_000, 3_000_000]] as const) {
        assert.equal(repayable(w, d), repay(w, d, w).paid, `지갑 ${w} 빚 ${d} 에서 어긋났다`);
    }
});

/* ── 맡기는 돈 ──────────────────────────────────────────────── */

test("에너지가 높을수록 더 맡긴다 — 에너지가 곧 운용 규모다", () => {
    const c = CLIENTS[0]!;
    let prev = -1;
    for (let e = 0; e <= 100; e += 10) {
        const got = entrustAmount(c, e, true);
        assert.ok(got > prev, `에너지 ${e} 에서 맡기는 돈이 안 늘었다`);
        prev = got;
    }
    // 범위 밖은 가둔다.
    assert.equal(entrustAmount(c, 999, true), entrustAmount(c, 100, true));
    assert.equal(entrustAmount(c, -5, true), entrustAmount(c, 0, true));
});

test("근거 없이 권하면 받아 주더라도 훨씬 적게 맡긴다", () => {
    for (const c of CLIENTS) {
        const withThesis = entrustAmount(c, 60, true);
        const blind = entrustAmount(c, 60, false);
        assert.ok(blind < withThesis, `${c.name} 이 근거 없이도 같은 돈을 맡긴다`);
        assert.equal(blind, Math.floor(withThesis * BLIND_ENTRUST));
    }
});

test("형편(purse)과 반응(gain/loss)은 다른 값이다 — 김 부장과 어머니가 그 증거다", () => {
    const kim = CLIENTS.find(c => c.id === "kim")!;
    const mother = CLIENTS.find(c => c.id === "mother")!;
    // 잘 안 믿지만 퇴직금을 쥐고 있다 / 무조건 받아 주지만 내놓을 돈이 적다.
    assert.ok(kim.needBlind > mother.needBlind, "김 부장이 더 안 믿는다");
    assert.ok(entrustAmount(kim, 60, true) > entrustAmount(mother, 60, true));
});

/* ── 알바 — 갇히지 않는 비율인가 ────────────────────────────── */

test("일당은 생활비 여러 턴치여야 한다 — 아니면 알바에 갇힌다", () => {
    // 한 번 팔아서 그날 생활비만 겨우 내면 다음 턴에 또 팔아야 하고, 그러면
    // 에너지가 알바로만 빠져 근거를 만들 자리가 없다.
    const funded = Math.floor(PARTTIME_PAY / LIVING_COST);
    assert.ok(funded >= 3,
        `일당이 생활비 ${funded}턴치뿐이다 — 알바가 알바를 부른다`);
});

test("알바는 알아보기보다 비싸다 — 하루를 통째로 파는 일이다", () => {
    assert.ok(PARTTIME_ENERGY > RESEARCH_COST);
});

test("12턴을 알바로만 버텨도 에너지가 남지는 않는다", () => {
    // **버티기만 하는 전략이 공짜면 안 된다.** 한 챕터를 알바로만 지나면
    // 소진(에너지 0)에 닿아야 한다 — 그래야 영업할 이유가 생긴다.
    const e = new StockEngine(7);
    e.player.energy = ENERGY_START;
    for (let t = 0; t < 12; t++) {
        e.workShift();
        e.payLivingCost();
        e.player.energy = Math.max(0, e.player.energy - 2);   // 자연 감소
    }
    assert.equal(e.player.energy, 0, "알바만으로 한 챕터를 멀쩡히 난다");
});

test("알바로 번 돈은 빚 앞에서 푼돈이다", () => {
    // 전 구간(프롤로그 4 + 12×3 = 40턴)을 알바만 해도 3,000만에 한참 못 미친다.
    const net = (PARTTIME_PAY - LIVING_COST) * 40;
    assert.ok(net < 3_000_000,
        `알바만으로 ${net.toLocaleString()}원이 모인다 — 빚을 갚는 길이 둘이 되면 안 된다`);
});

/* ── 엔진에 물린 자리 ───────────────────────────────────────── */

test("1998 은 지갑 0 · 계좌 0 으로 열린다", () => {
    const e = new StockEngine(3);
    e.endChapter();
    e.startNextChapter();
    assert.equal(e.player.wallet, WALLET_START);
    assert.equal(e.equity, 0);
});

test("맡은 돈은 챕터 시작 기준도 같이 올린다 — 받기만 해도 보수가 나오면 안 된다", () => {
    // **이 판정이 없으면 아무것도 안 하고 맡기만 해도 보수가 나온다.**
    const e = new StockEngine(3);
    e.endChapter();
    e.startNextChapter();
    const before = e.chapterStart;
    e.entrust(10_000_000);
    assert.equal(e.chapterStart, before + 10_000_000);
    assert.equal(e.equity - e.chapterStart, 0, "맡은 것이 「내가 불린 것」으로 세어졌다");
});

test("무르면 맡긴 돈도 같이 돌아간다", () => {
    const e = new StockEngine(3);
    e.endChapter();
    e.startNextChapter();
    const mark = e.markTrades();
    e.entrust(10_000_000);
    e.buyHalf(e.listed[0]!.id);
    e.restoreTrades(mark);
    assert.equal(e.player.cash, 0);
    assert.equal(e.chapterStart, mark.chapterStart, "챕터 시작 기준이 안 돌아왔다");
});
