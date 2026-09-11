// 에너지 — **버티는 힘이자 게이지 하나뿐인 목숨.**
//
// 예전에 이 값의 이름은 「신뢰」였다. 맡긴 사람들의 인내를 재는 값이었고, 매 턴 저절로
// 줄고 0 이 되면 그 자리에서 판이 끝났다. 즉 **이미 생존 게이지였는데 이름만 그렇지
// 않았다.** 여기에 캐릭터의 기력을 따로 두면 화면에 막대가 둘이 되고, 둘 다 매 턴 줄고,
// 어느 쪽이 먼저 바닥나는지를 사람이 세어야 한다. 그래서 **하나로 합쳤다.**
//
// 지금 이 값 하나가 넷을 한다.
//
//   버틴다   매 턴 `ENERGY_DECAY` 만큼 줄고, 0 이면 판이 끝난다(`burnout`)
//   쓴다     종목을 알아볼 때 `RESEARCH_COST` 만큼 든다 — **행동이 곧 소모다**
//            (`core/research.ts`. 예전에는 카드를 내는 값이었다)
//   번다     근거를 대고 맞히면 오른다 (아래 4분면)
//   받는다   챕터 보수가 이 값에 비례한다 (`advisoryFee`)
//
// ── 왜 오르내리는가 — 결과 × 근거 ──────────────────────────────
//
//                  벌었다        잃었다
//   근거 있음      에너지 ↑↑      에너지 ↓      (설명할 수 있는 손실)
//   근거 없음      그대로        에너지 ↓↓↓
//
// **운으로 벌어도 에너지는 오르지 않는다.** 초보가 가장 배우기 어려운 것을 규칙 한 줄로
// 만든 자리다. 그리고 이 규칙은 회귀에까지 관철된다 — 다음 회차에 미래를 알고 미리 팔아
// 돈을 벌어도, 그건 **설명할 수 없는** 수익이라 「그대로」 칸에 떨어진다. 회귀자만 아는
// 미래는 김 부장에게 근거가 되지 못한다.

import type { Client } from "./clients";

/** 매 턴 저절로 줄어드는 양. 하루가 지나가는 것만으로 드는 값이다. */
export const ENERGY_DECAY = 2;

/**
 * **근거를 대서 설득에 성공한 것 자체가 주는 값.** 결과가 나오기 전에 바로 붙는다.
 *
 * ── 왜 이것이 생겼나 ───────────────────────────────────────
 * 설득이 주사위 판정이 되면서(`core/check.ts`) 근거를 대고도 거절당하는 턴이
 * 생겼다. 그 턴은 알아보는 데 3 을 쓰고 자연 감소로 2 를 잃고 **아무것도 못 얻는다.**
 * 규칙만 400판씩 굴려 보니 소진으로 끝나는 판이 7% 에서 39% 로 뛰었다.
 *
 * 그래서 **설득에 성공한 순간**에 값을 준다. 4분면(결과 × 근거)은 그대로 살아 있고,
 * 이것은 그 앞에 붙는 별개의 값이다 — 앞에 앉은 사람을 실제로 설득해 냈다는 사실
 * 자체가 이 사람이 다시 그 자리에 설 수 있게 만드는 것이다.
 *
 * **근거가 없으면 안 붙는다.** 운으로 설득한 것은 실력이 아니라는 규칙이 여기에도
 * 그대로 걸린다.
 */
export const ENERGY_PERSUADED = 2;

/** 4분면의 기본 폭. 고객의 계수가 여기에 곱해진다. */
export const ENERGY_GAIN_WITH_THESIS = 8;
export const ENERGY_LOSS_WITH_THESIS = 4;
export const ENERGY_LOSS_BLIND = 15;

export interface Settlement {
    /** 근거를 대고 권했는가. */
    hadThesis: boolean;
    /** 벌었는가(실현 손익 기준, 0 은 못 번 것으로 친다). */
    gained: boolean;
    client: Client;
}

/**
 * 이 정산이 에너지를 얼마나 움직이는가. **자연 감소도 알아보는 값도 여기 안 들어간다** —
 * 그 둘은 권했든 안 했든 일어나는 일이라 `decay()` 와 `RESEARCH_COST` 로 따로 뗀다.
 */
export function energyDelta(s: Settlement): number {
    if (s.hadThesis) {
        return s.gained
            ? Math.round(ENERGY_GAIN_WITH_THESIS * s.client.gain)
            : -Math.round(ENERGY_LOSS_WITH_THESIS * s.client.loss);
    }
    // 근거 없이 벌었다 — 아무 일도 안 일어난다. 이 칸이 이 게임의 논지다.
    return s.gained ? 0 : -Math.round(ENERGY_LOSS_BLIND * s.client.loss);
}

/** 왜 움직였는지 화면이 말할 수 있게. */
export function energyReason(s: Settlement): string {
    if (s.hadThesis) return s.gained ? "설명할 수 있는 수익" : "설명할 수 있는 손실";
    return s.gained ? "운으로 번 것은 실력이 아니다" : "도박이었다";
}

/** 0~100 안에 가둔다. */
export function clampEnergy(v: number, max = 100): number {
    return Math.max(0, Math.min(max, Math.round(v)));
}

/** 한 턴이 지났다. */
export function decay(energy: number): number {
    return clampEnergy(energy - ENERGY_DECAY);
}

/* ── 보수 ─────────────────────────────────────────────────── */

/**
 * 한 챕터가 끝나고 받는 보수. **이것만이 빚을 줄인다.**
 *
 * 여기 없던 규칙이다. 그래서 `endChapter` 는 이자를 곱하고 `debtOnEnd` 를 더하기만 했고,
 * **빚을 줄이는 코드가 게임 어디에도 없었다.** `endReasonOf` 의 `debtCleared` 는 도달할 수
 * 없었고, 그래서 「빚을 다 갚으면 루프가 끝난다」는 규칙이 말로만 있었다. 판은 언제나
 * 자본잠식·소진·빚 남음 셋 중 하나로 끝났고, 끝없이 회귀했다.
 *
 * ── 왜 에너지에 비례하나 ───────────────────────────────────
 * 맡은 돈은 고객 것이다. 그 돈으로 내 빚을 갚을 수는 없다. 갚는 것은 **내가 받은 보수**이고,
 * 보수는 내가 그 자리에 서 있을 수 있었느냐에 달렸다. 기력이 남은 사람이 설명을 하고,
 * 설명을 한 사람이 보수를 받는다. 그래서 이 게임에서 에너지는 목숨이면서 동시에
 * **빚을 갚는 속도**다 — 근거를 대고 벌어야 루프를 벗어난다는 논지가 여기서 닫힌다.
 *
 * 손해를 본 챕터에는 보수가 없다. 마이너스 보수를 받지는 않는다.
 *
 * @param profit 이번 챕터에서 늘어난 자산. 0 이하면 보수도 0.
 * @param energy 챕터가 끝났을 때의 에너지(0~100).
 */
export function advisoryFee(profit: number, energy: number): number {
    if (profit <= 0) return 0;
    return Math.floor(profit * feeRate(energy));
}

/**
 * 지금 에너지면 늘린 것의 **몇 할이 내 몫인가.** 0~1.
 *
 * `advisoryFee` 안에 있던 식을 꺼낸 것이다. 장부 화면이 「보수율 47%」를 적어야 하는데,
 * 거기서 같은 식을 한 번 더 쓰면 규칙이 두 군데가 되고 어느 날 한쪽만 바뀐다.
 */
export function feeRate(energy: number): number {
    const t = Math.max(0, Math.min(ENERGY_MAX_FOR_FEE, energy)) / ENERGY_MAX_FOR_FEE;
    return FEE_BASE + FEE_BY_ENERGY * t;
}

/** 에너지가 0 이어도 받는 몫. 일은 했으니 아주 없지는 않다. */
export const FEE_BASE = 0.30;
/** 에너지가 가득 찼을 때 여기까지 더 붙는다. 최대 보수율은 둘의 합이다. */
export const FEE_BY_ENERGY = 0.45;
/** 보수율을 계산할 때 기준이 되는 에너지 상한. */
const ENERGY_MAX_FOR_FEE = 100;
