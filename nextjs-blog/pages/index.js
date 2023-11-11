import React from "react";
import Head from "next/head.js";
import { Util } from "../components/Util.js";

import { useRouter } from "next/router.js";
import NavbarDefault from "../components/NavigationPanel.js";
import DescriptionPanel from "../components/DescriptionPanel.js";

import { strategyNCAV } from "../components/Strategy.js";
import RecentlyViewedStocks from "../components/RecentlyViewedStocks.js";
import TitlePanel from "../components/TitlePanel.js";

export async function getStaticProps() {
    async function fetchAndSet(subUrl) {
        const url = `https://idiotquant-backend.tofu89223.workers.dev`;
        const port = `443`;
        const res = await fetch(`${url}:${port}/${subUrl}`);
        const json = await res.json();
        return json;
    }

    const marketInfo20181214 = await fetchAndSet('stock/market-info?date=20181214');
    const marketInfo20191213 = await fetchAndSet('stock/market-info?date=20191213');
    const marketInfo20201214 = await fetchAndSet('stock/market-info?date=20201214');
    const marketInfo20211214 = await fetchAndSet('stock/market-info?date=20211214');
    const marketInfo20221214 = await fetchAndSet('stock/market-info?date=20221214');
    const marketInfo20230111 = await fetchAndSet('stock/market-info?date=20230111');
    const marketInfo20230302 = await fetchAndSet('stock/market-info?date=20230302');
    const marketInfo20230324 = await fetchAndSet('stock/market-info?date=20230324');
    const marketInfo20230417 = await fetchAndSet('stock/market-info?date=20230417');
    const marketInfo20230426 = await fetchAndSet('stock/market-info?date=20230426');
    const marketInfo20230524 = await fetchAndSet('stock/market-info?date=20230524');
    const marketInfo20230622 = await fetchAndSet('stock/market-info?date=20230622');
    const marketInfo20230719 = await fetchAndSet('stock/market-info?date=20230719');
    const marketInfo20230810 = await fetchAndSet('stock/market-info?date=20230810');
    const marketInfo20230825 = await fetchAndSet('stock/market-info?date=20230825');
    const marketInfo20230922 = await fetchAndSet('stock/market-info?date=20230922');
    const marketInfo20231013 = await fetchAndSet('stock/market-info?date=20231013');
    const marketInfoPrev = await fetchAndSet('stock/market-info?date=20231013');
    const marketInfoLatest = await fetchAndSet('stock/market-info?date=20231106');

    const financialInfoAll = await fetchAndSet('stock/financial-info');

    let marketInfoList = []
    marketInfoList.push(marketInfo20181214);
    marketInfoList.push(marketInfo20191213);
    marketInfoList.push(marketInfo20201214);
    marketInfoList.push(marketInfo20211214);
    marketInfoList.push(marketInfo20221214);
    marketInfoList.push(marketInfo20230111);
    marketInfoList.push(marketInfo20230302);
    marketInfoList.push(marketInfo20230324);
    marketInfoList.push(marketInfo20230417);
    marketInfoList.push(marketInfo20230426);
    marketInfoList.push(marketInfo20230524);
    marketInfoList.push(marketInfo20230622);
    marketInfoList.push(marketInfo20230719);
    marketInfoList.push(marketInfo20230810);
    marketInfoList.push(marketInfo20230825);
    marketInfoList.push(marketInfo20230922);
    marketInfoList.push(marketInfo20231013);
    marketInfoList.push(marketInfoPrev);
    marketInfoList.push(marketInfoLatest);

    return {
        props: {
            // props for your component
            marketInfoList,
            financialInfoAll,
        },
    };
}

export default function QuantPost({
    marketInfoList,
    financialInfoAll,
}) {
    // console.log(`%c[call] QuantPost`, `color : white; background : blue`);

    const router = useRouter();

    // state
    const [inputValue, setInputValue] = React.useState('');
    const [inputPlaceholder, setInputPlaceholder] = React.useState('');
    const [searchResult, setSearchResult] = React.useState('');

    const [latestStockCompanyInfo, setLatestStockCompanyInfo] = React.useState('');

    const [searchPanelIsOpened, setSearchPanelIsOpened] = React.useState(false);
    const [openCalculator, setOpenCalculator] = React.useState(false);

    const [dictFilteredStockCompanyInfo, setDictFilteredStockCompanyInfo] = React.useState('');

    const [stockCompanyChangeCount, setStockCompanyChangeCount] = React.useState(0);

    const [strategyInfo, setStrategyInfo] = React.useState({ title: 'NCAV 전략', description: '"순유동자산 > 시가총액" 인 종목 추천합니다.' });

    const [searchingList, setSearchingList] = React.useState(''); // 검색 도중 종목명 출력

    const [selectedStrategy, setSelectedStrategy] = React.useState('ncav');

    const [ip, setIp] = React.useState('');
    const [authorizeCode, setAuthorizeCode] = React.useState('');
    const [accessToken, setAccessToken] = React.useState('');
    const [loginStatus, setLoginStatus] = React.useState('');

    const [openNav, setOpenNav] = React.useState(true);

    const [openMenu, setOpenMenu] = React.useState(false);

    // RecentlyViewedStocks.js
    const [recentlyViewedStocksList, setRecentlyViewedStocksList] = React.useState([]);

    function changeStockCompanyName(dictOrigin, srcName, dstName) {
        const { [srcName]: srcCompanyInfo, ...rest } = dictOrigin;
        rest[dstName] = { ...srcCompanyInfo, '종목명': dstName };

        return rest;
    }

    React.useEffect(() => {
        const marketInfoPrevIndex = marketInfoList.length - 2;
        const marketInfoLatestIndex = marketInfoList.length - 1;
        const marketInfoPrev = marketInfoList[marketInfoPrevIndex];
        const marketInfoLatest = marketInfoList[marketInfoLatestIndex];

        if (!!financialInfoAll && !!marketInfoLatest) {
            function addEasterEgg(dictOrigin) {
                let easterEgg = {
                    active: false,
                    종목명: '슈뷰',
                    종가: '9999999',
                    상장주식수: '1',
                    당기순이익: '999999999999',
                    유동자산: '999999999999',
                    부채총계: '0',
                    거래량: '💖',
                    bsnsDate: '99991214',
                };
                const dictNew = { ...dictOrigin, 슈뷰: easterEgg };

                return dictNew;
            }

            const dictNewFinancialInfoAll = addEasterEgg(changeStockCompanyName(financialInfoAll, '현대자동차', '현대차'));

            const dictFinancialMarketInfo = {};
            Object.values(dictNewFinancialInfoAll).forEach(
                (stockCompany) => {
                    dictFinancialMarketInfo[stockCompany['종목명']] = {
                        active: false,
                        prevMarketInfo: {
                            bsnsDate: marketInfoPrev['date'],
                            ...marketInfoPrev['data'][stockCompany['종목명']]
                        },
                        bsnsDate: marketInfoLatest['date'],
                        ...financialInfoAll[stockCompany['종목명']],
                        ...marketInfoLatest['data'][stockCompany['종목명']]
                    }
                }
            );

            setLatestStockCompanyInfo(dictFinancialMarketInfo);
        }
    }, [financialInfoAll, marketInfoList.marketInfoLatest]);

    React.useEffect(() => {
        if (!!latestStockCompanyInfo) {
            setDictFilteredStockCompanyInfo(strategyNCAV(latestStockCompanyInfo));
        }
    }, [latestStockCompanyInfo]);

    React.useEffect(() => {
        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        if ((!!!loginStatus) && (stockCompanyChangeCount > getRandomInt(3, 5))) {
            alert('종목관리를 하려면 로그인 하세요.');
            setStockCompanyChangeCount(0);

            // TODO: 로그인 화면 이동.
        }
    }, [stockCompanyChangeCount]);

    function clickedRecentlyViewedStock(stockCompanyName) {
        // console.log(`%c clickedRecentlyViewedStock ${stockCompanyName}`, `color : blue; background : white`)

        handleSearchStockCompanyInfo(stockCompanyName);
        setSearchPanelIsOpened(true);
    }

    function handleSearchStockCompanyInfo(stockCompanyName) {
        // console.log(`%c handleSearchStockCompanyInfo 1 ${stockCompanyName}`, `color : blue; background : white`)
        const marketInfoPrevIndex = marketInfoList.length - 2;
        const marketInfoPrev = marketInfoList[marketInfoPrevIndex];
        const marketInfoLatestIndex = marketInfoList.length - 1;
        const marketInfoLatest = marketInfoList[marketInfoLatestIndex];

        setSearchingList('');

        const stockCompanyInfo = dictFilteredStockCompanyInfo[stockCompanyName] || latestStockCompanyInfo[stockCompanyName];
        if (!stockCompanyInfo || Object.keys(stockCompanyInfo).length == 0) {
            setInputPlaceholder(`검색 결과가 없습니다.`);
            setSearchResult({});
            return;
        }

        let newInputPlaceholder = `'${stockCompanyName}' 의 시총: ${Util.UnitConversion(stockCompanyInfo['시가총액'], true)}`;

        setInputValue('');
        setInputPlaceholder(newInputPlaceholder);

        const newDictFilteredStockCompanyInfo = { ...dictFilteredStockCompanyInfo };
        if (!newDictFilteredStockCompanyInfo[stockCompanyName]) {
            newDictFilteredStockCompanyInfo[stockCompanyName] = stockCompanyInfo;
        }

        const newArray = Object.values(newDictFilteredStockCompanyInfo);
        const sortedArray = newArray.sort((a, b) => {
            let fairPriceA = Number((Number(a['유동자산']) - Number(a['부채총계'])) / Number(a['상장주식수'])).toFixed(0);
            let ratioA = Number(fairPriceA / Number(a['종가']));

            let fairPriceB = Number((Number(b['유동자산']) - Number(b['부채총계'])) / Number(b['상장주식수'])).toFixed(0);
            let ratioB = Number(fairPriceB / Number(b['종가']));

            return ratioB.toFixed(3) - ratioA.toFixed(3);
        });

        const newFilteredStockCompanyList = [];
        const dictFinancialMarketInfo = {};
        sortedArray.forEach((stockCompany) => {
            const curStockCompanyName = stockCompany['종목명'];

            newFilteredStockCompanyList.push(curStockCompanyName);
            dictFinancialMarketInfo[curStockCompanyName] = {
                active: curStockCompanyName == stockCompanyName,
                bsnsDate: marketInfoLatest['date'],
                ...financialInfoAll[curStockCompanyName],
                ...marketInfoLatest['data'][curStockCompanyName],
                prevMarketInfo:
                {
                    ...marketInfoPrev['data'][curStockCompanyName],
                    bsnsDate: marketInfoPrev['date']
                }
            }
        });

        if (newFilteredStockCompanyList.length != Object.keys(dictFilteredStockCompanyInfo).length) {
            setStockCompanyChangeCount((prev) => (prev + 1));
        }

        setSearchResult(stockCompanyInfo);

        setDictFilteredStockCompanyInfo(dictFinancialMarketInfo);

        // update recentlyViewedStocksList
        let newRecentlyViewedStocksList = [...recentlyViewedStocksList];
        for (let i = 0; i < newRecentlyViewedStocksList.length; ++i) {
            if (stockCompanyName != newRecentlyViewedStocksList[i].stockName) {
                continue;
            }

            newRecentlyViewedStocksList.splice(i, 1);
            break;
        }
        if (newRecentlyViewedStocksList.length >= 10) {
            newRecentlyViewedStocksList.pop();
        }

        newRecentlyViewedStocksList = [{ stockName: stockCompanyName }, ...newRecentlyViewedStocksList];
        setRecentlyViewedStocksList(newRecentlyViewedStocksList);
    }

    React.useEffect(() => {
        function RequestLogin(id) {
            const url = `https://idiotquant-backend.tofu89223.workers.dev`;
            const port = `443`;
            const subUrl = `login`;
            fetch(`${url}:${port}/${subUrl}?id=${id}`)
                .then(res => {
                    if (res.ok) {
                        return res.json();
                    }
                })
                .then(data => {
                    setLoginStatus(data);

                    localStorage.setItem('kakaoId', router.query.id);

                    console.log(`localStorage.getItem`, localStorage.getItem('kakaoId'));
                })
                .catch(error => {
                    console.log(`error`, error);
                });
        }

        const kakaoId = localStorage.getItem('kakaoId');
        if (!!router.query.id) {
            RequestLogin(router.query.id);
        }
        else if (!!kakaoId) {
            // token 확인
            const token = localStorage.getItem('token');

            console.log(`token`, token);

            // kakao server 에 token 유효한지 확인?
            if (true) {
                RequestLogin(kakaoId);
            }
        }
    }, []);

    function deleteStockCompanyInList(stockCompanyName) {
        let newFilteredStockCompanyList = (Object.values(dictFilteredStockCompanyInfo)).filter(item => item['종목명'] != stockCompanyName);
        if (newFilteredStockCompanyList.length != Object.keys(dictFilteredStockCompanyInfo).length) {
            setStockCompanyChangeCount((prev) => (prev + 1));
        }

        let newDict = {}
        newFilteredStockCompanyList.forEach(item => { newDict[item['종목명']] = item });
        setDictFilteredStockCompanyInfo(newDict);
    }

    function getSearchingList(inputValue) {
        let array = Object.values(financialInfoAll);
        let filteredArray = array.filter(item => !!inputValue && String(item['종목명']).toUpperCase()?.includes(String(inputValue).toUpperCase()));
        let slicedArray = filteredArray.slice(0, 10);

        setInputValue(inputValue);
        setSearchingList(slicedArray);
    }

    function spliceRecentlyViewedStocksList(stockName) {
        let newRecentlyViewedStocksList = [...recentlyViewedStocksList];
        for (let i = 0; i < newRecentlyViewedStocksList.length; ++i) {
            if (stockName != newRecentlyViewedStocksList[i].stockName) {
                continue;
            }

            newRecentlyViewedStocksList.splice(i, 1);
            break;
        }

        setRecentlyViewedStocksList(newRecentlyViewedStocksList);
    }

    // sm	640px	@media (min-width: 640px) { ... }
    // md	768px	@media (min-width: 768px) { ... }
    // lg	1024px	@media (min-width: 1024px) { ... }
    // xl	1280px	@media (min-width: 1280px) { ... }
    // 2xl	1536px	@media (min-width: 1536px) { ... }
    return (
        <div className="flex">
            <div className='bg-gray-200 w-full sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2 2xl:w-1/2'>
                <Head>
                    <title>한국주식 퀀트 필터링 종목추천 | 투자 전략</title>
                    <link rel="icon" href="/images/icons8-algorithm-flatart-icons-lineal-color-32.png" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
                    <meta name="description" content="한국주식에 대한 퀀트적인 분석과 필터링을 통해 적합한 종목을 추천하는 웹 페이지입니다. 효율적인 퀀트 투자 전략을 기반으로 한국 주식 시장에서 가치 있는 투자 대상을 찾아드립니다." />
                </Head>
                <NavbarDefault
                    openNav={openNav}
                    setOpenNav={setOpenNav}

                    openCalculator={openCalculator}
                    setOpenCalculator={setOpenCalculator}

                    setSearchPanelIsOpened={setSearchPanelIsOpened}
                    searchPanelIsOpened={searchPanelIsOpened}
                    handleSearchStockCompanyInfo={handleSearchStockCompanyInfo}
                    searchResult={searchResult}
                    inputValue={inputValue}
                    inputPlaceholder={inputPlaceholder}

                    // new state
                    marketInfoList={marketInfoList}

                    dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}

                    getSearchingList={getSearchingList}
                    searchingList={searchingList}

                    authorizeCode={authorizeCode}
                    accessToken={accessToken}
                    loginStatus={loginStatus}

                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}


                    recentlyViewedStocksList={recentlyViewedStocksList}
                    setRecentlyViewedStocksList={setRecentlyViewedStocksList}
                />

                <TitlePanel searchPanelIsOpened={searchPanelIsOpened} />
                <RecentlyViewedStocks
                    searchPanelIsOpened={searchPanelIsOpened}

                    recentlyViewedStocksList={recentlyViewedStocksList}
                    latestStockCompanyInfo={latestStockCompanyInfo}
                    spliceRecentlyViewedStocksList={spliceRecentlyViewedStocksList}

                    clickedRecentlyViewedStock={clickedRecentlyViewedStock}
                />
                <div className='sm:hidden md:hidden lg:hidden xl:hidden 2xl:hidden'>
                    <DescriptionPanel
                        loginStatus={loginStatus}
                        searchPanelIsOpened={searchPanelIsOpened}
                        setSearchPanelIsOpened={setSearchPanelIsOpened}

                        strategyInfo={strategyInfo}

                        latestStockCompanyInfo={latestStockCompanyInfo}
                        setDictFilteredStockCompanyInfo={setDictFilteredStockCompanyInfo}

                        selectedStrategy={selectedStrategy}
                        setSelectedStrategy={setSelectedStrategy}

                        setStrategyInfo={setStrategyInfo}

                        handleSearchStockCompanyInfo={handleSearchStockCompanyInfo}

                        dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}
                        searchResult={searchResult}
                        searchingList={searchingList}

                        marketInfoList={marketInfoList}

                        deleteStockCompanyInList={deleteStockCompanyInList}

                        clickedRecentlyViewedStock={clickedRecentlyViewedStock}
                    />
                </div>
            </div>
            <div className='hidden sm:block sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2 2xl:w-1/2'>
                <DescriptionPanel
                    loginStatus={loginStatus}

                    searchPanelIsOpened={false}
                    setSearchPanelIsOpened={setSearchPanelIsOpened}

                    strategyInfo={strategyInfo}

                    latestStockCompanyInfo={latestStockCompanyInfo}
                    setDictFilteredStockCompanyInfo={setDictFilteredStockCompanyInfo}

                    selectedStrategy={selectedStrategy}
                    setSelectedStrategy={setSelectedStrategy}

                    setStrategyInfo={setStrategyInfo}

                    searchStockCompanyInfo={handleSearchStockCompanyInfo}

                    dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}
                    searchResult={searchResult}

                    marketInfoList={marketInfoList}

                    deleteStockCompanyInList={deleteStockCompanyInList}

                    clickedRecentlyViewedStock={clickedRecentlyViewedStock}
                /></div>
        </div>
    );
}
