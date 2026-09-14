// 상황카드·에너지·회귀.
//
// 이 셋은 서로 물려 있다. 상황카드는 겪은 장면이고, 겪은 장면은 회귀해도 남고,
// 그 장면 중 `info` 갈래는 근거가 되어 에너지를 움직인다. 그래서 한자리에서 본다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { DeckManager } from "@/lib/game/core/DeckManager";
import { CLIENTS, clientAt } from "@/lib/game/core/clients";
import { energyDelta, ENERGY_GAIN_WITH_THESIS, ENERGY_LOSS_WITH_THESIS, ENERGY_LOSS_BLIND } from "@/lib/game/core/energy";
import { verdictOf } from "@/lib/game/core/research";
import { StockEngine } from "@/lib/game/core/StockEngine";
import { recommendBlock, sellBlock } from "@/lib/game/core/orders";
import { EMPTY, regress, breaksLoop } from "@/lib/game/core/progress";
import type { ChapterSummary } from "@/lib/game/core/types";

const kim = CLIENTS.find(c => c.id === "kim")!;

/* ── 결과 × 근거 — 이 게임의 논지 ──────────────────────────── */
test("근거를 대고 벌면 에너지가 오른다 · 근거를 대고 잃으면 조금만 깎인다 — 설명할 수 있는 손실", () => {
    // ── 근거를 대고 벌면 에너지가 오른다
    {
        const d = energyDelta({ hadThesis: true, gained: true, client: kim });
        assert.equal(d, Math.round(ENERGY_GAIN_WITH_THESIS * kim.gain));
        assert.ok(d > 0);
    }

    // ── 근거를 대고 잃으면 조금만 깎인다 — 설명할 수 있는 손실
    {
        const d = energyDelta({ hadThesis: true, gained: false, client: kim });
        assert.equal(d, -Math.round(ENERGY_LOSS_WITH_THESIS * kim.loss));
        assert.ok(d < 0);
    }
});

test("근거 없이 벌면 **그대로다** — 운으로 번 것은 실력이 아니다 · 근거 없이 잃으면 가장 크게 깎인다", () => {
    // ── 근거 없이 벌면 **그대로다** — 운으로 번 것은 실력이 아니다
    {
        for (const c of CLIENTS) {
            assert.equal(energyDelta({ hadThesis: false, gained: true, client: c }), 0,
                `${c.name} 앞에서도 근거 없는 수익은 에너지를 안 올린다`);
        }
    }

    // ── 근거 없이 잃으면 가장 크게 깎인다
    {
        const blind = -energyDelta({ hadThesis: false, gained: false, client: kim });
        const withThesis = -energyDelta({ hadThesis: true, gained: false, client: kim });
        assert.equal(blind, Math.round(ENERGY_LOSS_BLIND * kim.loss));
        assert.ok(blind > withThesis * 2, "도박의 값은 설명할 수 있는 손실보다 훨씬 커야 한다");
    }
});

/* ── 고객 ───────────────────────────────────────────────────── */
test("어머니는 근거 없이 권해도 받고, 박 대리는 거의 거절한다 · 떠난 고객은 다시 안 나온다", () => {
    // ── 어머니는 근거 없이 권해도 받고, 박 대리는 거의 거절한다
    {
        const mother = CLIENTS.find(c => c.id === "mother")!;
        const park = CLIENTS.find(c => c.id === "park")!;
        // 근거 없이도 어머니는 받아 주고(5+), 박 대리는 사실상 거절한다(12).
        assert.equal(mother.needBlind, mother.need, "어머니는 근거로 안 움직인다");
        assert.ok(park.needBlind >= 12);
        // 무조건 받아 주는 사람이 잃을 때 제일 아프다.
        assert.ok(mother.loss > kim.loss);
    }

    // ── 떠난 고객은 다시 안 나온다
    {
        const gone = ["kim", "mother"];
        for (let t = 1; t <= 40; t++) {
            const c = clientAt(1, "1998", t, gone);
            assert.ok(c && !gone.includes(c.id), "떠난 사람이 다시 앉으면 안 된다");
        }
    }
});

/* ── 상황카드 — 조건과 진행도 ──────────────────────────────── */
/* ── 근거가 되는 것과 아닌 것 ──────────────────────────────── */
/* ── 덱 ────────────────────────────────────────────────────── */
/* ── 회귀 ──────────────────────────────────────────────────── */

test("루프를 끊는 것은 빚 완납 하나뿐이다 · 빚을 갚은 기록은 그 뒤 회차에도 남는다", () => {
    // ── 루프를 끊는 것은 빚 완납 하나뿐이다
    {
        assert.equal(breaksLoop("debtCleared"), true);
        for (const r of ["debtRemains", "burnout", "ruined"] as const) {
            assert.equal(breaksLoop(r), false, `${r} 는 1997 로 돌아가야 한다`);
        }
    }

    // ── 빚을 갚은 기록은 그 뒤 회차에도 남는다
    {
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
    }
});

/* ── 알아본 것이 무슨 말을 하는가 ───────────────────────────── */
test("판정은 국면에서 나온다 — 상승이면 지금, 하락이면 아니다 · 안 알아본 종목은 판정이 「모른다」다", () => {
    // ── 판정은 국면에서 나온다 — 상승이면 지금, 하락이면 아니다
    {
        const read = (regime: "bull" | "bear" | "chop" | null) => ({
            next: [], regime, regimeDrift: null, turnsLeft: null, nextRegime: null, nextDrift: null,
        });
        assert.equal(verdictOf(read("bull")), "buy");
        assert.equal(verdictOf(read("bear")), "avoid");
        assert.equal(verdictOf(read("chop")), "unclear");
    }

    // ── 안 알아본 종목은 판정이 「모른다」다
    {
        // **화면이 null 을 넘겨야 하는 자리다.** 국면은 시장에 하나뿐이라 아무 종목의 read 나
        // 넘기면 3 에너지로 아홉 종목이 다 열린다 — 실제로 그렇게 새고 있었다.
        assert.equal(verdictOf(null), "unknown");
        assert.equal(verdictOf(undefined), "unknown");
        assert.equal(verdictOf({
            next: [], regime: null, regimeDrift: null, turnsLeft: null,
            nextRegime: null, nextDrift: null,
        }), "unknown");
    }
});

/* ── 체결을 막는 것 · 무름 ──────────────────────────────────── */
test("한 턴에 체결은 한 번 — 팔고 나면 그 턴에는 못 권한다 · 파는 것도 한 턴에 한 번이고, 막히는 이유가 둘이다", () => {
    // ── 한 턴에 체결은 한 번 — 팔고 나면 그 턴에는 못 권한다
    {
        // **한때 여기가 정반대였다.** 팔아서 현금을 만든 다음 권하는 길이 열려 있었고,
        // 그러면 권해서 고객이 맡긴 돈으로 산 것을 그 자리에서 도로 파는 일도 됐다 —
        // 맡긴 돈은 현금으로 남고 그 턴의 권하기는 이미 써 버렸고 에너지 정산은 안 일어나는,
        // **어느 것도 무른 것이 아닌데 어느 것도 온전하지 않은** 자리였다.
        const invested = {
            hasClient: true, recommended: false, traded: false, incoming: 0,
            cash: 35_000, equity: 25_000_000, price: 12_000,
        };
        assert.equal(recommendBlock(invested), "fullyInvested");

        // 한 종목을 거둬 현금이 들어왔다. 돈은 생겼지만 **오늘의 체결은 이미 썼다.**
        const afterSell = { ...invested, cash: 9_000_000, traded: true };
        assert.equal(recommendBlock(afterSell), "soldToday", "팔고 난 턴에는 못 권한다");

        // 바꾸려면 무른다 — 무르면 `traded` 가 도로 false 가 되고, 판 것이 되돌아가므로
        // 현금도 원래대로다. 그래서 막힘은 「다 들어가 있다」로 돌아간다.
        assert.equal(recommendBlock(invested), "fullyInvested");
    }

    // ── 파는 것도 한 턴에 한 번이고, 막히는 이유가 둘이다
    {
        assert.equal(sellBlock({ shares: 100, traded: false }), "none");
        assert.equal(sellBlock({ shares: 0, traded: false }), "nothing");
        // 권해서 산 턴 — 주수는 있지만 오늘의 체결은 끝났다.
        assert.equal(sellBlock({ shares: 100, traded: true }), "tradedToday");
        // **체결을 먼저 본다.** 판 직후는 주수가 0 이면서 `traded` 인데, 여기서
        // 「가진 것이 없다」라고 적으면 방금 판 사실이 화면에서 사라진다.
        assert.equal(sellBlock({ shares: 0, traded: true }), "tradedToday",
            "판 직후에는 「오늘은 체결했다」라고 말해야 한다");
    }
});
