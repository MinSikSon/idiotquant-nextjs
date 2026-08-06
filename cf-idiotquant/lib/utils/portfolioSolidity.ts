// 포트폴리오 탄탄함 지수.
//
// computeValueScore 는 "얼마나 싼가"(저평가)를 잰다. 탄탄함은 다른 질문이다 —
// 정리매매 종목만 담은 목록은 청산가치 대비 만점에 가깝게 싸지만 전혀 탄탄하지 않다.
// 폐지가 확정되면 주가가 먼저 무너져 오히려 저평가 점수가 올라가기 때문이다.
//
// 그래서 저평가 점수를 그대로 쓰지 않고, 실제로 회수할 수 있는지를 두 가지로 깎는다.
//   1) 종목별 거래상태 — 못 파는 종목은 장부상 가치가 있어도 탄탄함에 기여하지 못한다
//   2) 업종 쏠림     — 개별 종목이 아무리 좋아도 한 업종에 몰리면 같이 무너진다
//
// computeValueScore 자체는 건드리지 않는다. 카드 게임의 전투 스탯·카드 등급·업적이
// 모두 그 값에 걸려 있어서, 여기서 바꾸면 게임 밸런스가 통째로 흔들린다.

import { computeValueScore } from "./valueScore";
import {
    isDelisting, isHalted, isManaged, marketWarn,
    isCautionAdvised, isOverheated, trAmtEok, LOW_TR_AMT_EOK,
} from "./stockRisk";

export interface SolidityBreakdown {
    score: number;              // 0~100 — 화면에 크게 찍히는 값
    label: string;
    /** 위험 반영 전 평균 저평가 점수 — 얼마나 깎였는지 보여주기 위해 남긴다 */
    base: number;
    /** 감점된 종목 수 */
    riskCount: number;
    /** 업종 쏠림 감점 (0이면 없음) */
    concentrationPenalty: number;
    /** 가장 비중이 큰 업종. 업종을 아는 종목이 4개 미만이면 null */
    topSector: { name: string; ratio: number } | null;
}

/**
 * 종목별 회수 가능성 계수 (0~1).
 * 배지와 같은 우선순위로 가장 심한 것 하나만 적용한다 — 겹쳐 곱하면 한 종목이
 * 지수를 통째로 끌어내린다.
 */
export function riskFactor(item: any): number {
    // 정리매매·거래정지: 지금 팔 수 없다. 장부상 가치는 탄탄함이 아니다.
    if (isDelisting(item) || isHalted(item)) return 0.3;

    const warn = marketWarn(item);
    if (isManaged(item) || warn === "투자위험") return 0.5;
    if (warn === "투자경고") return 0.7;
    if (isCautionAdvised(item) || isOverheated(item)) return 0.85;

    // 유동성 — 지표가 좋아도 원하는 수량을 담거나 빼지 못하면 탄탄하다고 하기 어렵다.
    // 값이 없으면(아직 미수집) 깎지 않는다. "모르는 것"은 "나쁜 것"이 아니다.
    const v = trAmtEok(item);
    if (v !== null && v < LOW_TR_AMT_EOK) return 0.9;

    return 1;
}

function labelOf(score: number): string {
    if (score >= 70) return "매우 탄탄";
    if (score >= 50) return "탄탄";
    if (score >= 35) return "보통";
    return "보강 필요";
}

/** 업종 쏠림을 판단하려면 표본이 있어야 한다. 2~3종목은 몰린 게 아니라 그냥 적은 것이다. */
const MIN_FOR_CONCENTRATION = 4;

export function computeSolidity(items: any[]): SolidityBreakdown {
    if (!items?.length) {
        return { score: 0, label: labelOf(0), base: 0, riskCount: 0, concentrationPenalty: 0, topSector: null };
    }

    const factors = items.map(riskFactor);
    const scores = items.map(i => computeValueScore(i).score);

    const base = Math.round(scores.reduce((a, s) => a + s, 0) / items.length);
    const adjusted = scores.reduce((a, s, idx) => a + s * factors[idx], 0) / items.length;
    const riskCount = factors.filter(f => f < 1).length;

    // 업종 쏠림 — 업종을 아는 종목들 안에서만 따진다
    const sectors = items.map(i => String(i?.sector ?? "").trim()).filter(Boolean);
    let topSector: SolidityBreakdown["topSector"] = null;
    let concentrationPenalty = 0;

    if (sectors.length >= MIN_FOR_CONCENTRATION) {
        const counts = new Map<string, number>();
        for (const s of sectors) counts.set(s, (counts.get(s) ?? 0) + 1);
        const [name, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        const ratio = n / sectors.length;
        topSector = { name, ratio };
        // 절반까지는 자연스럽다. 그 위로만 깎되 전량 한 업종이어도 20점까지만.
        if (ratio > 0.5) concentrationPenalty = Math.round((ratio - 0.5) * 40);
    }

    const score = Math.max(0, Math.min(100, Math.round(adjusted) - concentrationPenalty));
    return { score, label: labelOf(score), base, riskCount, concentrationPenalty, topSector };
}
