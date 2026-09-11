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

import { barFrac, barScale, ledgerOf, type LedgerInput } from "@/lib/game/core/ledger";
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

test("feeRate 는 에너지 0 에서 밑값, 100 에서 밑값+비례분", () => {
    assert.equal(feeRate(0), FEE_BASE);
    assert.equal(feeRate(100), FEE_BASE + FEE_BY_ENERGY);
    assert.equal(feeRate(50), FEE_BASE + FEE_BY_ENERGY * 0.5);
    // 범위 밖은 가둔다 — 화면이 120% 짜리 보수율을 적는 일이 없게.
    assert.equal(feeRate(-10), FEE_BASE);
    assert.equal(feeRate(999), FEE_BASE + FEE_BY_ENERGY);
});

test("advisoryFee 는 feeRate 를 쓴다 — 같은 식이 두 벌이 아니다", () => {
    for (const energy of [0, 17, 38, 50, 83, 100]) {
        assert.equal(advisoryFee(3_000_000, energy),
            Math.floor(3_000_000 * feeRate(energy)));
    }
});

/* ── 맡은 돈 ─────────────────────────────────────────────────── */

test("이번 챕터에 늘린 것과 그 비율", () => {
    const l = ledgerOf(base);
    assert.equal(l.entrusted.delta, 3_000_000);
    assert.equal(Math.round(l.entrusted.pct * 10) / 10, 12);
});

test("현금과 주식은 합쳐서 맡은 돈이다", () => {
    const l = ledgerOf(base);
    assert.equal(l.entrusted.cash + l.entrusted.invested, l.entrusted.now);
});

test("최고 기록은 지금보다 작을 수 없다 — 이번 턴에 오른 것도 최고다", () => {
    // 최고 기록은 턴이 넘어갈 때만 갱신되므로(`advanceTurn`), 이번 턴에 오른 것은
    // 아직 안 들어가 있다. 그대로 적으면 「지금」이 「최고」보다 큰 장부가 된다.
    const l = ledgerOf(at({ peakEquity: 26_000_000, equity: 31_000_000 }));
    assert.equal(l.entrusted.peak, 31_000_000);
});

test("시작 자산이 0 이면 비율은 0 — 나눗셈이 터지지 않는다", () => {
    assert.equal(ledgerOf(at({ startEquity: 0, equity: 100 })).entrusted.pct, 0);
});

/* ── 얻은 돈 ─────────────────────────────────────────────────── */

test("못 늘린 챕터에는 보수가 없다", () => {
    const l = ledgerOf(at({ equity: 24_000_000 }));
    assert.equal(l.earned.fee, 0);
    assert.ok(l.entrusted.delta < 0);
});

test("같은 수익이라도 에너지가 높으면 보수가 크다 — 이 화면의 논지", () => {
    const low = ledgerOf(at({ energy: 20 })).earned.fee;
    const high = ledgerOf(at({ energy: 90 })).earned.fee;
    assert.ok(high > low, `에너지 90 의 보수 ${high} 가 20 의 ${low} 보다 커야 한다`);
});

/* ── 지갑 ───────────────────────────────────────────────────── */

test("보수는 지갑으로 들어온다 — 빚은 저절로 안 줄어든다", () => {
    // **이 판정이 「갚는 것은 내가 정한다」의 전부다.** 보수가 빚에서 자동으로 깎이던
    // 규칙으로 되돌아가면 여기서 걸린다.
    const l = ledgerOf(base);
    const fee = advisoryFee(3_000_000, 50);
    assert.equal(l.earned.fee, fee);
    assert.equal(l.held.afterFee, base.wallet + fee);
    assert.equal(l.owed.end, Math.round(30_000_000 * 1.15),
        "보수가 빚을 건드리면 안 된다");
});

test("지갑이 몇 턴치인지 — 생활비로 나눈 몫이다", () => {
    assert.equal(ledgerOf(at({ wallet: 1_200_000 })).held.turns, 4);
    assert.equal(ledgerOf(at({ wallet: 299_999 })).held.turns, 0);
    assert.equal(ledgerOf(at({ wallet: 0 })).held.turns, 0);
});

test("갚을 수 있는 최대는 지갑과 빚 중 작은 쪽이다", () => {
    assert.equal(ledgerOf(at({ wallet: 5_000_000, debt: 1_000_000 })).held.canRepay, 1_000_000);
    assert.equal(ledgerOf(at({ wallet: 1_000_000, debt: 5_000_000 })).held.canRepay, 1_000_000);
    assert.equal(ledgerOf(at({ wallet: 0, debt: 5_000_000 })).held.canRepay, 0);
    assert.equal(ledgerOf(at({ wallet: 5_000_000, debt: 0 })).held.canRepay, 0);
});

/* ── 갚을 돈 — 순서가 `endChapter` 와 같아야 한다 ──────────────── */

test("이자는 지금 남아 있는 빚에 붙는다 — 미리 갚은 만큼 덜 붙는다", () => {
    const full = ledgerOf(at({ debt: 30_000_000 }));
    const half = ledgerOf(at({ debt: 15_000_000 }));
    assert.equal(full.owed.interest, Math.round(30_000_000 * 1.15) - 30_000_000);
    assert.ok(half.owed.interest < full.owed.interest,
        "먼저 갚아 두면 붙는 이자가 줄어야 한다 — 상환을 손에 쥐여 준 이유다");
});

test("프롤로그의 새 빚은 이자 뒤에 얹힌다", () => {
    // `endChapter` 가 그 순서다 — 이자를 곱한 다음 `debtOnEnd` 를 더한다.
    // 뒤집으면 아직 지지도 않은 빚에 이자가 붙는다.
    const l = ledgerOf(at({ debt: 0, debtOnEnd: 30_000_000, interest: 0 }));
    assert.equal(l.owed.added, 30_000_000);
    assert.equal(l.owed.end, 30_000_000);
});

test("빚이 없으면 이자도 없다", () => {
    const l = ledgerOf(at({ debt: 0 }));
    assert.equal(l.owed.interest, 0);
    assert.equal(l.owed.end, 0);
});

/* ── 결산과 장부가 같은 값을 말한다 ───────────────────────────── */

test("장부의 「챕터 끝에」는 endChapter 가 실제로 내는 빚과 같다", () => {
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
});

test("실제 엔진에 물려도 같다 — 손으로 옮겨 적은 셈이 아니라는 확인", () => {
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
});

test("프롤로그를 지나면 계좌가 통째로 없어진다 — 1998 은 0 원으로 연다", () => {
    // 1998 의 내레이션이 처음부터 말하던 것이다(「맡긴 사람들은 그 돈을 잃었다」).
    // 이 판정이 깨지면 화면의 글과 규칙이 다시 어긋난다.
    const e = new StockEngine(11);
    for (let i = 0; i < 4; i++) e.advanceTurn();
    assert.ok(e.equity > 0, "프롤로그는 고객 돈을 굴리고 있다");
    e.endChapter();
    e.startNextChapter();
    assert.equal(e.player.cash, 0);
    assert.equal(Object.keys(e.player.positions).length, 0);
    assert.equal(e.equity, 0);
    assert.equal(e.player.wallet, 0, "지갑도 0 에서 시작한다");
    assert.ok(e.player.debt > 0, "없어진 것은 계좌지 빚이 아니다");
});

test("최고 자산은 그 뒤의 챕터를 넘어도 안 지워진다", () => {
    // 지워지는 것은 프롤로그 하나뿐이다 — 1998→1999 는 이어진다.
    const e = new StockEngine(11);
    e.endChapter();
    e.startNextChapter();          // 1998, 계좌 0
    e.entrust(20_000_000);
    for (let i = 0; i < 4; i++) e.advanceTurn();
    const peak = e.peakEquity;
    assert.ok(peak > 0);
    e.endChapter();
    e.startNextChapter();          // 1999
    assert.ok(e.peakEquity >= peak, "챕터를 넘겼다고 최고 기록이 줄어들면 안 된다");
});

/* ── 막대 — 자를 하나로 두는 일 ──────────────────────────────── */

test("자는 덩이에서 제일 큰 금액이고, 값이 다 0 이면 0 이다", () => {
    assert.equal(barScale([25_000_000, 28_000_000, 28_000_000]), 28_000_000);
    // 프롤로그의 「갚을 돈」이 이 상태다 — 빚도 이자도 0.
    assert.equal(barScale([0, 0]), 0);
    assert.equal(barScale([]), 0);
});

test("자가 0 이면 길이도 0 이다 — 나누지 않는다", () => {
    // 0 으로 나누면 NaN 이나 Infinity 가 나오고, 그게 `fillRect` 로 가면 막대가
    // 화면을 가로질러 그어지거나 아예 안 그려진다. 둘 다 조용히 틀린다.
    const f = barFrac(0, 0);
    assert.ok(Number.isFinite(f));
    assert.equal(f, 0);
});

test("길이는 0~1 에 가둔다", () => {
    assert.equal(barFrac(-5_000_000, 10_000_000), 0, "음수는 길이가 없다");
    assert.equal(barFrac(20_000_000, 10_000_000), 1, "자를 넘겨도 트랙 밖으로 안 나간다");
    assert.equal(barFrac(2_500_000, 10_000_000), 0.25);
});

test("갚을 돈의 막대 셋은 「챕터 끝에」로 합쳐진다", () => {
    // **이 덩이의 값어치가 여기 있다.** 「지금 · 이자 · 새로 지는 빚」을 이어 붙인
    // 길이가 「챕터 끝에」와 다르면, 세 줄을 더해 봐야 아는 것이 그대로 남는다 —
    // 막대를 넣은 이유가 통째로 없어진다.
    const { owed: ow } = ledgerOf(at({ debt: 20_000_000, interest: 0.15, debtOnEnd: 30_000_000 }));
    const scale = barScale([ow.end, ow.repaid]);
    const sum = barFrac(ow.now, scale) + barFrac(ow.interest, scale) + barFrac(ow.added, scale);
    assert.ok(Math.abs(sum - barFrac(ow.end, scale)) < 1e-9,
        `이어 붙인 길이 ${sum} 가 「챕터 끝에」 ${barFrac(ow.end, scale)} 와 다르다`);
    assert.equal(barFrac(ow.end, scale), 1, "제일 큰 값이 트랙을 꽉 채운다");
});

test("현금과 주식을 이어 붙이면 「지금」이 된다", () => {
    const { entrusted: en } = ledgerOf(at({ equity: 28_000_000, cash: 4_000_000 }));
    const scale = barScale([en.start, en.now, en.peak]);
    const sum = barFrac(en.cash, scale) + barFrac(en.invested, scale);
    assert.ok(Math.abs(sum - barFrac(en.now, scale)) < 1e-9);
});

test("한 자로 재면 지갑은 실오라기지만 0 은 아니다", () => {
    // 「한눈에」 덩이는 잔액 셋을 **한 자**에 올린다. 거기서 지갑은 빚의 1~2% 라
    // 아주 짧은데, **짧은 것과 없는 것은 다른 형편이다** — 길이가 0 으로 떨어지면
    // 「한 푼도 없다」와 구별이 안 된다. (화면은 여기에 최소 1px 을 더 얹는다.)
    const l = ledgerOf(at({ equity: 28_000_000, wallet: 440_000, debt: 30_000_000 }));
    const scale = barScale([l.entrusted.now, l.held.now, l.owed.now]);
    assert.equal(scale, 30_000_000, "제일 큰 것이 자가 된다");

    const wallet = barFrac(l.held.now, scale);
    assert.ok(wallet > 0, "돈이 있으면 길이도 있어야 한다");
    assert.ok(wallet < 0.02, "빚에 견주면 실오라기다 — 그게 이 판의 형편이다");

    // **셋이 같은 자를 쓴다**: 길이의 비가 곧 금액의 비여야 덩이끼리 견줄 수 있다.
    const entrusted = barFrac(l.entrusted.now, scale);
    assert.ok(Math.abs(entrusted / wallet - 28_000_000 / 440_000) < 1e-9);

    // 빈 지갑은 길이도 없다 — 위의 「실오라기」와 갈려야 한다.
    const broke = ledgerOf(at({ equity: 28_000_000, wallet: 0, debt: 30_000_000 }));
    assert.equal(barFrac(broke.held.now, scale), 0);
});
