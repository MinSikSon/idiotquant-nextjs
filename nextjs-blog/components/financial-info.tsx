
async function getFinancialInfo() {
    async function fetchAndSet(subUrl) {
        const url = `https://idiotquant-backend.tofu89223.workers.dev`;
        const port = `443`;
        const res = await fetch(`${url}:${port}/${subUrl}`);
        const json = await res.json();
        return json;
    }

    // NOTE: 웹브라우저에서 페이지 용량 약 27MB 를 넘지 못합니다.
    let financialInfoList = {};
    // for (let year = 2017; year <= 2023; ++year) {
    for (let year = 2018; year <= 2022; ++year) {
        for (let quarter = 4; quarter <= 4; ++quarter) {
            const reqFinancialInfo = await fetchAndSet(`stock/financial-info?year=${year}&quarter=${quarter}`);
            if (null == reqFinancialInfo) continue;
            financialInfoList[`financialInfo_${year}_${quarter}`] = reqFinancialInfo;
        }
    }

    const financialInfoAll = await fetchAndSet("stock/financial-info?year=2023&quarter=4");

    return {
        props: {
            // props for your component
            financialInfoList,
            financialInfoAll,
        },
    };
}
