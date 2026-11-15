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

/** 일별 스캔에서 확인할 수 있는 세 모델의 기준 평가액. KR 자산·부채는 억원이다. */
export function scanValuationSummary(item: {
    last_price: number | null; eps: number | null; bps: number | null;
    current_assets: number | null; total_liabilities: number | null; lstn_stcn: number | null;
}) {
    const positive = (value: number | null): value is number => value !== null && Number.isFinite(value) && value > 0;
    const hasAssets = item.current_assets !== null && Number.isFinite(item.current_assets) && item.current_assets >= 0;
    const hasLiabilities = item.total_liabilities !== null && Number.isFinite(item.total_liabilities) && item.total_liabilities >= 0;
    const models = [
        { label: 'NCAV', basis: '1배', target: hasAssets && hasLiabilities && positive(item.lstn_stcn)
            ? (item.current_assets! - item.total_liabilities!) * 100_000_000 / item.lstn_stcn : null },
        { label: 'PER', basis: '10배', target: positive(item.eps) ? item.eps * 10 : null },
        { label: 'PBR', basis: '1배', target: positive(item.bps) ? item.bps : null },
    ];
    return models.map(({ label, basis, target }) => {
        const targetPrice = positive(target) && Math.round(target) > 0 ? Math.round(target) : null;
        const gapPercent = targetPrice !== null && positive(item.last_price)
            ? (targetPrice / item.last_price - 1) * 100 : null;
        return { label, basis, targetPrice, gapPercent };
    });
}
