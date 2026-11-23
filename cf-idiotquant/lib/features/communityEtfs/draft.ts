import type { CommunityEtfDescription, CommunityEtfDraft, EtfMarket } from "./api";

const DRAFT_KEY = "idiotquant:community-etf-draft:v1";
export const ETF_HOLDING_LIMIT = 20;

type SavedEtfDraft = CommunityEtfDraft & { description?: CommunityEtfDescription };

export function readEtfDraft(): SavedEtfDraft | null {
    try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
        if ((draft?.market === "KR" || draft?.market === "US") && Array.isArray(draft.holdings)) return draft;
    } catch { /* 이전에 저장된 종목이 없으면 빈 초안에서 시작한다. */ }
    return null;
}

export function writeEtfDraft(draft: SavedEtfDraft | null) {
    if (draft?.holdings.length) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
}

export function addEtfHoldings(selection: CommunityEtfDraft) {
    const draft = readEtfDraft();
    if (draft?.holdings.length && draft.market !== selection.market) {
        const market = draft.market === "US" ? "미국" : "국내";
        throw new Error(`현재 초안에는 ${market} 종목을 담고 있어요. 같은 시장의 종목을 골라 주세요.`);
    }
    const holdings = new Map(draft?.holdings.map(holding => [holding.ticker.trim().toUpperCase(), holding]));
    for (const holding of selection.holdings) {
        const ticker = holding.ticker.trim().toUpperCase();
        if (!holdings.has(ticker)) holdings.set(ticker, { ...holding, ticker });
    }
    if (holdings.size > ETF_HOLDING_LIMIT) {
        throw new Error(`가상 ETF에는 최대 ${ETF_HOLDING_LIMIT}종목까지 담을 수 있어요. 초안에서 종목을 빼고 다시 시도해 주세요.`);
    }
    const next = { ...draft, market: selection.market, holdings: [...holdings.values()] };
    writeEtfDraft(next);
    return next;
}

export function etfPickerHref(market?: EtfMarket) {
    return `/screener?createEtf=1${market ? `&country=${market}` : ""}`;
}
