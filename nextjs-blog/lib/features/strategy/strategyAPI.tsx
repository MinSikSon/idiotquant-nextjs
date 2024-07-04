export const getNcavList: any = async (financialInfoDate: string, marketInfoDate: string) => {
    const url = `/stock/ncav-list?financialInfoDate=${financialInfoDate}&marketInfoDate=${marketInfoDate}`
    console.log(`[getNcavList] financialInfoDate:`, financialInfoDate, `, marketInfoDate:`, marketInfoDate, `, url:`, url);
    let res = await fetch(url);
    // TODO: getNcavList 해서 없으면, FinancialInfo/MargetInfo 요청하고 ncav-list 행성해서 setNcavList call 하는 식으로 동작하게 만들자.

    return res.json();
}

export const setNcavList: any = async (financialInfoDate: string, marketInfoDate: string, ncavList: string[]) => {
    const port = `443`;
    const url = `/api/stock/register-ncav-list`
    const data = {
        financialInfoDate: financialInfoDate,
        marketInfoDate: marketInfoDate,
        ncavList: ncavList
    };
    console.log(`[setNcavList] data:`, data);
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(data),
    };
    const res = await fetch(url, options);

    console.log(`[setNcavList]`, res);

    return res.json();
}