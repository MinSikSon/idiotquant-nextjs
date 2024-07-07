
export const getNcavList: any = async (financialInfoDate: string, marketInfoDate: string) => {
    const url = `/stock/ncav-list?financialInfoDate=${financialInfoDate}&marketInfoDate=${marketInfoDate}`
    console.log(`[getNcavList] financialInfoDate:`, financialInfoDate, `, marketInfoDate:`, marketInfoDate, `, url:`, url);
    let res = await fetch(url);
    // TODO: getNcavList 해서 없으면, FinancialInfo/MargetInfo 요청하고 ncav-list 행성해서 setNcavList call 하는 식으로 동작하게 만들자.

    return res.json();
}

export const setNcavList: any = async (financialInfoDate: string, marketInfoDate: string, ncavList: string[]) => {
    const url = `/stock/register-ncav-list`
    const data = {
        financialInfoDate: financialInfoDate,
        marketInfoDate: marketInfoDate,
        // ncavList: ncavList.toString()
        ncavList: JSON.stringify(ncavList)
    };
    console.log(`JSON.stringify(data)`, JSON.stringify(data));
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'test/plain;charset=UTF-8',
            // 'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };
    console.log(`[setNcavList] data:`, data);
    const res = await fetch(url, options);

    console.log(`[setNcavList]`, res);

    return res.json();
}