// 장부 — **화면이 말하는 값과 실제로 일어나는 일이 같은가.**
//
// 이 파일이 지키는 것은 하나다: `ledgerOf` 의 「챕터가 지금 끝나면」과
// `StockEngine.endChapter` 가 **실제로** 하는 일이 어긋나지 않는 것.
//
// 어긋나면 이 화면을 만든 이유가 통째로 무너진다. 장부는 「보수 163만을 받아 빚이
// 2,837만이 된다」고 적어 놓고 결산은 다른 숫자를 내놓는 꼴이 되는데, 그러면 사람은
// 둘 중 어느 것도 안 믿게 된다.
//
// `ledgerOf` 는 Phaser 를 안 부르는 순수 함수라 브라우저 없이 돈다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ledgerOf, type LedgerInput } from "@/lib/game/core/ledger";
import { FEE_BASE, FEE_BY_ENERGY, advisoryFee, feeRate } from "@/lib/game/core/energy";
import { StockEngine } from "@/lib/game/core/StockEngine";

const base: LedgerInput = {
    startEquity: 25_000_000,
    equity: 28_000_000,
    cash: 4_000_000,
    peakEquity: 28_000_000,
    energy: 50,
    debt: 30_000_000,
    interest: 0.15,
    debtOnEnd: 0,
    feePaid: 0,
    wallet: 1_200_000,
    livingCost: 300_000,
    repaid: 0,
};

const at = (over: Partial<LedgerInput>): LedgerInput => ({ ...base, ...over });

/* ── 보수율은 한 군데서만 나온다 ─────────────────────────────── */
test("feeRate 는 에너지 0 에서 밑값, 100 에서 밑값+비례분 · advisoryFee 는 feeRate 를 쓴다 — 같은 식이 두 벌이 아니다", () => {
    // ── feeRate 는 에너지 0 에서 밑값, 100 에서 밑값+비례분
    {
        assert.equal(feeRate(0), FEE_BASE);
        assert.equal(feeRate(100), FEE_BASE + FEE_BY_ENERGY);
        assert.equal(feeRate(50), FEE_BASE + FEE_BY_ENERGY * 0.5);
        // 범위 밖은 가둔다 — 화면이 120% 짜리 보수율을 적는 일이 없게.
        assert.equal(feeRate(-10), FEE_BASE);
        assert.equal(feeRate(999), FEE_BASE + FEE_BY_ENERGY);
    }

    // ── advisoryFee 는 feeRate 를 쓴다 — 같은 식이 두 벌이 아니다
    {
        for (const energy of [0, 17, 38, 50, 83, 100]) {
            assert.equal(advisoryFee(3_000_000, energy),
                Math.floor(3_000_000 * feeRate(energy)));
        }
    }
});

/* ── 맡은 돈 ─────────────────────────────────────────────────── */
/* ── 얻은 돈 ─────────────────────────────────────────────────── */
/* ── 지갑 ───────────────────────────────────────────────────── */
/* ── 갚을 돈 — 순서가 `endChapter` 와 같아야 한다 ──────────────── */
test("갚을 수 있는 최대는 지갑과 빚 중 작은 쪽이다 · 이자는 지금 남아 있는 빚에 붙는다 — 미리 갚은 만큼 덜 붙는다", () => {
    // ── 갚을 수 있는 최대는 지갑과 빚 중 작은 쪽이다
    {
        assert.equal(ledgerOf(at({ wallet: 5_000_000, debt: 1_000_000 })).held.canRepay, 1_000_000);
        assert.equal(ledgerOf(at({ wallet: 1_000_000, debt: 5_000_000 })).held.canRepay, 1_000_000);
        assert.equal(ledgerOf(at({ wallet: 0, debt: 5_000_000 })).held.canRepay, 0);
        assert.equal(ledgerOf(at({ wallet: 5_000_000, debt: 0 })).held.canRepay, 0);
    }

    // ── 이자는 지금 남아 있는 빚에 붙는다 — 미리 갚은 만큼 덜 붙는다
    {
        const full = ledgerOf(at({ debt: 30_000_000 }));
        const half = ledgerOf(at({ debt: 15_000_000 }));
        assert.equal(full.owed.interest, Math.round(30_000_000 * 1.15) - 30_000_000);
        assert.ok(half.owed.interest < full.owed.interest,
            "먼저 갚아 두면 붙는 이자가 줄어야 한다 — 상환을 손에 쥐여 준 이유다");
    }
});

/* ── 결산과 장부가 같은 값을 말한다 ───────────────────────────── */
test("장부의 「챕터 끝에」는 endChapter 가 실제로 내는 빚과 같다 · 실제 엔진에 물려도 같다 — 손으로 옮겨 적은 셈이 아니라는 확인", () => {
    // ── 장부의 「챕터 끝에」는 endChapter 가 실제로 내는 빚과 같다
    {
        // `StockEngine.endChapter` 의 세 줄을 그대로 옮겨 견준다.
        // 이 셋의 **순서**가 어긋나면 여기서 걸린다.
        const cases: Array<Partial<LedgerInput>> = [
            {},
            { energy: 0 },
            { energy: 100 },
            { equity: 20_000_000 },
            { debt: 0, debtOnEnd: 30_000_000 },
            { debt: 1_000, equity: 90_000_000 },
            { interest: 0 },
            { interest: 0.2, debtOnEnd: 5_000_000 },
        ];
        for (const over of cases) {
            const i = at(over);
            const l = ledgerOf(i);

            const fee = advisoryFee(i.equity - i.startEquity, i.energy);
            // **보수는 여기 안 들어간다.** 지갑으로 가고, 갚는 것은 따로 눌러야 한다.
            let debt = Math.round(i.debt * (1 + i.interest));
            debt += i.debtOnEnd;

            assert.equal(l.owed.end, debt, `${JSON.stringify(over)} 에서 어긋났다`);
            assert.equal(l.earned.fee, fee);
        }
    }

    // ── 실제 엔진에 물려도 같다 — 손으로 옮겨 적은 셈이 아니라는 확인
    {
        // 위 테스트는 `endChapter` 의 세 줄을 **옮겨 적어** 견준다. 옮겨 적은 것이 틀리면
        // 둘 다 같이 틀리므로, 여기서는 진짜 엔진을 돌려 실제로 나온 값과 맞춰 본다.
        for (const seed of [1, 7, 42, 1234, 98765]) {
            const e = new StockEngine(seed);
            // 몇 턴 굴려서 자산이 시작값과 달라지게 한다.
            for (let i = 0; i < 3; i++) {
                e.buyHalf(e.focusStock.id);
                e.advanceTurn();
            }
            const before = ledgerOf({
                startEquity: e.chapterStart,
                equity: e.equity,
                cash: e.player.cash,
                peakEquity: e.peakEquity,
                energy: e.player.energy,
                debt: e.player.debt,
                interest: e.chapter.interest,
                debtOnEnd: e.chapter.debtOnEnd ?? 0,
                feePaid: 0,
                wallet: e.player.wallet,
                livingCost: 300_000,
                repaid: 0,
            });

            const sum = e.endChapter();

            assert.equal(before.earned.fee, sum.fee, `시드 ${seed}: 보수가 어긋났다`);
            assert.equal(before.owed.end, sum.debt, `시드 ${seed}: 챕터 끝 빚이 어긋났다`);
            assert.equal(before.entrusted.now, sum.finalEquity);
            assert.equal(before.entrusted.start, sum.startEquity);

            // **프롤로그만으로는 부족하다.** 1997 은 빚이 0 으로 시작하므로 「보수로 깎고
            // 이자」의 순서가 뒤집혀도 값이 같다. 빚 3천만을 안고 1998 로 넘어간 뒤에 다시 본다.
            e.startNextChapter();
            assert.ok(e.player.debt > 0, "1998 은 빚을 안고 시작한다");
            // **보수가 0 이면 순서가 뒤집혀도 값이 같다.** 하락장에서 그냥 사면 거의 늘
            // 그렇게 되므로, 여기서는 이익이 났다고 못박고 본다.
            e.player.cash += 10_000_000;
            for (let i = 0; i < 3; i++) e.advanceTurn();
            assert.ok(e.equity > e.chapterStart, "이익이 나 있어야 보수가 0 이 아니다");
            const mid = ledgerOf({
                startEquity: e.chapterStart,
                equity: e.equity,
                cash: e.player.cash,
                peakEquity: e.peakEquity,
                energy: e.player.energy,
                debt: e.player.debt,
                interest: e.chapter.interest,
                debtOnEnd: e.chapter.debtOnEnd ?? 0,
                feePaid: 0,
                wallet: e.player.wallet,
                livingCost: 300_000,
                repaid: 0,
            });
            const sum2 = e.endChapter();
            assert.equal(mid.earned.fee, sum2.fee, `시드 ${seed}: 1998 보수가 어긋났다`);
            assert.equal(mid.owed.end, sum2.debt, `시드 ${seed}: 1998 챕터 끝 빚이 어긋났다`);
        }
    }
});

/* ── 막대 — 자를 하나로 두는 일 ──────────────────────────────── */
