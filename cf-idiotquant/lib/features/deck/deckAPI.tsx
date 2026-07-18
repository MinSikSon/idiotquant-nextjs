// 카드 게임 덱 API — 계정별 보유 카드 (백엔드 /user/deck)

export interface DeckCardSnapshot {
    ticker: string;
    name: string;
    market_cap: number;
    last_price: number;
    ncav_ratio: number;
    pbr: number;
    per: number;
    eps: number;
    bps: number;
    tone?: string; // 저평가 등급 톤 — 지갑 중복 카드 전환 시 코인 가치 조회용
}

async function deckRequest(subUrl: string, method = "GET", body?: object) {
    try {
        const res = await fetch(`/api/proxy${subUrl}`, {
            method,
            credentials: "include",
            headers: { "content-type": "application/json" },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch { /* 비 JSON 응답(예: 404 HTML) */ }
        if (!res.ok || !json || typeof json !== "object") {
            return { success: false, status: res.status, error: json?.error ?? (text ? text.slice(0, 100) : `HTTP ${res.status}`) };
        }
        return json;
    } catch {
        return { success: false, status: 0, error: "네트워크 오류" };
    }
}

// 내 덱 목록: [{ ticker, name, card }]
export const getDeck = () => deckRequest("/user/deck");

// 카드 추가 (같은 종목이면 수집 개수 +1). added: 수집 성공, count: 누적 개수
export const addDeckCard = (card: DeckCardSnapshot) =>
    deckRequest("/user/deck", "POST", { ticker: card.ticker, name: card.name, card });

// 내 지갑: { coins, best_streak }
export const getWallet = () => deckRequest("/user/wallet");

// 중복 카드(count-1장까지) 코인 전환. gained: 획득 코인, remaining: 전환 후 개수
export const convertDupes = (ticker: string, amount: number) =>
    deckRequest("/user/wallet", "POST", { action: "convert", ticker, amount });

// 상점 구매용 코인 차감. coins: 차감 후 잔액
export const spendCoins = (cost: number) =>
    deckRequest("/user/wallet", "POST", { action: "spend", cost });

// 최고 연승 기록 기기 간 동기화 (서버는 MAX(기존값, streak)로 갱신)
export const syncBestStreak = (streak: number) =>
    deckRequest("/user/wallet", "POST", { action: "syncBest", streak });
