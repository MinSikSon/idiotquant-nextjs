
export const getFinancialInfo: any = async (year: string, quarter: string) => {
    const url = `stock/financial-info?year=${year}&quarter=${quarter}`
    const res = await fetch(url);

    return res.json();
}

export const setFinancialInfoList: any = async (dateList: string[]) => {
    const url = `stock/financial-info-list`;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'test/plain;charset=UTF-8',
        },
        body: JSON.stringify(dateList),
    };
    const res = await fetch(url, options);

    return res.json();
}

export const getFinancialInfoList: any = async () => {
    const url = `stock/financial-info-list`
    const res = await fetch(url);

    return res.json();
}