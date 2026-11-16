import { scanMarketCap, scanTradingAmount } from "@/lib/utils/scanFinancials";
import { LOW_TR_AMT_EOK } from "@/lib/utils/stockRisk";

/** null = 근거 부족. country는 상장 시장이므로 본사 소재지 판정에 사용하지 않는다. */
export function screenerRisks(item: Record<string, any>, country: "KR" | "US" = item.country === "US" ? "US" : "KR") {
    const headquarters = String(item.headquarters_country ?? "").trim().toUpperCase();
    const cap = scanMarketCap(item, country);
    const chinaSmall = country !== "US" ? false
        : !headquarters || cap <= 0 ? null
        : ["CN", "CHN", "CHINA", "中国", "중국"].includes(headquarters) && cap < 300;
    const amount = typeof item.acml_tr_pbmn === "string" && !item.acml_tr_pbmn.trim()
        ? null : scanTradingAmount(item, country);
    const lowLiquidity = amount === null || amount < 0 ? null : amount < (country === "US" ? 0.1 : LOW_TR_AMT_EOK);

    // 연간 자료만 사용한다. 분기 누적 현금흐름을 독립 분기처럼 세지 않는다.
    const history = Array.isArray(item.operating_cash_flow_history) ? item.operating_cash_flow_history : [];
    const years = new Map<number, number>();
    for (const row of history) {
        if (!row || row.value === null || row.value === undefined || String(row.value).trim() === "") continue;
        const year = Number(row.fiscal_year);
        const value = Number(row.value);
        if (Number.isInteger(year) && year > 1900 && Number.isFinite(value)) years.set(year, value);
    }
    const latest = Math.max(...years.keys());
    const scanYear = Number(String(item.scan_date ?? "").slice(0, 4));
    const values = [latest, latest - 1, latest - 2].map(year => years.get(year));
    const cashBurn = !scanYear || latest > scanYear || latest < scanYear - 2 || values.some(value => value === undefined)
        ? null : values.every(value => value! < 0);
    return { chinaSmall, lowLiquidity, cashBurn };
}
