
export const getNcavList: any = async (financialInfoDate: string, marketInfoDate: string) => {
    const url = `/stock/strategy/ncav?financialInfoDate=${financialInfoDate}&marketInfoDate=${marketInfoDate}`
    // console.log(`[getNcavList] financialInfoDate:`, financialInfoDate, `, marketInfoDate:`, marketInfoDate, `, url:`, url);
    let res = await fetch(url);

    return res.json();
}

export const setNcavList: any = async (financialInfoDate: string, marketInfoDate: string, ncavList: string) => {
    const url = `/stock/strategy/ncav`
    const data = {
        financialInfoDate: financialInfoDate,
        marketInfoDate: marketInfoDate,
        ncavList: ncavList
    };
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