const API_URL = "https://idiotquant-backend.tofu89223.workers.dev";

export const getMarketInfo: any = async (date: string) => {
    const url = `${API_URL}/stock/market-info?date=${date}`
    const res = await fetch(url);

    return res.json();
}
