import nonEquitySymbols from "@/public/data/usStockSymbols/non_equity_symbols.json" with { type: "json" };

const nonEquity = new Set<string>(nonEquitySymbols);

/** 기업의 보통주 시가총액과 재무제표를 직접 비교할 수 없는 증권. 티커 접미사로 추측하지 않는다. */
export function isNonEquityName(name: string): boolean {
    return /\b(?:WARRANTS?|WTS?|RIGHTS|ETF|ETN)\b|\bC\s*\/\s*WTS?\b|\b(?:UNITS?|UNT|UTS)\b|워런트|신주인수권|수익증권|상장지수|유닛/i.test(name);
}

type ValuationStock = {
    ticker?: string; name?: string; eng_name?: string; country?: string;
    last_price?: number | null; market_cap?: number | null;
    ncav_ratio?: number | null; bps?: number | null;
    current_assets?: number | null; total_liabilities?: number | null;
};

export function isValuationEligible(item: ValuationStock, country = item.country): boolean {
    const ticker = (item.ticker ?? "").trim().toUpperCase();
    const names = [item.eng_name, item.name].filter(name => name && name.trim().toUpperCase() !== ticker).join(" ");
    if (isNonEquityName(names)) return false;
    if (country === "US" && nonEquity.has((item.ticker ?? "").trim().toUpperCase())) return false;
    for (const value of [item.last_price, item.market_cap]) {
        if (value !== undefined && (value === null || !Number.isFinite(value) || value <= 0)) return false;
    }
    for (const value of [item.current_assets, item.total_liabilities]) {
        if (value != null && (!Number.isFinite(value) || value < 0)) return false;
    }
    if (item.ncav_ratio != null && !Number.isFinite(item.ncav_ratio)) return false;
    if (item.current_assets != null && item.total_liabilities != null && (item.market_cap ?? 0) > 0 && item.ncav_ratio != null) {
        const ratio = (item.current_assets - item.total_liabilities) / item.market_cap!;
        // 수집 NCAV 비율은 소수점 다섯 자리로 저장된다.
        if (Math.abs(ratio - item.ncav_ratio) > 0.0000051) return false;
    }
    // NCAV 후보에서 순유동자산 가치가 장부가치보다 크면 두 재무값의 통화·주식 수·기준이 맞지 않는다.
    // BPS의 소수점 둘째 자리 반올림 오차만 허용한다. 비율 크기 자체를 제한하지는 않는다.
    if ((item.ncav_ratio ?? 0) >= 1 && (item.bps ?? 0) > 0 && (item.last_price ?? 0) > 0 &&
        item.ncav_ratio! * item.last_price! > item.bps! + 0.005) return false;
    return true;
}
