
async function likesRequest(subUrl: string, method = "GET", body?: object) {
    const url = `/api/proxy${subUrl}`;
    const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
}

export const getMyLikes = () => likesRequest("/user/likes");

export const toggleLike = (ticker: string, stockName?: string, isUs?: boolean) =>
    likesRequest("/user/likes", "POST", { ticker, stock_name: stockName, is_us: isUs ?? false });
