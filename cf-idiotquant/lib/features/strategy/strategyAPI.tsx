
export const getNcavList: any = async (financialInfoDate: string, marketInfoDate: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/strategy/ncav?financialInfoDate=${financialInfoDate}&marketInfoDate=${marketInfoDate}`
    let res = await fetch(url);
    // console.log(`[getNcavList] financialInfoDate:`, financialInfoDate, `, marketInfoDate:`, marketInfoDate, `, url:`, url);
    // console.log(`[getNcavList]`, res);

    return res.json();
}

export const setNcavList: any = async (financialInfoDate: string, marketInfoDate: string, ncavList: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/stock/strategy/ncav`
    const data = {
        financialInfoDate: financialInfoDate,
        marketInfoDate: marketInfoDate,
        ncavList: ncavList
    };

    // console.log(`[setNcavList]`, data);
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'test/plain;charset=UTF-8',
        },
        body: JSON.stringify(data),
    };
    // console.log(`[setNcavList] data:`, data);
    const res = await fetch(url, options);

    return res.json();
}