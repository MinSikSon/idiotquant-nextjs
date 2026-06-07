/** 관심 종목 토글. Worker /user/likes POST 경유. */
export async function toggleStockLike(
    ticker: string,
    isUs: boolean,
    stockName?: string,
): Promise<{ success: boolean; liked: boolean; message?: string }> {
    try {
        const res = await fetch("/api/proxy/user/likes", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ticker, is_us: isUs, stock_name: stockName }),
        });
        return await res.json();
    } catch {
        return { success: false, liked: false, message: "오류가 발생했습니다." };
    }
}

/** 로그인한 유저의 관심 종목 ticker 목록 반환. */
export async function getMyStockLikes(): Promise<string[]> {
    try {
        const res = await fetch("/api/proxy/user/likes", { credentials: "include" });
        const data = await res.json();
        if (data?.success) {
            return (data.data ?? []).map((item: { ticker: string }) => item.ticker);
        }
        return [];
    } catch {
        return [];
    }
}
