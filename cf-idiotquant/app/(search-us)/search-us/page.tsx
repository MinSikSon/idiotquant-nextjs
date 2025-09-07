"use client"

import { useState, useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectLoginState } from "@/lib/features/login/loginSlice";
import { usePathname } from "next/navigation";
import { isValidCookie, Util } from "@/components/util";
import { getKoreaInvestmentUsMaretSearchInfo, getKoreaInvestmentUsMarketDailyPrice, KoreaInvestmentOverseasPriceDetail, KoreaInvestmentOverseasPriceDetailOutput, KoreaInvestmentOverseasPriceQuotationsDailyPrice, KoreaInvestmentOverseasPriceQuotationsInquireDailyChartPrice, KoreaInvestmentOverseasSearchInfo, KoreaInvestmentOverseasSearchInfoOutput, reqGetOverseasPriceQuotationsDailyPrice, reqGetQuotationsSearchInfo } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentUsMaretPriceDetail, reqGetQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentToken, KoreaInvestmentToken, reqGetInquireBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import SearchAutocomplete from "@/components/searchAutoComplete";

import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";
const all_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];
import Login from "@/app/(login)/login/login";
import Auth from "@/components/auth";
import { FmpBalanceSheetStatementType, reqGetFmpBalanceSheetStatement, selectFmpBalanceSheetStatement, selectFmpState } from "@/lib/features/fmpUsMarket/fmpUsMarketSlice";
import LineChart from "@/components/LineChart";
import { addUsMarketHistory, selectUsMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";
import { getFmpBalanceSheetStatement } from "@/lib/features/fmpUsMarket/fmpUsMarketAPI";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

const DEBUG = false;

export default function SearchUs() {
    const pathname = usePathname();
    const dispatch = useAppDispatch();

    const loginState = useAppSelector(selectLoginState);

    const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

    const kiUsMaretSearchInfo: KoreaInvestmentOverseasSearchInfo = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
    const kiUsMaretPriceDetail: KoreaInvestmentOverseasPriceDetail = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);
    const kiUsDailyPrice: KoreaInvestmentOverseasPriceQuotationsDailyPrice = useAppSelector(getKoreaInvestmentUsMarketDailyPrice);

    const fmpState: any = useAppSelector(selectFmpState);
    const fmpUsBalanceSheetStatement: FmpBalanceSheetStatementType[] = useAppSelector(selectFmpBalanceSheetStatement);

    // const [startDate, setStartDate] = useState<any>("2024-01-03");
    const [startDate, setStartDate] = useState<any>((new Date()).toISOString().split('T')[0]);
    // const [endDate, setEndDate] = useState<any>((new Date()).toISOString().split('T')[0]);

    const usMarketHistory = useAppSelector(selectUsMarketHistory);

    const [openNCAV, setOpenNCAV] = useState(false);
    const [openSRIM, setOpenSRIM] = useState(false);

    const [fixed, setFixed] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 160) {
                setFixed(true);
            } else {
                setFixed(false);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const formatDate = (date: string) => {
        // const arrDate = date.split("-");
        const YYYYMMDD = date.replaceAll("-", ""); // YYYYMMDD
        // console.log("YYYYMMDD", YYYYMMDD);

        return YYYYMMDD;
    }

    useEffect(() => {
        if (DEBUG) console.log(`[Search]`, `kiToken:`, kiToken);
        if (DEBUG) console.log(`[Search]`, `loginState:`, loginState);
        if ("cf" == loginState || "kakao" == loginState) {
            const isValidKiAccessToken = !!kiToken["access_token"];
            if (true == isValidKiAccessToken) {
                dispatch(reqGetInquireBalance(kiToken));
            }
        }
    }, [kiToken, loginState]);

    useEffect(() => {
        if (DEBUG) console.log(`useEffect [kiUsMaretSearchInfo]`, kiUsMaretSearchInfo);
    }, [kiUsMaretSearchInfo])
    useEffect(() => {
        if (DEBUG) console.log(`useEffect [kiUsMaretPriceDetail]`, kiUsMaretPriceDetail);
    }, [kiUsMaretPriceDetail])
    useEffect(() => {
        if (DEBUG) console.log(`useEffect [kiUsDailyPrice]`, kiUsDailyPrice);
    }, [kiUsDailyPrice])
    useEffect(() => {
        if (DEBUG) console.log(`useEffect [fmpState]`, fmpState);
    }, [fmpState])
    useEffect(() => {
        if (DEBUG) console.log(`useEffect [fmpUsBalanceSheetStatement]`, fmpUsBalanceSheetStatement);
        if (DEBUG) console.log(`useEffectObject.values(fmpUsBalanceSheetStatement)`, Object.values(fmpUsBalanceSheetStatement));

    }, [fmpUsBalanceSheetStatement])

    if (DEBUG) console.log(`kiUsMaretSearchInfo`, kiUsMaretSearchInfo);
    if (DEBUG) console.log(`kiUsMaretPriceDetail`, kiUsMaretPriceDetail);

    const [validCookie, setValidCookie] = useState<any>(false);
    useEffect(() => {
        setValidCookie(isValidCookie("koreaInvestmentToken"));
    }, []);

    // if ("init" == loginState || "rejected" == loginState || "pending" == loginState) {
    //     return <>
    //         <Login parentUrl={pathname} />
    //     </>;
    // }

    if (false == validCookie || false == !!kiToken["access_token"]) {
        return <>
            <Auth />
        </>
    }

    function onSearchButton(stockName: any) {
        if (DEBUG) console.log(`[onSearchButton]`, `stockName`, stockName);
        dispatch(reqGetQuotationsSearchInfo({ koreaInvestmentToken: kiToken, PDNO: stockName }));
        dispatch(reqGetQuotationsPriceDetail({ koreaInvestmentToken: kiToken, PDNO: stockName }));
        dispatch(reqGetOverseasPriceQuotationsDailyPrice({ koreaInvestmentToken: kiToken, PDNO: stockName, FID_INPUT_DATE_1: formatDate(startDate) }));
        // export const { reqGetOverseasPriceQuotationsInquireDailyChartPrice } = koreaInvestmentUsMarketSlice.actions;

        dispatch(reqGetFmpBalanceSheetStatement(stockName));

        dispatch(addUsMarketHistory(stockName));
    }

    if (!!!kiUsMaretSearchInfo.rt_cd && !!!kiUsMaretPriceDetail.rt_cd) {
        return <>
            <SearchAutocomplete placeHolder={"Please enter the stock ticker."} onSearchButton={onSearchButton} validCorpNameArray={all_tickers} />
            <div className="dark:bg-black h-lvh"></div>
        </>
    }

    const kiUsMaretSearchInfoOutput: KoreaInvestmentOverseasSearchInfoOutput = kiUsMaretSearchInfo.output;
    const kiUsMaretPriceDetailOutput: KoreaInvestmentOverseasPriceDetailOutput = kiUsMaretPriceDetail.output;

    function MdTableTemplate(props: any) {
        return <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore" }], rehypeHighlight]}
            components={{
                table: ({ node, ...props }) => (
                    <table className="dark:text-black w-full table-auto border-collapse shadow-lg rounded-lg overflow-hidden text-[0.6rem] sm:text-sm md:text-sm lg:text-sm" {...props} />
                ),
                th: ({ node, ...props }) => (
                    <th className="pl-1 py-1 bg-gradient-to-r from-gray-100 to-gray-200 font-semibold uppercase text-left border-b border-gray-300" {...props} />
                ),
                td: ({ node, ...props }) => (
                    <td className="pl-1 py-1 border-b border-gray-200 text-right" {...props} />
                ),
                tr: ({ node, ...props }) => {
                    const nodeChildren: any = node?.children[1];
                    const percentageCell: any = nodeChildren?.children[0]?.value;
                    let bgClass = "";
                    if (percentageCell) {
                        const num = parseFloat(percentageCell.replace("%", ""));
                        if (num > 0) bgClass = "bg-green-100";
                        else if (num < 0) bgClass = "bg-red-100";
                    }
                    return (
                        <tr
                            className={`${bgClass} hover:bg-gray-100 transition-colors duration-200`}
                            {...props}
                        />
                    );
                },
            }}
        >
            {props.md_main}
        </ReactMarkdown>
    }

    function getNcav(balanceSheetStatement: FmpBalanceSheetStatementType[], maretPriceDetail: any, ratioList: number[]) {
        const stck_oprc = Number(maretPriceDetail.output["last"] ?? 1); // 주식 시가2
        const lstn_stcn = Number(maretPriceDetail.output["shar"] ?? 1); // 상장 주수
        const cras = Number(balanceSheetStatement[0].totalCurrentAssets ?? 1); // 유동 자산
        const total_lblt = Number(balanceSheetStatement[0].totalLiabilities ?? 1); // 부채 총계

        // const value: number = (((cras - total_lblt) / (stck_oprc * lstn_stcn * ratio) - 1) * 100);
        // const target_price = (cras - total_lblt) / lstn_stcn;
        // const md = ratioList.map(ratio => {
        //     const target_price = (cras - total_lblt) / lstn_stcn;
        //     const percentage: number = (((cras - total_lblt) / (stck_oprc * lstn_stcn * ratio) - 1) * 100);
        //     return `|${ratio.toFixed(2)}|${percentage.toFixed(2)}%|${Number(target_price.toFixed(0)).toLocaleString()}|`;
        // }).join("\n");

        const md = ratioList.map(ratio => {
            const target_price = (cras - total_lblt) / lstn_stcn;
            const percentage: number = (((cras - total_lblt) / (stck_oprc * lstn_stcn * ratio) - 1) * 100);
            return `|${ratio.toFixed(2)}|${percentage.toFixed(2)}%|${Number(target_price.toFixed(0)).toLocaleString()}|`;
        }).join("\n");

        const md_main = String.raw`
| ratio (%) | Expected return(%) | Target price($) |
|-----------|--------------------|-----------------|
${md}
`;
        return <>
            <div className="w-full text-right p-4">
                <MdTableTemplate md_main={md_main} />
            </div>
        </>
    }

    let bShowResult = false;
    if (("fulfilled" == kiUsDailyPrice.state)
        && ("fulfilled" == fmpState)
        && ("fulfilled" == kiUsMaretSearchInfo.state)
    ) {
        bShowResult = true;
    }

    const texts = ["종가", "시가총액", "상장추식수"];
    const maxLength = Math.max(...texts.map(text => text.length * 2));
    if (DEBUG) console.log(`maxLength`, maxLength);
    return <>
        <div className="flex flex-col w-full">
            <div className={`${fixed ? "z-50 w-full fixed top-0 left-0 bg-white dark:bg-black" : "relative"}`}>
                <div className="flex flex-col w-full">
                    <SearchAutocomplete placeHolder={"Please enter the stock ticker."} onSearchButton={onSearchButton} validCorpNameArray={all_tickers} />
                    <div className="dark:bg-black flex px-4 gap-1 overflow-x-auto">
                        {usMarketHistory.map((stockName: string, index: number) => {
                            return (
                                <div key={index} className="dark:bg-black dark:text-white shadow border text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl px-1 py-0.5 transition-all duration-200 min-w-fit">
                                    <div className="text-xs">
                                        <button
                                            className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
                                            onClick={() => {
                                                onSearchButton(stockName);
                                            }}
                                        >
                                            {stockName}
                                        </button>
                                    </div>
                                </div>
                            );
                        }).reverse()}
                    </div>
                </div>
            </div>
            {false == bShowResult || "0" != kiUsMaretSearchInfo.rt_cd ?
                <>
                    <div className="dark:bg-black dark:text-white p-3 shadow">
                        {kiUsMaretSearchInfo.msg1}
                    </div>
                </>
                : <>
                    <div className={`flex shadow transition-all duration-500 ease-in-out ${fixed ? "z-40 w-full fixed top-20 left-0 shadow-md bg-white dark:bg-black dark:border-b dark:border-gray-500" : "relative"}`}>
                        <div className={`w-7/12 p-3 ${fixed ? "py-1" : ""} dark:bg-black dark:text-white font-mono`}>
                            <div className={`flex flex-col text-[0.6rem] ${fixed ? "hidden" : ""}`}>
                                <div>
                                    {kiUsMaretSearchInfoOutput.ovrs_excg_cd} {kiUsMaretSearchInfoOutput.tr_mket_name} | {kiUsMaretPriceDetailOutput.e_icod}
                                </div>
                                <div>
                                    {kiUsMaretSearchInfoOutput.prdt_eng_name}
                                </div>
                            </div>
                            <div>
                                <div className="text-xl">
                                    {kiUsMaretSearchInfoOutput.prdt_name}
                                </div>
                                <div className="dark:bg-black dark:text-white flex gap-2 font-mono items-center">
                                    <div className="text-right">
                                        {/* <span className={`${fixed ? "visible" : "invisible"} text-[0.7rem]`}> | </span> */}
                                        <span className="underline decoration-dotted decoration-4 decoration-violet-500">{Number(kiUsMaretPriceDetailOutput.last).toFixed(2)}</span>
                                        <span> </span><span className="text-[0.7rem]">{kiUsMaretPriceDetailOutput.curr}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`w-5/12 ${fixed ? "" : ""}`}>
                            <LineChart
                                data_array={[
                                    {
                                        name: "주가",
                                        // data: test_data.stock_list.map((stock: any) => stock.remaining_token),
                                        // data: [10, 20, 30, 40, 50, 60, 70, 80, 90],
                                        data: kiUsDailyPrice.output2.map((item: any) => item.clos).reverse(),
                                        color: "rgb(138,92,236)", // chart 데이터 선 색
                                        // color: "#000000",
                                    }
                                ]}
                                category_array={kiUsDailyPrice.output2.map((item: any) => item.xymd).reverse()}
                                markers={
                                    {
                                        size: 0,
                                        // colors: kiInquireDailyItemChartPrice.output2.map((_, index, arr) =>
                                        //   index === arr.length - 1 ? "" : "yellow"
                                        // ).reverse(), // 마지막 값만 빨간색, 나머지는 파란색
                                        // colors: "black",
                                        discrete: [
                                            {
                                                seriesIndex: 0,
                                                dataPointIndex: kiUsDailyPrice.output2.length - 1, // 마지막 값만 적용
                                                fillColor: "yellow", // 마지막 마커 색상
                                                strokeColor: "black", // 마커 테두리 색상
                                                size: 3, // 마지막 마커 크기
                                            },
                                        ],
                                    }
                                }
                                height={`${fixed ? "40" : "80"}`}
                                show_yaxis_label={false}
                                type={"line"}
                            />
                        </div>
                    </div>
                    <div className={`${fixed ? "h-52" : ""}`}></div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex cursor-pointer hover:bg-gray-200" onClick={() => setOpenNCAV(!openNCAV)}>
                            <span className={`transform transition-transform ${openNCAV ? "rotate-0" : "-rotate-90"}`}>
                                ▼
                            </span>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore" }], rehypeHighlight]}
                            >
                                {(() => {
                                    return String.raw`
전략 1: NCAV 모형 (Net Current Asset Value Model):
`})()}
                            </ReactMarkdown>
                        </div>
                        <div className={`px-4 overflow-hidden transition-all duration-500 ease-in-out ${openNCAV ? "max-h-44 p-4" : "max-h-0 p-0"}`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkMath]}
                                rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore" }], rehypeHighlight]}
                            >
                                {(() => {
                                    const stck_oprc = Number(kiUsMaretPriceDetail.output["last"] ?? 1); // 주식 시가2
                                    const lstn_stcn = Number(kiUsMaretPriceDetail.output["shar"] ?? 1); // 상장 주수
                                    const cras = Number(Object.values(fmpUsBalanceSheetStatement)[0].totalCurrentAssets ?? 1); // 유동 자산
                                    const total_lblt = Number(Object.values(fmpUsBalanceSheetStatement)[0].totalLiabilities ?? 1); // 부채 총계

                                    return String.raw`
$$
NCAV = 유동자산 − 총부채
$$

$$
투자 여부 = NCAV > 시가총액 \times ratio
$$

---
$$
\small 적정주가 = \frac{(유동자산 − 총부채)}{상장주식수}
$$

$$
\small = \frac{${cras} \tiny USD \small - ${total_lblt} \tiny USD}{${lstn_stcn} \tiny 개}
= {${((cras - total_lblt) / lstn_stcn).toFixed(0)} \tiny USD}
$$
`})()}
                            </ReactMarkdown>
                        </div>
                    </div>
                    {getNcav(fmpUsBalanceSheetStatement, kiUsMaretPriceDetail, [1.0, 1.5])}
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">PER</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.perx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">배</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">PBR</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.pbrx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">배</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">EPS</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.epsx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">BPS</div>
                            <div className="w-6/12 text-right">{kiUsMaretPriceDetailOutput.bpsx}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">52주 최저가</div>
                            <div className="w-6/12 text-right">({kiUsMaretPriceDetailOutput.l52d}) {kiUsMaretPriceDetailOutput.l52p}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right bg-red-300 dark:bg-gray-500">52주 최고가</div>
                            <div className="w-6/12 text-right bg-red-200 dark:bg-gray-500">({kiUsMaretPriceDetailOutput.h52d}) {kiUsMaretPriceDetailOutput.h52p} </div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">시가총액</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretPriceDetailOutput.tomv).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">상장주식수</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretSearchInfoOutput.lstg_stck_num).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">개</div>
                        </div>
                    </div>
                    <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">거래량</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretPriceDetailOutput.tvol).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">회</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right">전일 거래대금</div>
                            <div className="w-6/12 text-right">{Number(kiUsMaretPriceDetailOutput.pamt).toLocaleString()}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">{kiUsMaretPriceDetailOutput.curr}</div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-4/12 text-right text-[0.6rem]">거래대금/시가총액</div>
                            <div className="w-6/12 text-right">{(Number(Number(kiUsMaretPriceDetailOutput.pamt) / Number(kiUsMaretPriceDetailOutput.tomv)) * 100).toFixed(3)}</div>
                            <div className="w-2/12 text-left text-[0.6rem]">%</div>
                        </div>
                    </div>
                    {"fulfilled" == fmpState ?
                        <>
                            <div className="dark:bg-black dark:text-white text-md p-3 shadow">
                                <div className="flex gap-2 font-mono">
                                    <div className="w-full text-center">재무 정보</div>
                                </div>
                            </div>
                            <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                                <div className="flex gap-2">
                                    <div className="w-4/12 text-right">재무-유동자산</div>
                                    <div className="w-6/12 text-right">{Number(fmpUsBalanceSheetStatement[0].totalCurrentAssets).toLocaleString()}</div>
                                    <div className="w-2/12 text-left text-[0.6rem]">USD</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-4/12 text-right">재무-부채총계</div>
                                    <div className="w-6/12 text-right">{Number(fmpUsBalanceSheetStatement[0].totalLiabilities).toLocaleString()}</div>
                                    <div className="w-2/12 text-left text-[0.6rem]">USD</div>
                                </div>
                            </div>
                            <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                                {true == bShowResult && <table className="table-auto w-full text-right font-mono border border-gray-300">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border px-2 py-1 text-left">항목</th>
                                            {Object.values(fmpUsBalanceSheetStatement).map((item: any, index: number) => (
                                                <th key={index} className="border pr-1 py-1">
                                                    {item.date}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: "유동자산", key: "totalCurrentAssets" }, // cras
                                            { label: "고정자산", key: "totalNonCurrentAssets" }, // fxas
                                            { label: "자산총계", key: "totalAssets" }, // total_aset
                                            { label: "유동부채", key: "totalCurrentLiabilities" }, // flow_lblt
                                            { label: "고정부채", key: "totalNonCurrentLiabilities" }, // fix_lblt
                                            { label: "부채총계", key: "totalLiabilities" }, // total_lblt
                                            { label: "자본금", key: "commonStock" }, // cpfn
                                            { label: "자본잉여금", key: "cfp_surp" },
                                            { label: "이익잉여금", key: "retainedEarnings" }, // prfi_surp
                                            { label: "자본총계", key: "totalEquity" }, // total_cptl
                                        ].map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                                <td className="border pr-1 py-1 text-left">{row.label}</td>
                                                {Object.values(fmpUsBalanceSheetStatement).map((item: any, colIndex: number) => {
                                                    // const value = Number(item[row.key]) * 100000000;
                                                    const value = Number(item[row.key]);
                                                    return (
                                                        <td key={colIndex} className="border pr-1 py-1">
                                                            {Util.UnitConversion(value, false)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>}
                            </div>
                        </>
                        : <></>
                    }
                </>
            }
            <div className="dark:bg-black h-lvh"></div>
        </div >
    </>
}