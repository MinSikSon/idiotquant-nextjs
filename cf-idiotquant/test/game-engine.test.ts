// 코어 — 주가·체결·챕터·회귀.
//
// 이 파일이 존재할 수 있다는 것이 설계의 값이다. `core/` 가 Phaser 를 import 하지 않으므로
// 브라우저도 캔버스도 없이 규칙만 돌려 볼 수 있다.
//
// 값을 박제하지 않고 상수와 정의에서 식을 세워 견준다. 계수를 바꾸면 테스트도 같이
// 따라와야 "규칙이 바뀐 것" 이고, 식이 어긋나면 그때 깨진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { StockEngine, SEED_CASH } from "@/lib/game/core/StockEngine";
import { CHAPTERS, TOTAL_TURNS } from "@/lib/game/core/chapters";
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
/* ── 반기마다 하나씩 상장한다 ───────────────────────────────── */
/* ── 국면은 하나, 베타는 종목마다 ───────────────────────────── */
/* ── 프롤로그는 이길 수 없다 ────────────────────────────────── */
test("프롤로그에서 시장에 들어가면 잃는다 — 국면이 처음부터 끝까지 하락이다 · 1997 을 어떻게 보내든 1998 은 계좌 0 · 빚 3,000만으로 열린다", () => {
    // ── 프롤로그에서 시장에 들어가면 잃는다 — 국면이 처음부터 끝까지 하락이다
    {
        // 이제 **가만히 있으면 안 잃는다**(현금 그대로). 잃는 것은 들어갔을 때다 —
        // 그게 이 장의 교훈이고, 첫 네 턴이 그것을 가르친다.
        const policies: Array<{ name: string; run: (e: StockEngine) => void }> = [
            { name: "전부 사서 들고 있기", run: e => { for (const s of e.listed) e.buyAll(s.id); playChapter(e); } },
            { name: "방어를 들고 버티기", run: e => {
                for (const s of e.listed) e.buyAll(s.id);
                playChapter(e, buff({ downshieldRatio: 0.4 }));
            } },
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
                    `${p.name} · 시드 ${seed}: 하락장에 들어갔는데 ${start} → ${e.equity}`);
            }
        }
    }

    // ── 1997 을 어떻게 보내든 1998 은 계좌 0 · 빚 3,000만으로 열린다
    {
        // **「무엇을 해도 진다」가 이제 여기서 나온다.** 예전에는 물려받은 손실이 그
        // 일을 했는데, 그건 처음 켠 사람에게 설명 없는 빨간 숫자였다. 지금은 회사가
        // 없어지는 것이 낸다 — 1998 의 내레이션이 처음부터 말하던 그대로다.
        const policies: Array<(e: StockEngine) => void> = [
            e => playChapter(e),                                                  // 아무것도 안 한다
            e => { for (const s of e.listed) e.buyAll(s.id); playChapter(e); },   // 전부 산다
            e => { e.liquidateAll(); playChapter(e); },                           // 판다
        ];
        for (const run of policies) {
            for (let seed = 1; seed <= 10; seed++) {
                const e = new StockEngine(seed);
                run(e);
                e.endChapter();
                e.startNextChapter();
                assert.equal(e.equity, 0, `시드 ${seed}: 계좌가 안 비워졌다`);
                assert.equal(e.player.wallet, 0);
                assert.equal(e.player.debt, CHAPTERS[0]!.debtOnEnd);
            }
        }
    }
});

/* ── 체결 ───────────────────────────────────────────────────── */
/* ── 챕터를 넘는다 ──────────────────────────────────────────── */
test("남은 빚에는 챕터마다 이자가 붙는다 · 전 구간은 40턴이고 마지막 챕터에서 끝난다", () => {
    // ── 남은 빚에는 챕터마다 이자가 붙는다
    {
        const e = new StockEngine(23);
        playChapter(e); e.endChapter(); e.startNextChapter();   // 빚 3,000만
        const before = e.player.debt;
        playChapter(e);
        const sum = e.endChapter();
        assert.equal(sum.debt, Math.round(before * (1 + CHAPTERS[1]!.interest)));
    }

    // ── 전 구간은 40턴이고 마지막 챕터에서 끝난다
    {
        assert.equal(TOTAL_TURNS, 4 + 12 * 3);
        const e = new StockEngine(29);
        playAll(e);
        assert.ok(e.isFinalChapter);
        assert.equal(e.chapter.id, "2000");
    }
});

/* ── 끝나는 법 ─────────────────────────────────────────────── */
/* ── 같은 시드는 같은 판을 준다 ─────────────────────────────── */
/* ── 보수 — 빚이 줄어드는 단 하나의 자리 ─────────────────────── */
test("손해를 본 챕터에는 보수가 없다 · 빚은 갚을 수 있어야 한다 — 완납이 도달 가능한가", () => {
    // ── 손해를 본 챕터에는 보수가 없다
    {
        assert.equal(advisoryFee(0, 100), 0);
        assert.equal(advisoryFee(-1_000_000, 100), 0);
    }

    // ── 빚은 갚을 수 있어야 한다 — 완납이 도달 가능한가
    {
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
    }
});

test("보수는 에너지에 비례한다 — 에너지가 곧 빚을 갚는 속도다 · 챕터가 끝나면 보수는 지갑으로 가고, 남은 빚에 이자가 붙는다", () => {
    // ── 보수는 에너지에 비례한다 — 에너지가 곧 빚을 갚는 속도다
    {
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
    }

    // ── 챕터가 끝나면 보수는 지갑으로 가고, 남은 빚에 이자가 붙는다
    {
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
    }
});
