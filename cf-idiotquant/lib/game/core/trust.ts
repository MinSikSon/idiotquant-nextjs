// 신뢰가 어떻게 움직이는가. **이 게임의 논지가 여기 네 칸으로 들어 있다.**
//
// 정산은 결과가 아니라 **결과 × 근거**로 한다:
//
//                  벌었다        잃었다
//   근거 있음      신뢰 ↑↑       신뢰 ↓      (설명할 수 있는 손실)
//   근거 없음      그대로        신뢰 ↓↓↓
//
// **운으로 벌어도 신뢰는 오르지 않는다.** 초보가 가장 배우기 어려운 것을 규칙 한 줄로
// 만든 자리다. 그리고 이 규칙은 회귀에까지 관철된다 — 다음 회차에 미래를 알고 미리 팔아
// 돈을 벌어도, 그건 **설명할 수 없는** 수익이라 「그대로」 칸에 떨어진다. 회귀자만 아는
// 미래는 김 부장에게 근거가 되지 못한다.

import type { Client } from "./clients";

/** 매 턴 저절로 줄어드는 양. 사람들은 가만히 기다려 주지 않는다. */
export const TRUST_DECAY = 3;

/** 4분면의 기본 폭. 고객의 계수가 여기에 곱해진다. */
export const TRUST_GAIN_WITH_THESIS = 8;
export const TRUST_LOSS_WITH_THESIS = 4;
export const TRUST_LOSS_BLIND = 15;

export interface Settlement {
    /** 근거를 대고 권했는가. */
    hadThesis: boolean;
    /** 벌었는가(실현 손익 기준, 0 은 못 번 것으로 친다). */
    gained: boolean;
    client: Client;
}

/**
 * 이 정산이 신뢰를 얼마나 움직이는가. **자연 감소는 여기 안 들어간다** —
 * 그건 권했든 안 했든 매 턴 일어나는 일이라 `decay()` 로 따로 뗀다.
 */
export function trustDelta(s: Settlement): number {
    if (s.hadThesis) {
        return s.gained
            ? Math.round(TRUST_GAIN_WITH_THESIS * s.client.gain)
            : -Math.round(TRUST_LOSS_WITH_THESIS * s.client.loss);
    }
    // 근거 없이 벌었다 — 아무 일도 안 일어난다. 이 칸이 이 게임의 논지다.
    return s.gained ? 0 : -Math.round(TRUST_LOSS_BLIND * s.client.loss);
}

/** 왜 움직였는지 화면이 말할 수 있게. */
export function trustReason(s: Settlement): string {
    if (s.hadThesis) return s.gained ? "설명할 수 있는 수익" : "설명할 수 있는 손실";
    return s.gained ? "운으로 번 것은 실력이 아니다" : "도박이었다";
}

/** 0~100 안에 가둔다. */
export function clampTrust(v: number, max = 100): number {
    return Math.max(0, Math.min(max, Math.round(v)));
}

/** 한 턴이 지났다. */
export function decay(trust: number): number {
    return clampTrust(trust - TRUST_DECAY);
}
