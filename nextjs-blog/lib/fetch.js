
// export async function getServerData() {
//     // Get file names under /posts
//     async function fetchAndSet(subUrl) {
//         const url = `https://idiotquant-backend.tofu89223.workers.dev`;
//         const port = `443`;
//         const res = await fetch(`${url}:${port}/${subUrl}`);
//         const json = await res.json();
//         return json;
//     }

//     const marketInfo20181214 = await fetchAndSet('stock/market-info?date=20181214');
//     const marketInfo20191213 = await fetchAndSet('stock/market-info?date=20191213');
//     const marketInfo20201214 = await fetchAndSet('stock/market-info?date=20201214');
//     const marketInfo20211214 = await fetchAndSet('stock/market-info?date=20211214');
//     const marketInfo20221214 = await fetchAndSet('stock/market-info?date=20221214');
//     const marketInfo20230111 = await fetchAndSet('stock/market-info?date=20230111');
//     const marketInfoLatest = await fetchAndSet('stock/market-info?date=20230426');
//     const financialInfoAll = await fetchAndSet('stock/financial-info');
//     return {
//         props: {
//             // props for your component
//             marketInfo20181214,
//             marketInfo20191213,
//             marketInfo20201214,
//             marketInfo20211214,
//             marketInfo20221214,
//             marketInfo20230111,
//             marketInfoLatest,
//             financialInfoAll,
//         },
//     };
// }