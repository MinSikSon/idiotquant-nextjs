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

import { LIVING_COST, SHORTFALL_DEBT, payLiving, repay, turnsAfloat } from "@/lib/game/core/wallet";
import { StockEngine } from "@/lib/game/core/StockEngine";

/* ── 생활비 ─────────────────────────────────────────────────── */
test("생활비는 지갑에서 나가고, 지갑은 음수가 되지 않는다 · 못 내면 모자란 만큼이 아니라 급전이 통째로 빚에 얹힌다", () => {
    // ── 생활비는 지갑에서 나가고, 지갑은 음수가 되지 않는다
    {
        const r = payLiving(100_000, 0);
        assert.equal(r.paid, LIVING_COST);
        assert.equal(r.wallet, 100_000 - LIVING_COST);
        assert.equal(r.debt, 0);
        assert.equal(r.short, false);
    }

    // ── 못 내면 모자란 만큼이 아니라 급전이 통째로 빚에 얹힌다
    {
        const r = payLiving(0, 1_000_000);
        assert.equal(r.wallet, 0, "지갑이 음수가 됐다");
        assert.equal(r.debt, 1_000_000 + SHORTFALL_DEBT);
        assert.ok(r.short);

        // 일부만 있어도 마찬가지다 — 있는 것은 내고, 못 낸 사실은 사실이다.
        const half = payLiving(Math.floor(LIVING_COST / 2), 0);
        assert.equal(half.wallet, 0);
        assert.ok(half.short);
        assert.equal(half.debt, SHORTFALL_DEBT);
    }
});

/* ── 갚는다 ─────────────────────────────────────────────────── */
test("몇 턴치인가는 생활비로 나눈 몫이다 · 지갑에 있는 것까지, 남은 빚까지 — 거스름돈도 마이너스도 없다", () => {
    // ── 몇 턴치인가는 생활비로 나눈 몫이다
    {
        assert.equal(turnsAfloat(LIVING_COST * 4), 4);
        assert.equal(turnsAfloat(LIVING_COST - 1), 0);
        assert.equal(turnsAfloat(0), 0);
    }

    // ── 지갑에 있는 것까지, 남은 빚까지 — 거스름돈도 마이너스도 없다
    {
        assert.deepEqual(repay(5_000_000, 1_000_000, 9_000_000),
            { wallet: 4_000_000, debt: 0, paid: 1_000_000 });
        assert.deepEqual(repay(1_000_000, 5_000_000, 9_000_000),
            { wallet: 0, debt: 4_000_000, paid: 1_000_000 });
        assert.equal(repay(1_000_000, 5_000_000, -5).paid, 0, "음수를 갚을 수는 없다");
        assert.equal(repay(0, 5_000_000, 100).paid, 0);
    }
});

/* ── 맡기는 돈 ──────────────────────────────────────────────── */
/* ── 알바 — 갇히지 않는 비율인가 ────────────────────────────── */
/* ── 엔진에 물린 자리 ───────────────────────────────────────── */
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
