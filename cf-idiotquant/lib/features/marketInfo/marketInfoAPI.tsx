
export const getMarketInfo: any = async (date: string) => {
    // console.log(`[getMarketInfo] date`, date);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/market-info?date=${date}`
    // console.log(`[getMarketInfo] url`, url);
    const res = await fetch(url);

    // console.log(`[getMarketInfo] res`, res);

    return res.json();
}

export const setMarketInfoList: any = async (dateList: string[]) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/market-info-list`;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'test/plain;charset=UTF-8',
            // 'Content-Type': 'application/json',
        },
        body: JSON.stringify(dateList),
    };
    const res = await fetch(url, options);

    return res.json();
}

export const getMarketInfoList: any = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/market-info-list`
    const res = await fetch(url);

    return res.json();
}
