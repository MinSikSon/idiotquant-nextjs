
export const getMarketInfo: any = async (date: string) => {
    const url = `/stock/market-info?date=${date}`
    const res = await fetch(url);

    return res.json();
}
