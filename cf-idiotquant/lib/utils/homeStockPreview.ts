import { matchesGuestPer } from "./guestStocks";

export const HOME_STOCK_FILTERS = [
    { id: "per20", label: "PER 20 이하", description: "PER 0 초과·20 이하" },
    { id: "per10", label: "PER 10 이하", description: "PER 0 초과·10 이하" },
    { id: "low_pbr", label: "저PBR", description: "PBR 0 초과·0.5 미만" },
    { id: "ncav", label: "NCAV", description: "순유동자산이 시가총액 이상" },
] as const;
export type HomeStockFilter = typeof HOME_STOCK_FILTERS[number]["id"];

// 서버의 고정 PER 미리보기 안에서만 전환한다. 조건별 추가 요청은 하지 않는다.
export function homeStockPreview<T extends { per: number; pbr: number; ncav_ratio: number; market_cap: number }>(list: T[], filter: HomeStockFilter): T[] {
    return list.filter(item => matchesGuestPer(item) && (
        filter === "per10" ? item.per <= 10 :
        filter === "low_pbr" ? Number.isFinite(item.pbr) && item.pbr > 0 && item.pbr < 0.5 :
        filter === "ncav" ? Number.isFinite(item.ncav_ratio) && item.ncav_ratio >= 1 : true
    )).sort((a, b) => (Number.isFinite(b.market_cap) ? b.market_cap : 0) - (Number.isFinite(a.market_cap) ? a.market_cap : 0)).slice(0, 5);
}

// 분석 시작용 고정 예시. 시세·지표를 얻기 위한 종목별 API 호출은 하지 않는다.
export const LARGE_CAP_EXAMPLES = {
    KR: [
        { ticker: "005930", name: "삼성전자" },
        { ticker: "000660", name: "SK하이닉스" },
        { ticker: "005380", name: "현대차" },
        { ticker: "373220", name: "LG에너지솔루션" },
        { ticker: "207940", name: "삼성바이오로직스" },
    ],
    US: [
        { ticker: "AAPL", name: "애플" },
        { ticker: "NVDA", name: "엔비디아" },
        { ticker: "MSFT", name: "마이크로소프트" },
        { ticker: "GOOGL", name: "알파벳" },
        { ticker: "AMZN", name: "아마존" },
    ],
} as const;
