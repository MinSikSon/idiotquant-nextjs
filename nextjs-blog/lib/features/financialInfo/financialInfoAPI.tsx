
export const getFinancialInfo: any = async (year: string, quarter: string) => {
    const url = `/stock/financial-info?year=${year}&quarter=${quarter}`
    const res = await fetch(url);

    return res.json();
}
