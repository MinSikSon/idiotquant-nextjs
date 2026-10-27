export interface SearchLogEntry {
    ticker: string;
    name: string;
    isUs: boolean;
}

const COOLDOWN_MS = 30 * 60 * 1000;
const STORAGE_KEY = 'iq:search-log:v1';
const pending = new Set<string>();
const recorded = new Map<string, number>();

export function searchLogFromQuote(ticker: string, isUs: boolean, quote: any, name: string): SearchLogEntry | null {
    const price = Number(isUs ? quote?.output?.last : quote?.output?.stck_prpr);
    if (quote?.rt_cd !== '0' || !Number.isFinite(price) || price <= 0) return null;
    return { ticker: ticker.trim().toUpperCase(), name: name.trim() || ticker, isUs };
}

// 성공한 기록만 쿨다운에 넣는다. 저장소가 차단된 브라우저에서도 검색은 계속된다.
export async function recordSearchOnce(
    entry: SearchLogEntry,
    post: (entry: SearchLogEntry) => Promise<any>,
    storage?: Pick<Storage, 'getItem' | 'setItem'>,
    now = Date.now(),
) {
    const key = `${entry.isUs ? 'US' : 'KR'}:${entry.ticker}`;
    let history: Record<string, number> = {};
    try {
        const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) history = parsed;
    } catch { /* 저장소를 쓸 수 없으면 메모리의 쿨다운을 쓴다. */ }
    const last = Math.max(Number(history[key]) || 0, recorded.get(key) ?? 0);
    if (pending.has(key) || (now >= last && now - last < COOLDOWN_MS)) return { success: true, skipped: true };
    pending.add(key);
    try {
        const result = await post(entry);
        if (result?.success === true) {
            recorded.set(key, now);
            for (const [ticker, time] of recorded) if (now - time >= COOLDOWN_MS) recorded.delete(ticker);
            try {
                const latest = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}');
                if (latest && typeof latest === 'object' && !Array.isArray(latest)) history = latest;
            } catch { /* 처음 읽은 기록을 쓴다. */ }
            history[key] = now;
            history = Object.fromEntries(Object.entries(history).filter(([, time]) =>
                Number.isFinite(time) && time <= now && now - time < COOLDOWN_MS));
            try { storage?.setItem(STORAGE_KEY, JSON.stringify(history)); } catch { /* 메모리에 기록했다. */ }
        }
        return result;
    } finally {
        pending.delete(key);
    }
}
