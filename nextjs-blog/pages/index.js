import React from "react";
import Table from "../components/Table.js"
import Calculator from "../components/Calculator.js"
import Search from "../components/Search.js"
import CustomCard from "../components/CustomCard.js"
import { strategyNCAV } from "../components/Strategy.js";
import Link from "next/link.js";
import Head from "next/head.js";
import Script from "next/script.js";
import { Util } from "../components/Util.js";
import { Select, Option } from "@material-tailwind/react";

import Oauth from "../components/Oauth.js";
import Title from "../components/Title.js";
import { useRouter } from "next/router.js";

// export async function getServerSideProps(context) {
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
    const marketInfoLatest = await fetchAndSet('stock/market-info?date=20230825');
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
    marketInfoList.push(marketInfoLatest);

    return {
        props: {
            // props for your component
            marketInfoList,
            financialInfoAll,
        },
    };
}

// async function RequestToken(_authorizeCode) {
//     const rest_api_key = '25079c20b5c42c7b91a72308ef5c4ad5';
//     const redirect_uri = 'https://idiotquant.com';

//     const postData = {
//         grant_type: 'authorization_code',
//         client_id: rest_api_key,
//         redirect_uri: encodeURIComponent(redirect_uri),
//         code: _authorizeCode,
//     };

//     console.log(`postData`, postData);
//     // console.log(`new URLSearchParams(postData)`, new URLSearchParams(postData));
//     console.log(`new URLSearchParams(postData).toString()`, new URLSearchParams(postData).toString());
//     const requestOptions = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//         },
//         // body: `grant_type=authorization_code&client_id=${rest_api_key}&redirect_uri=${redirect_uri}&code=${_authorizeCode}`,
//         body: new URLSearchParams(postData).toString(),
//     };

//     console.log(`requestOptions`, requestOptions);

//     await fetch("https://kauth.kakao.com/oauth/token", requestOptions)
//         .then(res => {
//             console.log('post res:', res);
//             if (res.ok) {
//                 return res.text();
//             } else {
//                 throw new Error('Request failed');
//             }
//         })
//         .then(body => {
//             console.log('post body:', body);
//             console.log(`body.access_token`, body.access_token);
//             console.log(`JSON.parse(body).access_token`, JSON.parse(body).access_token);
//             // setAccessToken(JSON.parse(body).access_token);
//         })
// }

export default function QuantPost({
    marketInfoList,
    financialInfoAll,
}) {
    const router = useRouter();

    // state
    const [inputValue, setInputValue] = React.useState('');
    const [inputPlaceholder, setInputPlaceholder] = React.useState('');
    const [searchResult, setSearchResult] = React.useState('');

    const [latestStockCompanyInfo, setLatestStockCompanyInfo] = React.useState('');

    const [openSearchResult, setOpenSearchResult] = React.useState(false);
    const [openCalculator, setOpenCalculator] = React.useState(false);

    const [dictFilteredStockCompanyInfo, setDictFilteredStockCompanyInfo] = React.useState('');

    const [stockCompanyChangeCount, setStockCompanyChangeCount] = React.useState(0);

    const [scrollEffect, setScrollEffect] = React.useState(false);

    const [strategyTitle, setStrategyTitle] = React.useState(`NCAV 전략`);
    const [strategyDescription, setStrategyDescription] = React.useState(`"순유동자산 > 시가총액" 인 종목 추천합니다.`);
    const [prevInfo, setPrevInfo] = React.useState('');

    const [searchingList, setSearchingList] = React.useState('');

    const [selectedStrategy, setSelectedStrategy] = React.useState('ncav');

    const [ip, setIp] = React.useState('');
    const [authorizeCode, setAuthorizeCode] = React.useState('');
    const [accessToken, setAccessToken] = React.useState('');
    const [loginStatus, setLoginStatus] = React.useState('');

    function changeStockCompanyName(dictOrigin, srcName, dstName) {
        const { [srcName]: srcCompanyInfo, ...rest } = dictOrigin;
        rest[dstName] = { ...srcCompanyInfo, '종목명': dstName };

        return rest;
    }

    function strategyExample() {
        if (!!prevInfo) {
            setDictFilteredStockCompanyInfo(prevInfo);
            setPrevInfo('');

            setStrategyTitle(`NCAV 전략`);
            setStrategyDescription(`"순유동자산 > 시가총액" 인 종목 추천합니다.`);

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

        setStrategyTitle('소형주 + 저 PBR + 저 PER');
        setStrategyDescription('아직 TEST 중입니다');
    }

    React.useEffect(() => {
        const matkerInfoLatestIndex = marketInfoList.length - 1;
        const marketInfoLatest = marketInfoList[matkerInfoLatestIndex];

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

        if ((!!!authorizeCode) && (stockCompanyChangeCount > getRandomInt(3, 5))) {
            alert('종목관리를 하려면 로그인 하세요.');
            setStockCompanyChangeCount(0);

            // TODO: 로그인 화면 이동.
        }
    }, [stockCompanyChangeCount]);

    function searchStockCompanyInfo(stockCompanyName) {
        const matkerInfoLatestIndex = marketInfoList.length - 1;
        const marketInfoLatest = marketInfoList[matkerInfoLatestIndex];

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

    React.useEffect(() => {
        console.log(`router.query`, router.query);
        if (!!router.query.id) {
            const url = `https://idiotquant-backend.tofu89223.workers.dev`;
            const port = `443`;
            const subUrl = `login`;
            fetch(`${url}:${port}/${subUrl}?id=${router.query.id}`)
                .then(res => {
                    if (res.ok) {
                        return res.json();
                    }
                })
                .then(data => {
                    setLoginStatus(data);
                })
                .catch(error => {
                    console.log(`error`, error);
                });
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

    const SubTitle = () => {
        function handleChange(selected) {
            // console.log(`handleChange`, selected);
            switch (selected) {
                case 'ncav':
                    strategyExample();
                    break;
                case '2':
                    strategyExample();
                    break;
            }

            setSelectedStrategy(selected);
        }

        return (
            <div className='sm:px-20 md:px-40 lg:px-64 xl:px-80 2xl:px-96'>
                <div className="w-full p-1">
                    <Select color='green' label="종목 선택 방법" onChange={(selected) => handleChange(selected)} value={selectedStrategy}>
                        <Option value='ncav'>NCAV</Option>
                        <Option value='2'>소형주 + 저 PBR + 저 PER</Option>
                    </Select>
                </div>
                <div>
                    <CustomCard
                        title={strategyTitle}
                        description={strategyDescription}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className='bg-white sm:bg-gray-50'>
            <Head>
                <title>퀀트 종목 추천</title>
                <link rel="icon" href="/images/icons8-algorithm-flatart-icons-lineal-color-32.png" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0,user-scalable=0" />
            </Head>
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6995198721227228"
                crossorigin="anonymous"
                strategy="lazyOnload"
                onLoad={() =>
                    console.log(`script loaded correctly, window.FB has been populated`)
                }
            />
            <Title />
            <SubTitle />
            <div className="relative">
                <Oauth
                    authorizeCode={authorizeCode}
                    accessToken={accessToken}
                    scrollEffect={scrollEffect}
                    openSearchResult={openSearchResult}
                    loginStatus={loginStatus}
                />
                <Link href="./calculator">
                    <Calculator
                        scrollEffect={scrollEffect}

                        openCalculator={openCalculator}
                        setOpenCalculator={setOpenCalculator}

                        openSearchResult={openSearchResult}
                    />
                </Link>
                <Search
                    setOpenSearchResult={setOpenSearchResult}
                    searchStockCompanyInfo={searchStockCompanyInfo}
                    searchResult={searchResult}
                    inputValue={inputValue}
                    inputPlaceholder={inputPlaceholder}

                    // new state
                    marketInfoList={marketInfoList}

                    dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}

                    openSearchResult={openSearchResult}

                    getSearchingList={getSearchingList}
                    searchingList={searchingList}
                    scrollEffect={scrollEffect}
                />
                <div className='pb-80 w-full'>
                    <Table
                        searchStockCompanyInfo={searchStockCompanyInfo}
                        setOpenSearchResult={setOpenSearchResult}

                        dictFilteredStockCompanyInfo={dictFilteredStockCompanyInfo}
                        searchResult={searchResult}

                        marketInfoList={marketInfoList}

                        deleteStockCompanyInList={deleteStockCompanyInList}

                        scrollEffect={scrollEffect}
                    />
                </div>
            </div>
        </div>
    );
}