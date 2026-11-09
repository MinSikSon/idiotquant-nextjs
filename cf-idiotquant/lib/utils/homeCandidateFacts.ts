import { financialFreshness, scanFinancialPeriods } from "./financialFreshness";
import { isValuationEligible } from "./stockValuationEligibility";
import type { HomeStock } from "./homeStockPreview";

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** 첫 화면에서 실제 확인할 수 있는 세 가지 조건과 기초 위험 신호만 판정한다. */
export function homeCandidateFacts(stock: HomeStock, now = new Date()) {
    const income = finite(stock.net_income) && stock.net_income !== 0 ? stock.net_income : null;
    const eps = finite(stock.eps) ? stock.eps : null;
    const bps = finite(stock.bps) ? stock.bps : null;
    const profitable = income !== null ? income > 0 : eps !== null ? eps > 0 : null;
    const conflicts = income !== null && eps !== null && (income > 0) !== (eps > 0);
    const conditions = [
        { id: "per10", label: "저PER", formula: "0 < PER ≤ 10", met: finite(stock.per) && stock.per > 0 ? stock.per <= 10 : null },
        { id: "low_pbr", label: "저PBR", formula: "0 < PBR < 0.5", met: finite(stock.pbr) && stock.pbr > 0 ? stock.pbr < .5 : null },
        { id: "ncav", label: "NCAV", formula: "순유동자산 / 시가총액 ≥ 100%", met: finite(stock.ncav_ratio) ? stock.ncav_ratio >= 1 : null },
    ];
    const caution: string[] = [];
    const unknown: string[] = [];
    if (profitable === false) caution.push("적자 또는 이익 없음");
    if (finite(stock.ncav_ratio) && stock.ncav_ratio < 0) caution.push("순유동자산 음수");
    if (bps !== null && bps <= 0) caution.push("주당 순자산 0 이하");
    if (conflicts) caution.push("순이익·EPS 부호 불일치");
    if (profitable === null) unknown.push("이익 정보 미확인");
    if (bps === null) unknown.push("순자산 정보 미확인");
    if (!finite(stock.per) || stock.per <= 0 || !finite(stock.pbr) || stock.pbr <= 0) unknown.push("PER·PBR 일부 미확인");
    const freshness = financialFreshness(scanFinancialPeriods(stock), now);
    if (freshness.status === "stale") caution.push(freshness.label);
    if (freshness.status === "unknown") unknown.push(freshness.label);
    const date = /^\d{8}$/.test(stock.scan_date) ? `${stock.scan_date.slice(0, 4)}-${stock.scan_date.slice(4, 6)}-${stock.scan_date.slice(6, 8)}` : "";
    const today = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
    const age = (Date.parse(today) - Date.parse(date)) / 86400000;
    if (!date || !Number.isFinite(age) || age < 0) unknown.push("수집 기준일 확인 필요");
    else if (age > 3) caution.push("주가 수집 후 3일 초과");
    const status = caution.length ? "caution" : unknown.length ? "unknown" : "checked";
    // EPS/BPS로 같은 기준의 ROE를 계산할 수 없는 경우 값을 만들어내지 않는다.
    const roe = eps !== null && bps !== null && bps > 0 && !conflicts ? eps / bps * 100 : null;
    return { conditions, matched: conditions.filter(condition => condition.met === true).length, profitable, roe, status, issues: [...caution, ...unknown], freshness };
}

/** 현재 표시 후보 중 기본 점검 통과 → 조건 충족 수 → 시총 순. 임의 점수나 수익 예측은 사용하지 않는다. */
export function pickHomeCandidate(stocks: HomeStock[], now = new Date()) {
    return stocks.filter(stock => isValuationEligible(stock) && homeCandidateFacts(stock, now).status === "checked" && homeCandidateFacts(stock, now).profitable === true)
        .sort((a, b) => homeCandidateFacts(b, now).matched - homeCandidateFacts(a, now).matched || b.market_cap - a.market_cap || a.ticker.localeCompare(b.ticker))[0] ?? null;
}
