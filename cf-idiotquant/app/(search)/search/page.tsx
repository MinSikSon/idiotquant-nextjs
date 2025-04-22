"use client"

import React from "react";

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
import { reqPostLaboratory } from "@/lib/features/ai/aiSlice";
import { AiOutputResultUsageType, selectAiStreamOutput } from "@/lib/features/ai/aiStreamSlice";

const DEBUG = true;

export default function Search() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const loginState = useAppSelector(selectLoginState);
  const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
  const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
  const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
  const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
  const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);
  const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);

  const [name, setName] = React.useState<any>("");
  const [startDate, setStartDate] = React.useState<any>("2024-01-03");
  const [endDate, setEndDate] = React.useState<any>((new Date()).toISOString().split('T')[0]);

  const [waitResponse, setWaitResponse] = React.useState(false);
  const aiStreamOutput: string = useAppSelector(selectAiStreamOutput);
  const [response, setResponse] = React.useState<string>("");
  const [token, setToken] = React.useState<AiOutputResultUsageType>({ total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 });

  React.useEffect(() => {
    if (DEBUG) console.log(`[Search]`, `kiToken:`, kiToken);
    if ("cf" == loginState || "kakao" == loginState) {
      const isValidKiAccessToken = !!kiToken["access_token"];
      if (true == isValidKiAccessToken) {
        dispatch(reqGetInquireBalance(kiToken));
      }
    }
  }, [kiToken, loginState]);

  React.useEffect(() => {
    if (DEBUG) console.log(`React.useEffect [kiInquireDailyItemChartPrice]`, kiInquireDailyItemChartPrice);
    if (DEBUG) console.log(`kiInquireDailyItemChartPrice.output1.hts_avls`, kiInquireDailyItemChartPrice.output1.hts_avls, `HTS 시가총액 (억)`);
  }, [kiInquireDailyItemChartPrice])
  React.useEffect(() => {
    // 날짜별로 분류 필요
    if (DEBUG) console.log(`React.useEffect [kiBalanceSheet]`, kiBalanceSheet);
    if (DEBUG) console.log(`kiBalanceSheet.output[0].cras`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].cras : 0, `유동자산 (억)`);
    if (DEBUG) console.log(`kiBalanceSheet.output[0].total_lblt`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].total_lblt : 0, `부채총계 (억)`);

  }, [kiBalanceSheet])

  React.useEffect(() => {
    if (DEBUG) console.log(`React.useEffect [kiInquirePrice]`, kiInquirePrice);

    if (DEBUG) console.log(`waitResponse`, waitResponse, `, name`, name, `!!name`, !!name);
    if ("init" != kiBalanceSheet.state && "pending" != kiInquirePrice.state && true == waitResponse && !!name) {
      if (DEBUG) console.log(`reqPostLaboratory`);

      const last_price = Number(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]);
      const market_cap = (Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]));
      const current_asset = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].cras) * 100000000);
      const total_liabilities = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].total_lblt) * 100000000);
      // console.log(`last_price`, last_price);
      // console.log(`market_cap`, market_cap);
      // console.log(`current_asset`, current_asset);
      // console.log(`total_liabilities`, total_liabilities);
      const prompt = `(기본 조건: 두괄식, markdown, 한글, 색상 강조, 목차 순서, 숫자 단위) 종목명은 ${name}이고, 현재가는 ${last_price}원, 시가총액은 ${market_cap}원, 유동자산은 ${current_asset}원, 부채총계는 ${total_liabilities}원입니다. 이 종목의 매수/매도 의견을 알려주세요.`;
      dispatch(reqPostLaboratory({ system_content: prompt, user_content: prompt }));
    }
  }, [kiInquirePrice])

  React.useEffect(() => {
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
    type CorpCodeType = {
      corp_code: string;
      stock_code: string;
      modify_date: string;
    };

    const corpCode: any = corpCodeJson;
    const jsonStock: CorpCodeType = corpCode[stockName];
    if (DEBUG) console.log(`stockName`, stockName, `jsonStock`, jsonStock);
    if (!!jsonStock) {
      const { stock_code } = jsonStock;
      // console.log(`stockCode`, stock_code);
      if (DEBUG) console.log(`startDate`, startDate, `, endDate`, endDate);
      dispatch(reqGetInquirePrice({ koreaInvestmentToken: kiToken, PDNO: stock_code }));
      dispatch(reqGetInquireDailyItemChartPrice({ koreaInvestmentToken: kiToken, PDNO: stock_code, FID_INPUT_DATE_1: formatDate(startDate), FID_INPUT_DATE_2: formatDate(endDate) }))
      dispatch(reqGetBalanceSheet({ koreaInvestmentToken: kiToken, PDNO: stock_code }));

      setName(stockName);
      setWaitResponse(true);
    }
  }

  // const handleInputEndDate = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setEndDate(e.target.value);
  //   if (DEBUG) console.log(`Date.now()`, Date.now());
  //   const date = new Date(e.target.value);

  //   // 5일을 빼기 위해 setDate() 사용
  //   date.setDate(date.getDate() - 5);

  //   setStartDate(date.toISOString().split('T')[0]); // 결과: "2025-01-30"
  // };

  function isYearMatch(date1: string, date2: string) {
    const year1 = date1.slice(0, 4); // 첫 번째 날짜의 연도 추출
    const year2 = date2.slice(0, 4); // 두 번째 날짜의 연도 추출

    return year1 === year2; // 두 연도가 일치하는지 확인
  }

  function getYearMatchIndex(yearMonthDate: string) {
    if (kiBalanceSheet.output.length > 0) {
      for (let i = 0; i < kiBalanceSheet.output.length; ++i) {
        // console.log(`kiBalanceSheet.output[${i}]`, kiBalanceSheet.output[i]);
        if (isYearMatch(yearMonthDate, kiBalanceSheet.output[i]["stac_yymm"])) {
          return i;
        }
      }
    }

    return 0;
  }

  function getNcav(kiBalanceSheet: any, kiInquireDailyItemChartPrice: any, ratio: number) {
    const stck_bsop_date = kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]; // 주식 영업 일자
    const stck_oprc = Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]); // 주식 시가2
    const lstn_stcn = Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]); // 상장 주수
    const cras = Number(kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].cras) * 100000000; // 유동 자산
    const total_lblt = Number(kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].total_lblt) * 100000000; // 부채 총계

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

  if ("init" == loginState || "rejected" == loginState || "pending" == loginState) {
    return <>
      <Login parentUrl={pathname} />
    </>;
  }

  if (false == isValidCookie("koreaInvestmentToken") || false == !!kiToken["access_token"]) {
    return <>
      <Auth />
    </>
  }

  if (("fulfilled" != kiInquireDailyItemChartPrice.state)
    || ("fulfilled" != kiBalanceSheet.state)
    || ("fulfilled" != kiInquirePrice.state)
  ) {
    return <>
      <SearchAutocomplete placeHolder={"회사명을 검색하세요..."} onSearchButton={onSearchButton} validCorpNameArray={validCorpNameArray} />
    </>
  }

  const market_cap = (Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]));
  const current_asset = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].cras) * 100000000);
  const total_liabilities = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].total_lblt) * 100000000);

  return <>
    <SearchAutocomplete placeHolder={"회사명을 검색하세요..."} onSearchButton={onSearchButton} validCorpNameArray={validCorpNameArray} />
    <div className="rounded px-2 pb-1 m-2 shadow font-mono">
      <div className="text-[0.6rem]">
        {kiInquirePrice.output["rprs_mrkt_kor_name"]}
      </div>
      <div className="text-xl">
        {kiInquireDailyItemChartPrice.output1.hts_kor_isnm}
      </div>
    </div>
    <div className="text-xs rounded px-2 pb-1 m-2 shadow font-mono">
      <div className="flex gap-2">
        <div className="w-11/12">
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
          />
        </div>
        <div className="w-1/12"></div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 bg-yellow-200 text-right">현재가</div>
        <div className="w-6/12 bg-yellow-100 text-right"><span className="text-[0.6rem]">({kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]})</span> {Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]).toLocaleString()}</div>
        <div className="w-2/12 text-left text-[0.6rem]">원</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">시가총액</div>
        <div className="w-6/12 text-right">{market_cap.toLocaleString()}</div>
        <div className="w-2/12 text-left text-[0.6rem]">원</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">상장주식수</div>
        <div className="w-6/12 text-right">{Number(Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"])).toLocaleString()}</div>
        <div className="w-2/12 text-left text-[0.6rem]">개</div>
      </div>
    </div>
    <div className="text-xs rounded px-2 pb-1 m-2 shadow">
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">52주 최저가</div>
        <div className="w-6/12 text-right"><span className="text-[0.6rem]">({kiInquirePrice.output["dryy_lwpr_date"]})</span> {Number(kiInquirePrice.output["w52_lwpr"]).toLocaleString()}</div>
        <div className="w-2/12 text-[0.6rem]">원</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right bg-red-300">52주 최고가</div>
        <div className="w-6/12 text-right bg-red-200"><span className="text-[0.6rem]">({kiInquirePrice.output["w52_hgpr_date"]})</span> {Number(kiInquirePrice.output["w52_hgpr"]).toLocaleString()}</div>
        <div className="w-2/12 text-left text-[0.6rem]">원</div>
      </div>
    </div>
    <div className="text-xs rounded px-2 pb-1 m-2 shadow">
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">PER</div>
        <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["per"])).toLocaleString()}</div>
        <div className="w-2/12 text-left">배</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">PBR</div>
        <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["pbr"])).toLocaleString()}</div>
        <div className="w-2/12 text-left">배</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">EPS</div>
        <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["eps"])).toLocaleString()}</div>
        <div className="w-2/12 text-left">원</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">BPS</div>
        <div className="w-6/12 text-right">{Number(Number(kiInquirePrice.output["bps"])).toLocaleString()}</div>
        <div className="w-2/12 text-left">원</div>
      </div>
    </div>
    <div className="text-xs rounded px-2 pb-1 m-2 shadow">
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">업종</div>
        <div className="w-6/12 text-right">{kiInquirePrice.output["bstp_kor_isnm"]}</div>
        <div className="w-2/12 text-left"></div>
      </div>
    </div>
    <div className="text-xs rounded px-2 pb-1 m-2 shadow">
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">거래량</div>
        <div className="w-6/12 text-right">{Number(kiInquirePrice.output["acml_vol"]).toLocaleString()}</div>
        <div className="w-2/12 text-left">회</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">전일 거래대금</div>
        <div className="w-6/12 text-right">{Number(kiInquirePrice.output["acml_tr_pbmn"]).toLocaleString()}</div>
        <div className="w-2/12 text-left">원</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right text-[0.6rem]">거래대금/시가총액</div>
        <div className="w-6/12 text-right">{(100 * Number(kiInquirePrice.output["acml_tr_pbmn"]) / (Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]))).toFixed(3)}</div>
        <div className="w-2/12 text-left">%</div>
      </div>
    </div>
    <div className="text-xs rounded px-2 pb-1 m-2 shadow">
      {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.0)}
      {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.5)}
    </div>
    <div className="text-xs rounded px-2 pb-1 m-2 shadow">
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">재무-유동자산</div>
        <div className="w-6/12 text-right">{current_asset.toLocaleString()}</div>
        <div className="w-2/12 text-left text-[0.6rem]">원</div>
      </div>
      <div className="flex gap-2 font-mono">
        <div className="w-4/12 text-right">재무-부채총계</div>
        <div className="w-6/12 text-right">{total_liabilities.toLocaleString()}</div>
        <div className="w-2/12 text-left text-[0.6rem]">원</div>
      </div>
    </div>
    {/* <div className="text-xs rounded px-2 pb-1 m-2 shadow"> */}
    <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 max-w-2xl mx-auto">

      <div className="text-[11px] font-mono text-gray-500 uppercase tracking-wider mb-1">
        🤖 응답 <span className="text-[0.4rem]">(Generated by LLaMA 4) 🧮 token(total:{token.total_tokens} = prompt:{token.prompt_tokens} + completion:{token.completion_tokens})</span>
      </div>
      <div className="w-full font-mono text-[12px] prose prose-sm max-w-none text-gray-800 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          skipHtml={false} // HTML 태그도 렌더링하도록
        >
          {response}
        </ReactMarkdown>
      </div>
    </div>
  </>
}
