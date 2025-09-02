"use client"

import { useState, useEffect } from "react";

import Login from "@/app/(login)/login/login"
import { selectLoginState } from "@/lib/features/login/loginSlice";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance, getKoreaInvestmentInquirePrice } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import corpCodeJson from "@/public/data/validCorpCode.json"
import { isValidCookie, Util } from "@/components/util";
import Auth from "@/components/auth";
import SearchAutocomplete from "@/components/searchAutoComplete";

import validCorpNameArray from "@/public/data/validCorpNameArray.json";
import LineChart from "@/components/LineChart";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

import { reqPostLaboratory } from "@/lib/features/ai/aiSlice";
import { AiOutputResultUsageType, selectAiStreamOutput } from "@/lib/features/ai/aiStreamSlice";
import { addKrMarketHistory, selectKrMarketHistory, selectUsMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";

const DEBUG = false;

export default function SearchKor() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const loginState = useAppSelector(selectLoginState);
  const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
  const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
  const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
  const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
  const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);
  const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);

  const [name, setName] = useState<any>("");
  const [startDate, setStartDate] = useState<any>("2024-01-03");
  const [endDate, setEndDate] = useState<any>((new Date()).toISOString().split('T')[0]);

  const [waitResponse, setWaitResponse] = useState(false);
  const aiStreamOutput: string = useAppSelector(selectAiStreamOutput);
  const [response, setResponse] = useState<string>("");
  const [token, setToken] = useState<AiOutputResultUsageType>({ total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 });

  const krMarketHistory = useAppSelector(selectKrMarketHistory);

  useEffect(() => {
    if (DEBUG) console.log(`[Search]`, `kiToken:`, kiToken);
    if ("cf" == loginState || "kakao" == loginState) {
      const isValidKiAccessToken = !!kiToken["access_token"];
      if (DEBUG) console.log(`[Search]`, `isValidKiAccessToken`, isValidKiAccessToken);
      if (true == isValidKiAccessToken) {
        dispatch(reqGetInquireBalance(kiToken));
      }
    }
  }, [kiToken, loginState]);

  useEffect(() => {
    if (DEBUG) console.log(`useEffect [kiInquireDailyItemChartPrice]`, kiInquireDailyItemChartPrice);
    if (DEBUG) console.log(`kiInquireDailyItemChartPrice.output1.hts_avls`, kiInquireDailyItemChartPrice.output1.hts_avls, `HTS 시가총액 (억)`);
  }, [kiInquireDailyItemChartPrice])
  useEffect(() => {
    // 날짜별로 분류 필요
    if (DEBUG) console.log(`useEffect [kiBalanceSheet]`, kiBalanceSheet);
    if (DEBUG) console.log(`kiBalanceSheet.output[0].cras`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].cras : 0, `유동자산 (억)`);
    if (DEBUG) console.log(`kiBalanceSheet.output[0].total_lblt`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].total_lblt : 0, `부채총계 (억)`);

  }, [kiBalanceSheet])

  useEffect(() => {
    if (DEBUG) console.log(`useEffect [kiInquirePrice]`, kiInquirePrice);
  }, [kiInquirePrice])
  useEffect(() => {
    if (DEBUG) console.log(`useEffect [kiInquirePrice]`, kiInquirePrice);
    if (DEBUG) console.log(`useEffect [kiInquireDailyItemChartPrice]`, kiInquireDailyItemChartPrice);
    if (DEBUG) console.log(`useEffect [kiBalanceSheet]`, kiBalanceSheet);
    if (DEBUG) console.log(`waitResponse`, waitResponse, `, name`, name, `!!name`, !!name);
    if ("fulfilled" == kiBalanceSheet.state && "fulfilled" == kiInquirePrice.state && "fulfilled" == kiInquireDailyItemChartPrice.state) {
      if (true == waitResponse && !!name) {
        if (DEBUG) console.log(`reqPostLaboratory`);

        const stck_oprc = Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]);
        const MARKET_CAP = (Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]));
        const bstp_kor_isnm = kiInquirePrice.output.bstp_kor_isnm; // 업종 한글 종목명

        const yearMatchIndex = getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]);
        if (DEBUG) console.log(`yearMatchIndex`, yearMatchIndex, `kiBalanceSheet.output.length`, kiBalanceSheet.output.length);
        const latestBalanceSheet = kiBalanceSheet.output[yearMatchIndex];
        if (DEBUG) console.log(`latestBalanceSheet`, latestBalanceSheet);
        if (undefined == latestBalanceSheet) {
          return;
        }
        const ONE_HUNDRED_MILLION = 100000000;

        const stac_yymm = latestBalanceSheet.stac_yymm; // stac_yymm: str    #결산 년월
        const CURRENT_ASSET = (Number(latestBalanceSheet.cras) * ONE_HUNDRED_MILLION); // cras: str    #유동자산
        const fxas = (Number(latestBalanceSheet.fxas) * ONE_HUNDRED_MILLION); // fxas: str    #고정자산
        const total_aset = (Number(latestBalanceSheet.total_aset) * ONE_HUNDRED_MILLION); // total_aset: str    #자산총계
        const flow_lblt = (Number(latestBalanceSheet.flow_lblt) * ONE_HUNDRED_MILLION); // flow_lblt: str    #유동부채
        const fix_lblt = (Number(latestBalanceSheet.fix_lblt) * ONE_HUNDRED_MILLION); // fix_lblt: str    #고정부채
        const TOTAL_LIABILITIES = (Number(latestBalanceSheet.total_lblt) * ONE_HUNDRED_MILLION); // total_lblt: str    #부채총계
        const cpfn = (Number(latestBalanceSheet.cpfn) * ONE_HUNDRED_MILLION);// cpfn: str    #자본금
        const cfp_surp = (Number(latestBalanceSheet.cfp_surp) * ONE_HUNDRED_MILLION);// cfp_surp: str    #자본잉여금
        const prfi_surp = (Number(latestBalanceSheet.prfi_surp) * ONE_HUNDRED_MILLION); // prfi_surp: str    #이익잉여금
        const total_cptl = (Number(latestBalanceSheet.total_cptl) * ONE_HUNDRED_MILLION); // total_cptl: str    #자본총계

        // const default_condition = `다음 조건들에 따라 한국어로 분석해줘: 두괄식 요약, Markdown 형식 사용, 핵심 숫자는 굵게 강조, 항목별 소제목 및 목차 포함, 금액 단위는 원(₩)으로 표기)`;
        // const balance_condition = `(재무재표: 결산년월 ${stac_yymm}, 유동자산 ${CURRENT_ASSET}원, 고정자산 ${fxas}원, 자산총계 ${total_aset}원, 유동부채 ${flow_lblt}원, 
        // 고정부채 ${fix_lblt}원, 부채총계 ${TOTAL_LIABILITIES}원, 자본금 ${cpfn}원, 자본잉여금 ${cfp_surp}원, 이익잉여금 ${prfi_surp}원, 자본총계 ${total_cptl}원)`;
        // const stock_condition = `종목명: ${name}, 업종: ${bstp_kor_isnm}. ${balance_condition} 현재가는 ${stck_oprc}원, 시가총액은 ${MARKET_CAP}원.`;
        // const requirement = `이 종목의 재무정보 기반으로 매수/매도 의견을 알려줘.`;
        // const prompt = `${default_condition} ${stock_condition} ${requirement}`;

        const prompt = `다음 정보를 기반으로 종목의 매수/매도 의견을 한국어로 알려줘. (그리고 두괄식 요약, Markdown 형식, 핵심 숫자 강조(굵게), 금액 단위는 원(₩)으로 표기해줘. 그리고 중복된 설명을 좀 줄여줘.)
          종목명은 ${name} ,업종은 ${bstp_kor_isnm}. 주가는 ${stck_oprc.toLocaleString()}원, 시가총액은 ${MARKET_CAP.toLocaleString()}원, 결산일은: ${stac_yymm},
          유동자산은 ${CURRENT_ASSET.toLocaleString()}원 고정자산은 ${fxas.toLocaleString()}원, 자산총계는 ${total_aset.toLocaleString()}원,
          유동부채는 ${flow_lblt.toLocaleString()}원, 고정부채는 ${fix_lblt.toLocaleString()}원, 부채총계는 ${TOTAL_LIABILITIES.toLocaleString()}원,
          자본금은 ${cpfn.toLocaleString()}원, 자본잉여금은 ${cfp_surp.toLocaleString()}원, 이익잉여금은 ${prfi_surp.toLocaleString()}원, 자본총계는 ${total_cptl.toLocaleString()}원`;

        dispatch(reqPostLaboratory({ system_content: prompt, user_content: prompt }));
      }
    }
  }, [kiInquirePrice, kiInquireDailyItemChartPrice, kiBalanceSheet])

  useEffect(() => {
    // console.log(`aiStreamOutput`, aiStreamOutput);
    let buffer: string = aiStreamOutput;
    const lines = buffer.split('\n');

    // 마지막 줄은 아직 다 안 온 걸 수 있으니 남겨둠
    buffer = lines.pop() || "";

    let outputContent = "";
    let outputUsage: AiOutputResultUsageType = { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 };
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();

        if (jsonStr === '[DONE]') {
          if (DEBUG) console.log('Stream ended', `outputContent:`, outputContent);
          setWaitResponse(false);
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          // console.log(`parsed`, parsed);
          const content = parsed.response;
          if (content) {
            // console.log('응답 추가:', content, `, typeof jsonStr`, typeof jsonStr, `, parsed`, parsed);
            outputContent += content;
            // 여기서 바로 파싱하거나 UI에 반영
          }
          const usage = parsed.usage;
          if (usage) {
            // console.log(`토큰`, usage);
            outputUsage = usage;
            setToken(outputUsage);
          }
        } catch (e) {
          console.error('JSON 파싱 실패:', jsonStr);
        }
      }
    }

    setResponse(outputContent);
  }, [aiStreamOutput]);

  const formatDate = (date: string) => {
    // const arrDate = date.split("-");
    const YYYYMMDD = date.replaceAll("-", ""); // YYYYMMDD
    // console.log("YYYYMMDD", YYYYMMDD);

    return YYYYMMDD;
  }

  function onSearchButton(stockName: any) {
    if (DEBUG) console.log(`검색 1`, stockName);
    type CorpCodeType = {
      corp_code: string;
      stock_code: string;
      modify_date: string;
    };

    const corpCode: any = corpCodeJson;
    const jsonStock: CorpCodeType = corpCode[stockName];
    if (DEBUG) console.log(`stockName`, stockName, `jsonStock`, jsonStock);
    if (!!jsonStock) {
      if (DEBUG) console.log(`검색 2`, stockName);
      const { stock_code } = jsonStock;
      // console.log(`stockCode`, stock_code);
      if (DEBUG) console.log(`startDate`, startDate, `, endDate`, endDate);
      dispatch(reqGetInquirePrice({ koreaInvestmentToken: kiToken, PDNO: stock_code }));
      dispatch(reqGetInquireDailyItemChartPrice({ koreaInvestmentToken: kiToken, PDNO: stock_code, FID_INPUT_DATE_1: formatDate(startDate), FID_INPUT_DATE_2: formatDate(endDate) }))
      dispatch(reqGetBalanceSheet({ koreaInvestmentToken: kiToken, PDNO: stock_code }));

      setName(stockName);
      setWaitResponse(true);

      dispatch(addKrMarketHistory(stockName));
    }
  }

  function isYearMatch(date1: string, date2: string) {
    const year1 = date1.slice(0, 4); // 첫 번째 날짜의 연도 추출
    const year2 = date2.slice(0, 4); // 두 번째 날짜의 연도 추출

    return year1 === year2; // 두 연도가 일치하는지 확인
  }

  function getYearMatchIndex(yearMonthDate: string) {
    if (kiBalanceSheet.output.length > 0) {
      for (let i = 0; i < kiBalanceSheet.output.length; ++i) {
        if (isYearMatch(yearMonthDate, kiBalanceSheet.output[i]["stac_yymm"])) {
          return i;
        }
      }
    }

    return 0;
  }

  function getNcav(kiBalanceSheet: any, kiInquireDailyItemChartPrice: any, ratio: number) {
    // console.log(`getNcav`, `kiBalanceSheet`, kiBalanceSheet, kiBalanceSheet.output, !!kiBalanceSheet.output);

    const stck_bsop_date = kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]; // 주식 영업 일자
    const stck_oprc = Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]); // 주식 시가2
    const lstn_stcn = Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]); // 상장 주수
    const cras = Number(kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].cras : 0) * 100000000; // 유동 자산
    const total_lblt = Number(kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].total_lblt : 0) * 100000000; // 부채 총계

    const value: number = (((cras - total_lblt) / (stck_oprc * lstn_stcn * ratio) - 1) * 100);
    const target_price = (cras - total_lblt) / lstn_stcn;

    return <>
      <div className="flex gap-2">
        <div className="w-4/12 text-right text-[0.6rem]">전략-NCAV({ratio.toFixed(1)})</div>
        <div className="w-6/12 text-right"><span className={`text-[0.6rem] ${value >= 0 ? "text-red-500" : "text-blue-500"}`}>({value.toFixed(2)}%) 목표가: </span><span className={`${value >= 0 ? "text-red-500" : "text-blue-500"}`}>{(Number(target_price.toFixed(0)).toLocaleString())}</span></div>
        <div className="w-2/12 text-left text-[0.6rem]">원</div>
      </div>
    </>
  }

  const [validCookie, setValidCookie] = useState<any>(false);
  useEffect(() => {
    setValidCookie(isValidCookie("koreaInvestmentToken"));
  }, []);

  // if ("init" == loginState || "rejected" == loginState || "pending" == loginState) {
  //   return <>
  //     <Login parentUrl={pathname} />
  //   </>;
  // }

  if (false == validCookie || false == !!kiToken["access_token"]) {
    return <>
      <Auth />
    </>
  }

  let bShowResult = true;
  if (("fulfilled" != kiInquireDailyItemChartPrice.state)
    || ("fulfilled" != kiBalanceSheet.state)
    || ("fulfilled" != kiInquirePrice.state)
  ) {
    bShowResult = false;
    // return <>
    //   <SearchAutocomplete placeHolder={"Please enter the KOSPI/KOSDAQ/KONEX stock name."} onSearchButton={onSearchButton} validCorpNameArray={validCorpNameArray} />
    //   <div className="dark:bg-black h-lvh"></div>
    // </>
  }

  let MARKET_CAP = 0;
  // let CURRENT_ASSET_LIST = []; // 유동자산
  // let TOTAL_LIABILITIES_LIST = []; // 부채총계
  if (true == bShowResult) {
    MARKET_CAP = (Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]));
    // const yearIndex = getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]);
    // for (let i = 0; i < kiBalanceSheet.output.length; ++i) {
    //   {
    //     CURRENT_ASSET_LIST.push(Number(kiBalanceSheet.output[i].cras) * 100000000); // 유동자산 (억)
    //     TOTAL_LIABILITIES_LIST.push(Number(kiBalanceSheet.output[i].total_lblt) * 100000000); // 부채총계 (억)
    //   }
    // }
  }

  return <>
    <div className="flex flex-col w-full">
      <div className="flex flex-col w-full">
        <SearchAutocomplete placeHolder={"Enter KOSPI/KOSDAQ/KONEX stock name."} onSearchButton={onSearchButton} validCorpNameArray={validCorpNameArray} />
        <div className="dark:bg-black flex px-4 gap-1 overflow-x-auto">
          {krMarketHistory.map((stockName: string, index: number) => {
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
      {(false == bShowResult) ?
        <>
          <div className="dark:bg-black h-lvh"></div>
        </> :
        <>
          <div className="dark:bg-black flex flex-col md:flex-row lg:flex-row">
            <div className="sm:flex-col md:flex-1 lg:flex-1">
              <div className="flex shadow">
                <div className="w-6/12 dark:bg-black dark:text-white p-3 font-mono">
                  <div className="text-[0.6rem]">
                    {kiInquirePrice.output["rprs_mrkt_kor_name"]}
                  </div>
                  <div className="text-xl">
                    {kiInquireDailyItemChartPrice.output1.hts_kor_isnm}
                  </div>
                  <div className="dark:bg-black dark:text-white flex gap-2 font-mono items-center">
                    <div className="text-right"> {Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]).toLocaleString()}원</div>
                    <span className="text-[0.7rem]">| {kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]}</span>
                  </div>
                </div>
                <div className="w-6/12">
                  <LineChart
                    data_array={[
                      {
                        name: "주가",
                        // data: test_data.stock_list.map((stock: any) => stock.remaining_token),
                        // data: [10, 20, 30, 40, 50, 60, 70, 80, 90],
                        data: kiInquireDailyItemChartPrice.output2.map((item: any) => item.stck_oprc).reverse(),
                        color: "#000000",
                      }
                    ]}
                    category_array={kiInquireDailyItemChartPrice.output2.map((item: any) => item.stck_bsop_date).reverse()}
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
                            dataPointIndex: kiInquireDailyItemChartPrice.output2.length - 1, // 마지막 값만 적용
                            fillColor: "yellow", // 마지막 마커 색상
                            strokeColor: "black", // 마커 테두리 색상
                            size: 3, // 마지막 마커 크기
                          },
                        ],
                      }
                    }
                    height={80}
                    show_yaxis_label={false}
                  />
                </div>
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right">시가총액</div>
                  <div className="w-6/12 text-right">{MARKET_CAP.toLocaleString()}</div>
                  <div className="w-2/12 text-left text-[0.6rem]">원</div>
                </div>
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right">상장주식수</div>
                  <div className="w-6/12 text-right">{Number(Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"])).toLocaleString()}</div>
                  <div className="w-2/12 text-left text-[0.6rem]">개</div>
                </div>
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-4/12 text-right">52주 최저가</div>
                  <div className="w-6/12 text-right"><span className="text-[0.6rem]">({kiInquirePrice.output["dryy_lwpr_date"]})</span> {Number(kiInquirePrice.output["w52_lwpr"]).toLocaleString()}</div>
                  <div className="w-2/12 text-[0.6rem]">원</div>
                </div>
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right bg-red-300 dark:bg-gray-500">52주 최고가</div>
                  <div className="w-6/12 text-right bg-red-200 dark:bg-gray-500"><span className="text-[0.6rem]">({kiInquirePrice.output["w52_hgpr_date"]})</span> {Number(kiInquirePrice.output["w52_hgpr"]).toLocaleString()}</div>
                  <div className="w-2/12 text-left text-[0.6rem]">원</div>
                </div>
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-4/12 text-right">PER</div>
                  <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["per"])).toLocaleString()}</div>
                  <div className="w-2/12 text-left">배</div>
                </div>
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right">PBR</div>
                  <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["pbr"])).toLocaleString()}</div>
                  <div className="w-2/12 text-left">배</div>
                </div>
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right">EPS</div>
                  <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["eps"])).toLocaleString()}</div>
                  <div className="w-2/12 text-left">원</div>
                </div>
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right">BPS</div>
                  <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["bps"])).toLocaleString()}</div>
                  <div className="w-2/12 text-left">원</div>
                </div>
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-4/12 text-right">업종</div>
                  <div className="w-6/12 text-right">{kiInquirePrice.output["bstp_kor_isnm"]}</div>
                  <div className="w-2/12 text-left"></div>
                </div>
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-4/12 text-right">거래량</div>
                  <div className="w-6/12 text-right">{Number(kiInquirePrice.output["acml_vol"]).toLocaleString()}</div>
                  <div className="w-2/12 text-left">회</div>
                </div>
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right">전일 거래대금</div>
                  <div className="w-6/12 text-right">{Number(kiInquirePrice.output["acml_tr_pbmn"]).toLocaleString()}</div>
                  <div className="w-2/12 text-left">원</div>
                </div>
                <div className="dark:bg-black dark:text-white flex gap-2 font-mono">
                  <div className="w-4/12 text-right text-[0.6rem]">거래대금/시가총액</div>
                  <div className="w-6/12 text-right">{(100 * Number(kiInquirePrice.output["acml_tr_pbmn"]) / (Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]))).toFixed(3)}</div>
                  <div className="w-2/12 text-left">%</div>
                </div>
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.0)}
                {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.5)}
              </div>
              <div className="dark:bg-black dark:text-white text-md p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-full text-center">재무 정보</div>
                  {/* <div className="w-6/12 text-right"></div> */}
                  {/* <div className="w-2/12 text-left text-[0.6rem]"></div> */}
                </div>
              </div>
              {/* <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-4/12 text-right">유동자산</div>
                  <div className="w-6/12 text-right">{CURRENT_ASSET_LIST[0].toLocaleString()}</div>
                  <div className="w-2/12 text-left text-[0.6rem]">원</div>
                </div>
                <div className="flex gap-2 font-mono">
                  <div className="w-4/12 text-right">부채총계</div>
                  <div className="w-6/12 text-right">{TOTAL_LIABILITIES_LIST[0].toLocaleString()}</div>
                  <div className="w-2/12 text-left text-[0.6rem]">원</div>
                </div>
              </div> */}
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                {bShowResult && <table className="table-auto w-full text-right font-mono border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1 text-left">항목</th>
                      {kiBalanceSheet.output.slice(0, 5).map((item: any, index: number) => (
                        <th key={index} className="border pr-1 py-1">
                          {item.stac_yymm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "유동자산", key: "cras" },
                      { label: "고정자산", key: "fxas" },
                      { label: "자산총계", key: "total_aset" },
                      { label: "유동부채", key: "flow_lblt" },
                      { label: "고정부채", key: "fix_lblt" },
                      { label: "부채총계", key: "total_lblt" },
                      { label: "자본금", key: "cpfn" },
                      { label: "자본잉여금", key: "cfp_surp" },
                      { label: "이익잉여금", key: "prfi_surp" },
                      { label: "자본총계", key: "total_cptl" },
                    ].map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="border pr-1 py-1 text-left">{row.label}</td>
                        {kiBalanceSheet.output.slice(0, 5).map((item: any, colIndex: number) => {
                          const value = Number(item[row.key]) * 100000000;
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
            </div>
            <div className="flex-1 dark:bg-gray-300 text-black text-xs m-3 shadow">
              <div className="dark:bg-gray-300 text-gray-500 w-fit text-[0.5rem] font-mono tracking-wider px-1 mb-2 border rounded-xl">
                {/* 🤖 Generated by LLaMA 4. <span className="uppercase">🧮 token(total:{token.total_tokens} = prompt:{token.prompt_tokens} + completion:{token.completion_tokens})</span> */}
                🤖 Generated by LLM | <span className="uppercase">🧮 token(total:{token.total_tokens} = prompt:{token.prompt_tokens} + completion:{token.completion_tokens})</span>
              </div>
              <div className="dark:bg-gray-300 p-2 w-full font-mono text-[12px] prose prose-sm max-w-none leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                  skipHtml={false} // HTML 태그도 렌더링하도록
                >
                  {response}
                </ReactMarkdown>
              </div>
              <div className="dark:bg-black h-lvh"></div>
            </div>
          </div>
        </>
      }
    </div>
  </>
}
