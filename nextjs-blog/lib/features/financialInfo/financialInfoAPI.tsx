const API_URL = "https://idiotquant-backend.tofu89223.workers.dev";

export const getFinancialInfo: any = async (year: string, quarter: string) => {
    const url = `${API_URL}/stock/financial-info?year=${year}&quarter=${quarter}`
    const res = await fetch(url);

    return res.json();
}

// export const getMarketInfo: any = async (date: string) => {
//     const url = `${API_URL}/stock/market-info?date=${date}`
//     const res = await fetch(url);
//     return res.json();
// }

// export const fetchStock: any = async () => {
//     // console.log(`fetchStock`);
//     const res = await fetch(`${API_URL}/stock/financial-info-ncav`);

//     return res.json();
// }