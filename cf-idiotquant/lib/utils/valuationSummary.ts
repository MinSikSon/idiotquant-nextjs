import type { ValuationResult } from "./financeCalc";

/** 계산 불가 모델도 남겨 세부 카드와 요약의 모델 수를 일치시킨다. */
export function valuationSummary(models: { type: string; result: ValuationResult }[]) {
    return models.map(({ type, result }) => {
        const row = result.rows.find(r =>
            /1\.0|100|기준|적정/i.test(r.multiplier.replace(/\s+/g, ""))
        ) ?? result.rows[0];
        const targetPrice = row && Number.isFinite(row.targetPrice) && row.targetPrice > 0
            ? row.targetPrice : null;
        const returnPct = targetPrice !== null && Number.isFinite(row.returnPct)
            ? row.returnPct : null;
        const notice = targetPrice !== null ? null
            : row && Number.isFinite(row.targetPrice)
                ? "기초 재무 수치가 부족하거나 계산값이 0 이하로, 양수 적정주가를 산출하지 못했습니다."
                : "계산에 필요한 재무 수치가 부족하거나 유효하지 않습니다.";
        return { type, targetPrice, returnPct, notice };
    });
}
