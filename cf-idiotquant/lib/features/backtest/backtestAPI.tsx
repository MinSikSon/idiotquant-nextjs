export const getFinancialInfoWithMarketInfo: any = async (year: string, quarter: string) => {
    // console.log(`[getFinancialInfo]`, year, quarter);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/financial-info-with-market-info?year=${year}&quarter=${quarter}`
    const res = await fetch(url, {
        credentials: "include",  // include credentials (like cookies) in the request
    });

    // console.log(`[getFinancialInfo] res`, res);

    return res.json();
}
