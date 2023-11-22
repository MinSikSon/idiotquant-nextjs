import React from "react";
import Head from "next/head.js";
import { Util } from "../components/Util.js";

import { useRouter } from "next/router.js";
import DescriptionPanel from "../components/DescriptionPanel.js";

import { GetArrayFilteredByStrategyExample, GetArrayFilteredByStrategyNCAV, strategyExample, strategyNCAV } from "../components/Strategy.js";
import RecentlyViewedStocks from "../components/RecentlyViewedStocks.js";
import TitlePanel from "../components/TitlePanel.js";
import NavigationPanel from "../components/NavigationPanel.js";
import StocksOfInterestPanel from "../components/StocksOfInterestPanel.js";
import NewGroupPanel from "../components/NewGroupPanel.js";
import AddStockInGroupPanel from "../components/AddStockInGroupPanel.js";
import DeleteGroupPanel from "../components/DeleteGroupPanel.js";

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

    const [openCalculator, setOpenCalculator] = React.useState(false);

    const [dictFilteredStockCompanyInfo, setDictFilteredStockCompanyInfo] = React.useState('');
    const [arrayFilteredStocksList, setArrayFilteredStocksList] = React.useState([]);

    const [stockCompanyChangeCount, setStockCompanyChangeCount] = React.useState(0);

    const [strategyInfo, setStrategyInfo] = React.useState({ title: 'NCAV 전략', description: '"순유동자산 > 시가총액" 인 종목 추천합니다.' });

    const [searchingList, setSearchingList] = React.useState(''); // 검색 도중 종목명 출력

    const [selectedStrategy, setSelectedStrategy] = React.useState('ncav');

    const [authorizeCode, setAuthorizeCode] = React.useState('');
    const [accessToken, setAccessToken] = React.useState('');
    const [loginStatus, setLoginStatus] = React.useState('');

    const [openNav, setOpenNav] = React.useState(true);

    const [openMenu, setOpenMenu] = React.useState(false);

    // RecentlyViewedStocks.js
    const [recentlyViewedStocksList, setRecentlyViewedStocksList] = React.useState([]);

    const [stocksOfInterest, setStocksOfInterest] = React.useState({
        selectedTab: 0,
        tabs: [
            {
                label: 'NCAV',
                value: 'ncav',
                stocks: [],
                desc: `"순유동자산(= 유동자산 - 부채총계)"이 "시가총액"을 넘어선 기업을 선정합니다. 이러한 기업은 안정성과 재무 건전성 면에서 우수하며, 투자자들에게 안전하고 안정적인 투자 기회를 제공할 수 있습니다. 그러나 투자는 항상 리스크를 동반하므로 신중한 분석이 필요하며 전문가의 조언을 검토하는 것을 권장합니다.`
            },
            {
                label: '소형주+저PBR+저PER',
                value: '저평가소형주',
                stocks: [],
                desc: "저평가된 소형주 투자를 고려하는 퀀트 전략 중 하나로, 낮은 PBR (주가순자산가치비율)와 낮은 PER (주가이익비율)을 가진 종목을 탐색합니다. 이러한 종목은 현재 시장가치 대비 자산 및 수익이 낮게 평가되어 있을 가능성이 높아, 잠재적으로 미래 성장과 가치 상승의 기회를 제공할 수 있습니다. 하지만, 투자는 항상 리스크를 동반하므로 신중한 연구와 다양한 요인을 고려하는 것이 중요합니다."
            }
        ]
    });

    const [openedPanel, setOpenedPanel] = React.useState('');

    const [localInfo, setLocalInfo] = React.useState({ testCnt: 1, openedPanel: openedPanel, log: 'hihi' });

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

            const arrInitStocksList = GetArrayFilteredByStrategyNCAV(latestStockCompanyInfo);
            setArrayFilteredStocksList(arrInitStocksList);

            // TODO: strategyNCAV 결과로 그냥 종목명만 뽑아도 될거 같긴 한데? 정보를 너무 많이 담고 있음.
            stocksOfInterest.tabs[0].stocks = arrInitStocksList;

            const arrStrategyExample = GetArrayFilteredByStrategyExample(latestStockCompanyInfo);
            // console.log(`arrStrategyExample`, arrStrategyExample);
            stocksOfInterest.tabs[1].stocks = arrStrategyExample;

            // console.log(`stocksOfInterest`, stocksOfInterest);
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

    function clickedRecentlyViewedStock(clickedStockCompanyName) {
        // console.log(`clickedRecentlyViewedStock`, openedPanel);
        if ('' === openedPanel
            || 'SearchPanel' === openedPanel
            || 'StocksOfInterestPanel' === openedPanel
            || 'AddStockInGroupPanel' === openedPanel
        ) {
            handleSearchStockCompanyInfo(clickedStockCompanyName);

            setLocalInfo({ testCnt: localInfo.testCnt + 1, log: 'clickedRecentlyViewedStock' });
        }
    }

    function handleSearchStockCompanyInfo(clickedStockCompanyName) {
        if (openedPanel !== 'AddStockInGroupPanel') {
            setOpenedPanel('SearchPanel');
        }

        const marketInfoPrevIndex = marketInfoList.length - 2;
        const marketInfoPrev = marketInfoList[marketInfoPrevIndex];
        const marketInfoLatestIndex = marketInfoList.length - 1;
        const marketInfoLatest = marketInfoList[marketInfoLatestIndex];

        setSearchingList('');

        // console.log(`latestStockCompanyInfo`, latestStockCompanyInfo);
        const stockCompanyInfo = latestStockCompanyInfo[clickedStockCompanyName];
        if (!stockCompanyInfo || Object.keys(stockCompanyInfo).length == 0) {
            setInputPlaceholder(`검색 결과가 없습니다.`);
            setSearchResult({});
            return;
        }

        let newInputPlaceholder = `'${clickedStockCompanyName}' 의 시총: ${Util.UnitConversion(stockCompanyInfo['시가총액'], true)}`;

        setInputValue('');
        setInputPlaceholder(newInputPlaceholder);

        let duplicate = false;
        for (let i = 0; i < arrayFilteredStocksList.length; ++i) {
            if (arrayFilteredStocksList[i] == clickedStockCompanyName) {
                duplicate = true;
                break;
            }
        }
        if (duplicate == false) {
            arrayFilteredStocksList.push(clickedStockCompanyName);
        }

        const newArray = arrayFilteredStocksList;
        const sortedArray = newArray.sort((a, b) => {
            let fairPriceA = Number((Number(latestStockCompanyInfo[a]['유동자산']) - Number(latestStockCompanyInfo[a]['부채총계'])) / Number(latestStockCompanyInfo[a]['상장주식수'])).toFixed(0);
            let ratioA = Number(fairPriceA / Number(latestStockCompanyInfo[a]['종가']));

            let fairPriceB = Number((Number(latestStockCompanyInfo[b]['유동자산']) - Number(latestStockCompanyInfo[b]['부채총계'])) / Number(latestStockCompanyInfo[b]['상장주식수'])).toFixed(0);
            let ratioB = Number(fairPriceB / Number(latestStockCompanyInfo[b]['종가']));

            return ratioB.toFixed(3) - ratioA.toFixed(3);
        });

        const newFilteredStockCompanyList = [];
        const dictFinancialMarketInfo = {};
        sortedArray.forEach((stockCompanyName) => {
            newFilteredStockCompanyList.push(stockCompanyName);
            dictFinancialMarketInfo[stockCompanyName] = {
                active: stockCompanyName == clickedStockCompanyName,
                bsnsDate: marketInfoLatest['date'],
                ...financialInfoAll[stockCompanyName],
                ...marketInfoLatest['data'][stockCompanyName],
                prevMarketInfo:
                {
                    ...marketInfoPrev['data'][stockCompanyName],
                    bsnsDate: marketInfoPrev['date']
                }
            }
        });

        if (newFilteredStockCompanyList.length != Object.keys(dictFilteredStockCompanyInfo).length) {
            setStockCompanyChangeCount((prev) => (prev + 1));
        }

        setSearchResult(stockCompanyInfo);

        setDictFilteredStockCompanyInfo(dictFinancialMarketInfo);
        setArrayFilteredStocksList(newFilteredStockCompanyList);

        const newStrategy = stocksOfInterest;
        newStrategy.tabs[newStrategy.selectedTab].stocks = newFilteredStockCompanyList;
        setStocksOfInterest(newStrategy);

        setLocalInfo({ testCnt: localInfo.testCnt + 1, log: 'setDictFilteredStockCompanyInfo' });

        updateRecentlyViewdStocksList(clickedStockCompanyName);
    }

    function updateRecentlyViewdStocksList(stockCompanyName) {
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

    function handleClickStocksOfInterestButton() {
        setOpenedPanel('StocksOfInterestPanel');

        setLocalInfo({ testCnt: localInfo.testCnt + 1, isPanelOpened: true, log: 'handleClickStocksOfInterestButton' });
    }

    React.useEffect(() => {
        localStorage.setItem('localInfo', JSON.stringify(localInfo));
    }, [localInfo]);

    React.useEffect(() => {
        const oldLocalInfo = localStorage.getItem('localInfo');
        if (null == oldLocalInfo) {
            const newLocalInfo = localStorage.setItem('localInfo', JSON.stringify(localInfo));
            setLocalInfo(newLocalInfo);
        }
        else {
            const objLocalInfo = JSON.parse(oldLocalInfo);
            setLocalInfo(objLocalInfo);
            // console.log(`oldLocalInfo`, oldLocalInfo);
            // console.log(`objLocalInfo`, objLocalInfo);
        }

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
        setArrayFilteredStocksList(newFilteredStockCompanyList);

        setLocalInfo({ testCnt: localInfo.testCnt + 1, log: 'deleteStockCompanyInList' });
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

        setRecentlyViewedStocksList({ ...newRecentlyViewedStocksList });
    }

    function handleArrowUturnLeftIcon(e) {
        // console.log(`handleArrowUturnLeftIcon`, openedPanel);
        e.preventDefault();

        if ('AddStockInGroupPanel' === openedPanel) {
            setOpenedPanel('StocksOfInterestPanel');
            return;
        }

        setOpenedPanel('');

        setSearchResult({});
        setSearchingList({});
    }

    function handleStocksOfInterestChange(selected) {
        // console.log(`handleStocksOfInterestChange`, selected);
        // console.log(`stocksOfInterest.tabs`, stocksOfInterest.tabs);

        for (let i = 0; i < stocksOfInterest.tabs.length; ++i) {
            if (selected != stocksOfInterest.tabs[i].value) continue;

            const filteredStocksByStrategy = stocksOfInterest.tabs[i].stocks;
            const strategyInfo = { title: stocksOfInterest.tabs[i].label, description: stocksOfInterest.tabs[i].desc };

            const newStocksOfInterest = stocksOfInterest;
            newStocksOfInterest.selectedTab = i;
            // console.log(`newStocksOfInterest`, newStocksOfInterest);

            // console.log(`filteredStocksByStrategy`, filteredStocksByStrategy);
            setArrayFilteredStocksList(filteredStocksByStrategy);
            // setStrategyInfo(strategyInfo);
            // setSelectedStrategy(selected);
            setStocksOfInterest(newStocksOfInterest);
        }
    }

    function addNewStockGroup(groupName) {
        const newStocksOfInterest = stocksOfInterest;

        newStocksOfInterest.selectedTab = newStocksOfInterest.tabs.length;
        newStocksOfInterest.tabs.push(
            {
                label: groupName,
                value: groupName + newStocksOfInterest.tabs.length,
                stocks: [],
                desc: groupName,
                test: 'hihihi'
            }
        )

        setStocksOfInterest({ ...newStocksOfInterest });
        handleStocksOfInterestChange(groupName);
    }

    function addNewStocksOfInterest(stockName) {
        const newStocksOfInterest = stocksOfInterest;

        let duplicated = false;
        for (let i = 0; i < newStocksOfInterest.tabs[stocksOfInterest.selectedTab].stocks.length; ++i) {
            if (stockName == newStocksOfInterest.tabs[stocksOfInterest.selectedTab].stocks[i]) {
                duplicated = true;
                break;
            }
        }

        if (true == duplicated) {
            return;
        }

        newStocksOfInterest.tabs[stocksOfInterest.selectedTab].stocks.push('삼성전자');

        setStocksOfInterest({ ...newStocksOfInterest });
        updateRecentlyViewdStocksList(stockName);
    }

    function handleDeleteStockGroup(idx) {
        const newStocksOfInterest = stocksOfInterest;
        newStocksOfInterest.tabs.splice(idx, 1);
        newStocksOfInterest.selectedTab = 0;

        setStocksOfInterest({ ...newStocksOfInterest });
    }

    // sm	640px	@media (min-width: 640px) { ... }
    // md	768px	@media (min-width: 768px) { ... }
    // lg	1024px	@media (min-width: 1024px) { ... }
    // xl	1280px	@media (min-width: 1280px) { ... }
    // 2xl	1536px	@media (min-width: 1536px) { ... }

    if ('DeleteGroupPanel' === openedPanel) {
        return <DeleteGroupPanel
            openedPanel={openedPanel}
            setOpenedPanel={setOpenedPanel}

            stocksOfInterest={stocksOfInterest}

            handleDeleteStockGroup={handleDeleteStockGroup}
        />
    }

    if ('AddStockInGroupPanel' === openedPanel) {
        return (
            <>
                <AddStockInGroupPanel
                    openedPanel={openedPanel}
                    setOpenedPanel={setOpenedPanel}

                    handleSearchStockCompanyInfo={handleSearchStockCompanyInfo}
                    searchResult={searchResult}
                    inputValue={inputValue}
                    inputPlaceholder={inputPlaceholder}

                    marketInfoList={marketInfoList}

                    dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}

                    getSearchingList={getSearchingList}
                    searchingList={searchingList}

                    setSearchResult={setSearchResult}

                    handleArrowUturnLeftIcon={handleArrowUturnLeftIcon}
                />
                <RecentlyViewedStocks
                    openedPanel={openedPanel}

                    recentlyViewedStocksList={recentlyViewedStocksList}
                    latestStockCompanyInfo={latestStockCompanyInfo}
                    spliceRecentlyViewedStocksList={spliceRecentlyViewedStocksList}

                    clickedRecentlyViewedStock={clickedRecentlyViewedStock}

                    searchResult={searchResult}
                />
            </>
        );
    }

    return (
        <div className="flex">
            <div className='w-full sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2 2xl:w-1/2'>
                <Head>
                    <title>한국주식 퀀트 필터링 종목추천 | 투자 전략</title>
                    <link rel="icon" href="/images/icons8-algorithm-flatart-icons-lineal-color-32.png" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
                    <meta name="description" content="한국주식에 대한 퀀트적인 분석과 필터링을 통해 적합한 종목을 추천하는 웹 페이지입니다. 효율적인 퀀트 투자 전략을 기반으로 한국 주식 시장에서 가치 있는 투자 대상을 찾아드립니다." />
                </Head>
                {'NewGroupPanel' === openedPanel ?
                    <>
                        <NewGroupPanel
                            setOpenedPanel={setOpenedPanel}
                            addNewStockGroup={addNewStockGroup}
                        />
                    </>
                    :
                    <>
                        <NavigationPanel
                            openedPanel={openedPanel}
                            setOpenedPanel={setOpenedPanel}

                            openNav={openNav}
                            setOpenNav={setOpenNav}

                            openCalculator={openCalculator}
                            setOpenCalculator={setOpenCalculator}

                            handleSearchStockCompanyInfo={handleSearchStockCompanyInfo}
                            searchResult={searchResult}
                            inputValue={inputValue}
                            inputPlaceholder={inputPlaceholder}

                            // new state
                            dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}
                            arrayFilteredStocksList={arrayFilteredStocksList}
                            latestStockCompanyInfo={latestStockCompanyInfo}
                            marketInfoList={marketInfoList}

                            getSearchingList={getSearchingList}
                            searchingList={searchingList}

                            authorizeCode={authorizeCode}
                            accessToken={accessToken}
                            loginStatus={loginStatus}

                            openMenu={openMenu}
                            setOpenMenu={setOpenMenu}

                            recentlyViewedStocksList={recentlyViewedStocksList}
                            setRecentlyViewedStocksList={setRecentlyViewedStocksList}

                            setSearchResult={setSearchResult}

                            handleArrowUturnLeftIcon={handleArrowUturnLeftIcon}
                        />
                        {'' === openedPanel ?
                            <TitlePanel
                                setSearchResult={setSearchResult}
                            />
                            : <></>
                        }
                        {'' === openedPanel || 'SearchPanel' === openedPanel ?
                            <RecentlyViewedStocks
                                openedPanel={openedPanel}

                                recentlyViewedStocksList={recentlyViewedStocksList}
                                latestStockCompanyInfo={latestStockCompanyInfo}
                                spliceRecentlyViewedStocksList={spliceRecentlyViewedStocksList}

                                clickedRecentlyViewedStock={clickedRecentlyViewedStock}

                                searchResult={searchResult}
                            />
                            : <></>
                        }
                        {('StocksOfInterestPanel' === openedPanel) ?
                            <StocksOfInterestPanel
                                openedPanel={openedPanel}
                                setOpenedPanel={setOpenedPanel}

                                stocksOfInterest={stocksOfInterest}

                                handleStocksOfInterestChange={handleStocksOfInterestChange}

                                dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}

                                arrayFilteredStocksList={arrayFilteredStocksList}

                                latestStockCompanyInfo={latestStockCompanyInfo}
                                marketInfoList={marketInfoList}

                                deleteStockCompanyInList={deleteStockCompanyInList}

                                clickedRecentlyViewedStock={clickedRecentlyViewedStock}

                                addNewStocksOfInterest={addNewStocksOfInterest}
                            />
                            : <></>
                        }

                        {'' === openedPanel ?
                            <div className='sm:hidden md:hidden lg:hidden xl:hidden 2xl:hidden'>
                                <DescriptionPanel
                                    openedPanel={openedPanel}
                                    setOpenedPanel={setOpenedPanel}

                                    loginStatus={loginStatus}

                                    strategyInfo={strategyInfo}

                                    latestStockCompanyInfo={latestStockCompanyInfo}
                                    setDictFilteredStockCompanyInfo={setDictFilteredStockCompanyInfo}

                                    selectedStrategy={selectedStrategy}
                                    setSelectedStrategy={setSelectedStrategy}

                                    setStrategyInfo={setStrategyInfo}

                                    handleSearchStockCompanyInfo={handleSearchStockCompanyInfo}

                                    dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}
                                    arrayFilteredStocksList={arrayFilteredStocksList}
                                    marketInfoList={marketInfoList}

                                    searchResult={searchResult}
                                    searchingList={searchingList}

                                    clickedRecentlyViewedStock={clickedRecentlyViewedStock}

                                    stocksOfInterest={stocksOfInterest}
                                    setStocksOfInterest={setStocksOfInterest}
                                    localInfo={localInfo}
                                    setLocalInfo={setLocalInfo}

                                    handleClickStocksOfInterestButton={handleClickStocksOfInterestButton}

                                    handleStocksOfInterestChange={handleStocksOfInterestChange}
                                />
                            </div>
                            : <></>
                        }
                    </>
                }
            </div>
            {'' === openedPanel ?
                <div className='hidden sm:block sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2 2xl:w-1/2'>
                    <DescriptionPanel
                        openedPanel={openedPanel}
                        setOpenedPanel={setOpenedPanel}

                        loginStatus={loginStatus}

                        strategyInfo={strategyInfo}

                        setDictFilteredStockCompanyInfo={setDictFilteredStockCompanyInfo}

                        selectedStrategy={selectedStrategy}
                        setSelectedStrategy={setSelectedStrategy}

                        setStrategyInfo={setStrategyInfo}

                        searchStockCompanyInfo={handleSearchStockCompanyInfo}

                        dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}
                        arrayFilteredStocksList={arrayFilteredStocksList}
                        latestStockCompanyInfo={latestStockCompanyInfo}
                        marketInfoList={marketInfoList}

                        searchResult={searchResult}

                        clickedRecentlyViewedStock={clickedRecentlyViewedStock}

                        stocksOfInterest={stocksOfInterest}
                        setStocksOfInterest={setStocksOfInterest}

                        localInfo={localInfo}
                        setLocalInfo={setLocalInfo}

                        handleClickStocksOfInterestButton={handleClickStocksOfInterestButton}

                        handleStocksOfInterestChange={handleStocksOfInterestChange}
                    />
                </div>
                : <></>
            }
        </div>
    );
}
