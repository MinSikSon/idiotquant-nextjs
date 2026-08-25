import { apiRequest } from "../apiRequest";

export const getMyLikes = () => apiRequest("/user/likes");

export const toggleLike = (ticker: string, stockName?: string, isUs?: boolean) =>
    apiRequest("/user/likes", {
        method: "POST",
        body: { ticker, stock_name: stockName, is_us: isUs ?? false },
    });
