
export const getFinancialInfo: any = async (year: string, quarter: string) => {
    // console.log(`[getFinancialInfo]`, year, quarter);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/financial-info?year=${year}&quarter=${quarter}`
    const res = await fetch(url, {
        credentials: 'include',  // include credentials (like cookies) in the request
    });

    // console.log(`[getFinancialInfo] res`, res);

    return res.json();
}

export const setFinancialInfoList: any = async (dateList: string[]) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/financial-info-list`;
    const options = {
        method: 'POST',
        // credentials: 'include',  // include credentials (like cookies) in the request
        headers: {
            'Content-Type': 'test/plain;charset=UTF-8',
        },
        body: JSON.stringify(dateList),
    };
    const res = await fetch(url, options);

    return res.json();
}

export const getFinancialInfoList: any = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/financial-info-list`
    const res = await fetch(url, {
        credentials: 'include',  // include credentials (like cookies) in the request
    });

    return res.json();
}