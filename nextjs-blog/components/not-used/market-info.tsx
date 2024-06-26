async function getMarketInfo() {
    async function fetchAndSet(subUrl) {
        const url = `https://idiotquant-backend.tofu89223.workers.dev`;
        const port = `443`;
        const res = await fetch(`${url}:${port}/${subUrl}`);
        const json = await res.json();
        return json;
    }

    // NOTE: 웹브라우저에서 페이지 용량 약 27MB 를 넘지 못합니다.
    // const marketInfo20181214 = await fetchAndSet("stock/market-info?date=20181214");
    const marketInfo20191213: any = await fetchAndSet("stock/market-info?date=20191213");
    const marketInfo20201214: any = await fetchAndSet("stock/market-info?date=20201214");
    const marketInfo20211214: any = await fetchAndSet("stock/market-info?date=20211214");
    const marketInfo20221214: any = await fetchAndSet("stock/market-info?date=20221214");
    // const marketInfo20230111 = await fetchAndSet("stock/market-info?date=20230111");
    // const marketInfo20230302 = await fetchAndSet("stock/market-info?date=20230302");
    // const marketInfo20230324 = await fetchAndSet("stock/market-info?date=20230324");
    // const marketInfo20230417 = await fetchAndSet("stock/market-info?date=20230417");
    // const marketInfo20230426 = await fetchAndSet("stock/market-info?date=20230426");
    // const marketInfo20230524 = await fetchAndSet("stock/market-info?date=20230524");
    // const marketInfo20230622 = await fetchAndSet("stock/market-info?date=20230622");
    // const marketInfo20230719 = await fetchAndSet("stock/market-info?date=20230719");
    // const marketInfo20230810 = await fetchAndSet("stock/market-info?date=20230810");
    // const marketInfo20230825 = await fetchAndSet("stock/market-info?date=20230825");
    // const marketInfo20230922 = await fetchAndSet("stock/market-info?date=20230922");
    const marketInfo20231013: any = await fetchAndSet("stock/market-info?date=20231013");
    const marketInfo20240201: any = await fetchAndSet("stock/market-info?date=20240201");
    const marketInfoPrev: any = await fetchAndSet("stock/market-info?date=20231124");
    // const marketInfoPrev = await fetchAndSet("stock/market-info?date=20231106");
    const marketInfoLatest: any = await fetchAndSet("stock/market-info?date=20240327");

    let marketInfoList: any = [];
    // marketInfoList.push(marketInfo20181214);
    marketInfoList.push(marketInfo20191213);
    marketInfoList.push(marketInfo20201214);
    marketInfoList.push(marketInfo20211214);
    marketInfoList.push(marketInfo20221214);
    // marketInfoList.push(marketInfo20230111);
    // marketInfoList.push(marketInfo20230302);
    // marketInfoList.push(marketInfo20230324);
    // marketInfoList.push(marketInfo20230417);
    // marketInfoList.push(marketInfo20230426);
    // marketInfoList.push(marketInfo20230524);
    // marketInfoList.push(marketInfo20230622);
    // marketInfoList.push(marketInfo20230719);
    // marketInfoList.push(marketInfo20230810);
    // marketInfoList.push(marketInfo20230825);
    // marketInfoList.push(marketInfo20230922);
    marketInfoList.push(marketInfo20231013);
    marketInfoList.push(marketInfo20240201);
    marketInfoList.push(marketInfoPrev);
    marketInfoList.push(marketInfoLatest);

    return {
        props: {
            // props for your component
            marketInfoList,
        },
    };
}
