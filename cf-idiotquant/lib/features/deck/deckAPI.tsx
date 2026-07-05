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

// 카드 추가 (중복은 백엔드에서 무시). added: 신규 추가 여부
export const addDeckCard = (card: DeckCardSnapshot) =>
    deckRequest("/user/deck", "POST", { ticker: card.ticker, name: card.name, card });
