// 장부 — **돈이 세 갈래인데 화면은 둘만 보여 주고 있었다.**
//
// ── 이 게임의 돈은 하나가 아니다 ────────────────────────────────
// 「IMF」에서 화면에 뜨는 숫자는 두 개였다. 「주식 현황」 옆의 자산과 배너의 빚.
// 그런데 실제로 도는 돈은 **넷**이고, **넷의 주인이 각각 다르다.**
//
//   맡은 돈   고객 것이다. 내가 굴리지만 내 것이 된 적은 한 번도 없다. **0 에서 시작한다.**
//   얻은 돈   내 것이다. 맡은 돈이 **늘어난 만큼**에서 보수율을 곱해 떼어 온다.
//   지갑      내 것이다. 보수와 알바비가 여기 모이고, 생활비가 매 턴 여기서 빠진다.
//   갚을 돈   내 빚이다. **지갑에서만** 줄일 수 있고, 남은 것에 챕터 끝마다 이자가 붙는다.
//
// 그리고 이 넷을 잇는 화살표가 **화면에 한 번도 없었다.**
//
//     맡은 돈 ──늘어난 만큼──▶ 보수(에너지 비율) ──┐
//                                                  ├──▶ 【 지갑 】──내가 누를 때──▶ 상환
//     알바 ────────────────────────────────────────┘        └──매 턴──▶ 생활비
//
// 그래서 플레이 중에 「지금 347만을 벌어 놨는데 그게 빚을 얼마나 깎지?」 를 알 수가
// 없었다. 답은 챕터가 끝나야 나왔고, 그때는 이미 에너지를 올릴 턴이 지나 있었다.
// **에너지를 올려야 할 이유가 화면에서 사라져 있었다는 뜻이다.**
//
// ── 왜 화면이 아니라 여기인가 ───────────────────────────────────
// 보수율은 `energy.feeRate`, 상환과 이자의 순서는 `StockEngine.endChapter` 가 이미
// 정해 놓았다. 화면이 그 식을 한 번 더 적으면 규칙이 두 벌이 되고, 어느 날 한쪽만
// 바뀌어 **장부와 결산이 다른 값을 말한다.** 그래서 셈은 전부 여기서 하고 화면은
// 받은 것을 늘어놓기만 한다. Phaser 를 안 부르므로 브라우저 없이 테스트도 된다.

import { advisoryFee, feeRate } from "./energy";
import { repayable, turnsAfloat } from "./wallet";

export interface LedgerInput {
    /** 이번 챕터를 시작한 자산. */
    startEquity: number;
    /** 지금 맡은 돈 전체(현금 + 평가액). */
    equity: number;
    /** 그중 현금. */
    cash: number;
    /** 이 **판**에서 맡은 돈이 가장 컸을 때. */
    peakEquity: number;
    /** 지금 에너지. 보수율이 여기서 나온다. */
    energy: number;
    /** 지금 빚. */
    debt: number;
    /** 이번 챕터의 이자율(0.15 = 15%). */
    interest: number;
    /** 이 챕터가 끝날 때 새로 얹히는 빚. 프롤로그의 3천만이 그것이다. */
    debtOnEnd: number;
    /** 회차를 통틀어 여태 받은 보수의 합. */
    feePaid: number;
    /** 지금 지갑. 내 돈이다. */
    wallet: number;
    /** 한 턴 생활비. 지갑이 몇 턴치인지를 이 값으로 잰다. */
    livingCost: number;
    /** 회차를 통틀어 지갑에서 빚으로 실제로 넣은 돈. */
    repaid: number;
}

/** 고객 것 — 내가 굴리는 돈. */
export interface Entrusted {
    start: number;
    now: number;
    /** 이번 챕터에 늘린 것. 음수면 잃은 것이다. */
    delta: number;
    /** 그 비율(%). 시작이 0 이면 0. */
    pct: number;
    cash: number;
    /** 주식에 들어가 있는 것. */
    invested: number;
    /** 이 판에서 가장 컸을 때. */
    peak: number;
}

/** 내 것 — 보수. */
export interface Earned {
    /** 지금 에너지의 보수율(0~1). */
    rate: number;
    /** **지금 챕터가 끝나면** 받을 보수. 잃고 있으면 0. */
    fee: number;
    /** 여태 받은 합. */
    paid: number;
}

/** 내 것 — 지갑. 보수와 알바비가 모이고 생활비가 빠지는 자리. */
export interface Held {
    now: number;
    /** 한 턴 생활비. */
    cost: number;
    /** 지금 지갑으로 생활비를 몇 턴 더 낼 수 있는가. */
    turns: number;
    /** **챕터가 끝나 보수가 들어오면** 얼마가 되는가. */
    afterFee: number;
    /** 지금 당장 갚을 수 있는 최대. */
    canRepay: number;
}

/** 내 빚 — 갚을 것. */
export interface Owed {
    now: number;
    /** 깎고 남은 것에 붙는 이자. */
    interest: number;
    /** 챕터가 끝날 때 새로 얹히는 것. */
    added: number;
    /** 그래서 챕터가 끝나면 얼마인가. */
    end: number;
    /** 여태 갚은 합. */
    repaid: number;
}

export interface Ledger {
    entrusted: Entrusted;
    earned: Earned;
    held: Held;
    owed: Owed;
}

/**
 * 지금 이 순간의 장부. **「지금 챕터가 끝난다면」을 가정한 값이다** — 그래야 지금 무엇을
 * 할지가 바뀐다. 「끝나 봐야 아는 값」은 화면에 있을 이유가 없다.
 *
 * 빚 계산의 **순서가 `endChapter` 와 같아야 한다**: 지금 남아 있는 빚에 이자를 곱하고,
 * 그 다음에 `debtOnEnd` 를 더한다. **보수는 여기서 빚을 안 깎는다** — 지갑으로 들어가고,
 * 갚는 것은 내가 누를 때만 일어난다. 순서가 어긋나면 장부와 결산이 다른 값을 말하는데,
 * 그건 이 화면을 만든 이유를 통째로 무너뜨린다.
 *
 * 그래서 이 화면이 말해야 하는 것이 하나 늘었다 — **지금 갚으면 이자가 이만큼 줄어든다.**
 * 이자는 챕터 끝에 남은 빚에만 붙으므로, 갚는 시점이 곧 값어치다.
 */
export function ledgerOf(i: LedgerInput): Ledger {
    const delta = i.equity - i.startEquity;
    const fee = advisoryFee(delta, i.energy);

    const withInterest = Math.round(i.debt * (1 + i.interest));

    return {
        entrusted: {
            start: i.startEquity,
            now: i.equity,
            delta,
            pct: i.startEquity > 0 ? (delta / i.startEquity) * 100 : 0,
            cash: i.cash,
            invested: Math.max(0, i.equity - i.cash),
            // 지금이 최고일 수 있다 — 최고 기록은 턴이 넘어갈 때만 갱신되므로
            // 이번 턴에 오른 것은 아직 안 들어가 있다.
            peak: Math.max(i.peakEquity, i.equity),
        },
        earned: {
            rate: feeRate(i.energy),
            fee,
            paid: i.feePaid,
        },
        held: {
            now: i.wallet,
            cost: i.livingCost,
            turns: turnsAfloat(i.wallet, i.livingCost),
            afterFee: i.wallet + fee,
            canRepay: repayable(i.wallet, i.debt),
        },
        owed: {
            now: i.debt,
            interest: withInterest - i.debt,
            added: i.debtOnEnd,
            end: withInterest + i.debtOnEnd,
            repaid: i.repaid,
        },
    };
}
