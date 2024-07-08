
export const getMarketInfo: any = async (date: string) => {
    const url = `stock/market-info?date=${date}`
    const res = await fetch(url);

    return res.json();
}

export const setMarketInfoList: any = async (dateList: string[]) => {
    const url = `stock/market-info-list`;
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
    const url = `stock/market-info-list`
    const res = await fetch(url);

    return res.json();
}
