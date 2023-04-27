import React from "react";
import Table from "../../components/Table.js"
import Calculator from "../../components/Calculator.js"
import Search from "../../components/Search.js"
import Card from "../../components/Card.js"
import { strategyNCAV } from "../../components/Strategy.js";
import Link from "next/link.js";
import { Util } from "../../components/Util.js";

export default function QuantPost() {
    // state
    const [inputValue, setInputValue] = React.useState('');
    const [inputPlaceholder, setInputPlaceholder] = React.useState('');
    const [searchResult, setSearchResult] = React.useState('');

    const [marketInfo20181214, setMarketInfo20181214] = React.useState('');
    const [marketInfo20191213, setMarketInfo20191213] = React.useState('');
    const [marketInfo20201214, setMarketInfo20201214] = React.useState('');
    const [marketInfo20211214, setMarketInfo20211214] = React.useState('');
    const [marketInfo20221214, setMarketInfo20221214] = React.useState('');
    const [marketInfo20230111, setMarketInfo20230111] = React.useState('');
    const [marketInfoLatest, setMarketInfoLatest] = React.useState('');

    const [financialInfoAll, setFinancialInfoAll] = React.useState('');

    const [latestStockCompanyInfo, setLatestStockCompanyInfo] = React.useState('');

    const [openSearchResult, setOpenSearchResult] = React.useState(false);
    const [openCalculator, setOpenCalculator] = React.useState(false);

    const [dictFilteredStockCompanyInfo, setDictFilteredStockCompanyInfo] = React.useState('');

    const [stockCompanyChangeCount, setStockCompanyChangeCount] = React.useState(0);

    const [scrollEffect, setScrollEffect] = React.useState(false);

    const [informationTitle, setInformationTitle] = React.useState(`퀀트 종목 추천`);
    const [informationDescription, setInformationDescription] = React.useState(`"순유동자산 > 시가총액" 인 종목 추천합니다.`);
    const [prevInfo, setPrevInfo] = React.useState('');

    const [searchingList, setSearchingList] = React.useState('');

    React.useEffect(() => {
        // fetch
        function fetchAndSet(subUrl, state, setter, useSessionStorage = false) {
            let needUpdateState = true;
            // if (true === useSessionStorage) {
            //     let item = window.sessionStorage.getItem(state);

            //     needUpdateState = !JSON.parse(item);
            // }

            if (false === needUpdateState) {
                return;
            }

            const url = `https://idiotquant-backend.tofu89223.workers.dev`;
            const port = `443`;
            fetch(`${url}:${port}/${subUrl}`)
                .then(function (response) {
                    return response.json();
                })
                .then(function (json) {
                    setter(json);
                });
        }

        let useSessionStorage = false;

        fetchAndSet('stock/market-info?date=20181214', 'marketInfo20181214', setMarketInfo20181214, useSessionStorage);
        fetchAndSet('stock/market-info?date=20191213', 'marketInfo20191213', setMarketInfo20191213, useSessionStorage);
        fetchAndSet('stock/market-info?date=20201214', 'marketInfo20201214', setMarketInfo20201214, useSessionStorage);
        fetchAndSet('stock/market-info?date=20211214', 'marketInfo20211214', setMarketInfo20211214, useSessionStorage);
        fetchAndSet('stock/market-info?date=20221214', 'marketInfo20221214', setMarketInfo20221214, useSessionStorage);
        fetchAndSet('stock/market-info?date=20230111', 'marketInfo20230111', setMarketInfo20230111, useSessionStorage);
        fetchAndSet('stock/market-info?date=20230426', 'marketInfoLatest', setMarketInfoLatest, useSessionStorage);
        fetchAndSet('stock/financial-info', 'financialInfoAll', setFinancialInfoAll, useSessionStorage);

        // setTimeout(() => window.scrollTo(0, 0), 1000);

        // window.addEventListener("scroll", () => setScrollEffect(false === scrollEffect && window.scrollY >= 80));

        // return () => {
        //     window.removeEventListener("scroll", onScroll);
        // };
    }, []);

    function changeStockCompanyName(dictOrigin, srcName, dstName) {
        const { [srcName]: srcCompanyInfo, ...rest } = dictOrigin;
        rest[dstName] = { ...srcCompanyInfo, '종목명': dstName };

        return rest;
    }

    function strategyExample() {
        if (!!prevInfo) {
            setDictFilteredStockCompanyInfo(prevInfo);
            setPrevInfo('');

            setInformationTitle(`퀀트 종목 추천`);
            setInformationDescription(`"순유동자산 > 시가총액" 인 종목 추천합니다.`);

            return;
        }

        let arrFinancialMarketInfo = Array.from(Object.values(latestStockCompanyInfo));

        function filtering(array, key) {
            return array.filter(item => !!item[key] && 0 < Number(item[key]));
        }
        arrFinancialMarketInfo = filtering(arrFinancialMarketInfo, 'PBR');
        arrFinancialMarketInfo = filtering(arrFinancialMarketInfo, '거래량');
        arrFinancialMarketInfo = filtering(arrFinancialMarketInfo, 'EPS');

        // 항목 추가
        arrFinancialMarketInfo.forEach(item => item['score'] = 0);
        function setScore(array) {
            let score = 0;

            array.forEach(item => item['score'] += (++score));

            return array;
        }

        // sort(PBR)
        let arraySorted1 = new Array(...arrFinancialMarketInfo);
        arraySorted1.sort(function (a, b) {
            return Number(a['PBR']) - Number(b['PBR']);
        });
        setScore(arraySorted1);

        // sort(capital)
        let arraySorted2 = new Array(...arraySorted1);
        arraySorted2.sort(function (a, b) {
            return Number(a['시가총액']) - Number(b['시가총액']);
        });
        setScore(arraySorted2);
        // 시가총액 하위 20% cut-line
        const cutLine = Number(arraySorted2.length * 0.2).toFixed(0);
        // console.log(`cut-line(${cutLine}) 시가총액: ${Util.UnitConversion(arraySorted2[cutLine]['시가총액'], true)}, `, arraySorted2[cutLine]);

        // sort(PER)
        let arraySorted3 = new Array(...arraySorted2);
        arraySorted3.sort(function (a, b) {
            return Number(a['PER']) - Number(b['PER']);
        });
        setScore(arraySorted3);

        // sort(score)
        let arraySorted4 = new Array(...arraySorted3);
        arraySorted4.sort(function (a, b) {
            return Number(a['score']) - Number(b['score']);
        });

        const arrSelectedStockCompany = arraySorted4.slice(0, 40);

        const dictFinancialMarketInfo = {};
        arrSelectedStockCompany.forEach((stockCompany) => dictFinancialMarketInfo[stockCompany['종목명']] = stockCompany);

        setPrevInfo(dictFilteredStockCompanyInfo);
        setDictFilteredStockCompanyInfo(dictFinancialMarketInfo);

        setInformationTitle('HIDDEN');
        setInformationDescription('새로운 종목을 뽑습니다. 아직 TEST 중입니다');
    }

    React.useEffect(() => {
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
                        bsnsDate: marketInfoLatest['date'],
                        ...financialInfoAll[stockCompany['종목명']],
                        ...marketInfoLatest['data'][stockCompany['종목명']]
                    }
                }
            );

            setLatestStockCompanyInfo(dictFinancialMarketInfo);
        }
    }, [financialInfoAll, marketInfoLatest]);

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

        if (stockCompanyChangeCount > getRandomInt(3, 5)) {
            alert('종목관리를 하려면 로그인 하세요.');
            setStockCompanyChangeCount(0);

            // TODO: 로그인 화면 이동.
        }
    }, [stockCompanyChangeCount]);

    function searchStockCompanyInfo(stockCompanyName) {
        setSearchingList('');

        const stockCompanyInfo = dictFilteredStockCompanyInfo[stockCompanyName] || latestStockCompanyInfo[stockCompanyName];
        if (!stockCompanyInfo || Object.keys(stockCompanyInfo).length == 0) {
            setInputPlaceholder(`검색 결과가 없습니다.`);
            setSearchResult({});
            return;
        }

        setSearchResult(stockCompanyInfo);

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
            dictFinancialMarketInfo[curStockCompanyName] = { active: curStockCompanyName == stockCompanyName, bsnsDate: marketInfoLatest['date'], ...financialInfoAll[curStockCompanyName], ...marketInfoLatest['data'][curStockCompanyName] }
        });

        if (newFilteredStockCompanyList.length != Object.keys(dictFilteredStockCompanyInfo).length) {
            setStockCompanyChangeCount((prev) => (prev + 1));
        }

        setDictFilteredStockCompanyInfo(dictFinancialMarketInfo);
    }

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
    const Title = () => {
        return (
            <Link href="./terms">
                <div className="font-serif text-2xl text-white bg-black header-contents text-center">
                    IDIOT<span className='text-yellow-300'>.</span>QUANT
                </div>
            </Link>
        );
    };
    const Information = (props) => {
        return (
            <div className='pt-5 bg-black' onClick={() => props.strategyExample()}>
                <Card title={props.informationTitle} description={props.informationDescription} />
            </div>
        );
    };
    return (
        <div>
            <Title />
            <Information
                informationTitle={informationTitle}
                informationDescription={informationDescription}
                strategyExample={strategyExample} />
            <div className="bg-black relative sm:grid sm:grid-cols-2 sm:gap-4 sm:place-items-center md:grid md:grid-cols-2 md:gap-4 md:place-items-center md:px-10">
                <div className="pb-80 sm:overflow-y-auto sm:h-screen md:overflow-y-auto md:h-screen w-full">
                    <Table
                        searchStockCompanyInfo={searchStockCompanyInfo}
                        setOpenSearchResult={setOpenSearchResult}

                        dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}
                        searchResult={searchResult}

                        marketInfo20181214={marketInfo20181214}
                        marketInfo20191213={marketInfo20191213}
                        marketInfo20201214={marketInfo20201214}
                        marketInfo20211214={marketInfo20211214}
                        marketInfo20221214={marketInfo20221214}
                        marketInfo20230111={marketInfo20230111}
                        marketInfoLatest={marketInfoLatest}

                        deleteStockCompanyInList={deleteStockCompanyInList}

                        scrollEffect={scrollEffect}
                    />

                </div>
                <Calculator
                    scrollEffect={scrollEffect}

                    openCalculator={openCalculator}
                    setOpenCalculator={setOpenCalculator}

                    openSearchResult={openSearchResult}
                />
                <Search
                    setOpenSearchResult={setOpenSearchResult}
                    searchStockCompanyInfo={searchStockCompanyInfo}
                    searchResult={searchResult}
                    inputValue={inputValue}
                    inputPlaceholder={inputPlaceholder}

                    // new state
                    marketInfo20181214={marketInfo20181214}
                    marketInfo20191213={marketInfo20191213}
                    marketInfo20201214={marketInfo20201214}
                    marketInfo20211214={marketInfo20211214}
                    marketInfo20221214={marketInfo20221214}
                    marketInfo20230111={marketInfo20230111}
                    marketInfoLatest={marketInfoLatest}

                    dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}

                    openSearchResult={openSearchResult}

                    getSearchingList={getSearchingList}
                    searchingList={searchingList}
                    scrollEffect={scrollEffect}
                />
            </div>
        </div>
    );
}