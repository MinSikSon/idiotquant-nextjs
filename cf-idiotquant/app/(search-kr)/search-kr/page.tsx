"use client"

import { useState, useEffect } from "react";

import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet, getKoreaInvestmentIncomeStatement, KoreaInvestmentIncomeStatement, reqGetIncomeStatement } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
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

export default function SearchKr() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
  const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
  const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
  const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
  const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);
  const kiIncomeStatement: KoreaInvestmentIncomeStatement = useAppSelector(getKoreaInvestmentIncomeStatement);
  const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);

  const [name, setName] = useState<any>("");
  const [startDate, setStartDate] = useState<any>("2024-01-03");
  const [endDate, setEndDate] = useState<any>((new Date()).toISOString().split('T')[0]);

  const [waitResponse, setWaitResponse] = useState(false);
  const aiStreamOutput: string = useAppSelector(selectAiStreamOutput);
  const [response, setResponse] = useState<string>("");
  const [token, setToken] = useState<AiOutputResultUsageType>({ total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 });

  const krMarketHistory = useAppSelector(selectKrMarketHistory);

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

  useEffect(() => {
    if (DEBUG) console.log(`[Search]`, `kiToken:`, kiToken);
    const isValidKiAccessToken = !!kiToken["access_token"];
    if (DEBUG) console.log(`[Search]`, `isValidKiAccessToken`, isValidKiAccessToken);
    if (true == isValidKiAccessToken) {
      dispatch(reqGetInquireBalance(kiToken));
    }
  }, [kiToken]);

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
    if (DEBUG) console.log(`useEffect [kiIncomeStatement]`, kiIncomeStatement);
  }, [kiIncomeStatement])
  useEffect(() => {
    if (DEBUG) console.log(`useEffect [kiInquirePrice]`, kiInquirePrice);
  }, [kiInquirePrice])
  useEffect(() => {
    if (DEBUG) console.log(`useEffect [kiInquirePrice]`, kiInquirePrice);
    if (DEBUG) console.log(`useEffect [kiInquireDailyItemChartPrice]`, kiInquireDailyItemChartPrice);
    if (DEBUG) console.log(`useEffect [kiBalanceSheet]`, kiBalanceSheet);
    if (DEBUG) console.log(`waitResponse`, waitResponse, `, name`, name, `!!name`, !!name);
    if ("fulfilled" == kiIncomeStatement.state && "fulfilled" == kiBalanceSheet.state && "fulfilled" == kiInquirePrice.state && "fulfilled" == kiInquireDailyItemChartPrice.state) {
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
        const latestIncomeStatement = kiIncomeStatement.output[yearMatchIndex];
        if (undefined == latestIncomeStatement) {
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

        // const stac_yymm = latestIncomeStatement.stac_yymm; // str    #결산 년월
        const sale_account = Number(latestIncomeStatement.sale_account) * ONE_HUNDRED_MILLION; // str    #매출액
        const sale_cost = Number(latestIncomeStatement.sale_cost) * ONE_HUNDRED_MILLION; // str    #매출 원가
        const sale_totl_prfi = Number(latestIncomeStatement.sale_totl_prfi) * ONE_HUNDRED_MILLION; // str    #매출 총 이익
        const depr_cost = Number(latestIncomeStatement.depr_cost) * ONE_HUNDRED_MILLION; // str    #감가상각비
        const sell_mang = Number(latestIncomeStatement.sell_mang) * ONE_HUNDRED_MILLION; // str    #판매 및 관리비
        const bsop_prti = Number(latestIncomeStatement.bsop_prti) * ONE_HUNDRED_MILLION; // str    #영업 이익
        const bsop_non_ernn = Number(latestIncomeStatement.bsop_non_ernn) * ONE_HUNDRED_MILLION; // str    #영업 외 수익
        const bsop_non_expn = Number(latestIncomeStatement.bsop_non_expn) * ONE_HUNDRED_MILLION; // str    #영업 외 비용
        const op_prfi = Number(latestIncomeStatement.op_prfi) * ONE_HUNDRED_MILLION; // str    #경상 이익
        const spec_prfi = Number(latestIncomeStatement.spec_prfi) * ONE_HUNDRED_MILLION; // str    #특별 이익
        const spec_loss = Number(latestIncomeStatement.spec_loss) * ONE_HUNDRED_MILLION; // str    #특별 손실
        const thtr_ntin = Number(latestIncomeStatement.thtr_ntin) * ONE_HUNDRED_MILLION; // str    #당기순이익

        const prompt = `다음 정보를 기반으로 종목의 매수/매도 의견을 한국어로 알려줘. (그리고 두괄식 요약, Markdown 형식, 핵심 숫자 강조(굵게), 금액 단위는 원(₩)으로 표기해줘. 그리고 중복된 설명을 좀 줄여줘.)
          종목명은 ${name} ,업종은 ${bstp_kor_isnm}. 주가는 ${stck_oprc.toLocaleString()}원, 시가총액은 ${MARKET_CAP.toLocaleString()}원, 결산일은: ${stac_yymm},
          유동자산은 ${CURRENT_ASSET.toLocaleString()}원 고정자산은 ${fxas.toLocaleString()}원, 자산총계는 ${total_aset.toLocaleString()}원,
          유동부채는 ${flow_lblt.toLocaleString()}원, 고정부채는 ${fix_lblt.toLocaleString()}원, 부채총계는 ${TOTAL_LIABILITIES.toLocaleString()}원,
          자본금은 ${cpfn.toLocaleString()}원, 자본잉여금은 ${cfp_surp.toLocaleString()}원, 이익잉여금은 ${prfi_surp.toLocaleString()}원, 자본총계는 ${total_cptl.toLocaleString()}원,
          손익정보는 매출액은 ${sale_account.toLocaleString()}원, 매출원가는 ${sale_cost.toLocaleString()}원, 매출총이익은 ${sale_totl_prfi.toLocaleString()}원,
          감가상각비는 ${depr_cost.toLocaleString()}원, 판매및관리비는 ${sell_mang.toLocaleString()}원, 영업이익은 ${bsop_prti.toLocaleString()}원,
          영업외수익은 ${bsop_non_ernn.toLocaleString()}원, 영업외비용은 ${bsop_non_expn.toLocaleString()}원, 경상이익은 ${op_prfi.toLocaleString()}원,
          특별이익은 ${spec_prfi.toLocaleString()}원, 특별손실은 ${spec_loss.toLocaleString()}원, 당기순이익은 ${thtr_ntin.toLocaleString()}원.`;

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
      dispatch(reqGetIncomeStatement({ koreaInvestmentToken: kiToken, PDNO: stock_code }));

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

  function getNcav(kiBalanceSheet: KoreaInvestmentBalanceSheet,
    kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice,
    ratioList: number[]) {
    // console.log(`getNcav`, `kiBalanceSheet`, kiBalanceSheet, kiBalanceSheet.output, !!kiBalanceSheet.output);

    const stck_bsop_date = kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]; // 주식 영업 일자
    const stck_oprc = Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]); // 주식 시가2
    const lstn_stcn = Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]); // 상장 주수
    const cras = Number(kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].cras : 0) * 100000000; // 유동 자산
    const total_lblt = Number(kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].total_lblt : 0) * 100000000; // 부채 총계

    const md = ratioList.map(ratio => {
      const target_price = (cras - total_lblt) / lstn_stcn;
      const percentage: number = (((cras - total_lblt) / (stck_oprc * lstn_stcn * ratio) - 1) * 100);
      return `|${ratio.toFixed(2)}|${percentage.toFixed(2)}%|${Number(target_price.toFixed(0)).toLocaleString()}|`;
    }).join("\n");

    const md_main = String.raw`
| ratio (%) | Expected return(%) | Target price(₩) |
|-----------|--------------------|-----------------|
${md}
`;
    return <>
      <div className="w-full text-right p-4">
        <MdTableTemplate md_main={md_main} />
      </div>
    </>
  }

  function getSRIM(
    kiBalanceSheet: KoreaInvestmentBalanceSheet,
    kiIncomeStatement: KoreaInvestmentIncomeStatement,
    kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice,
    ratioList: number[]) {
    // S-RIM: S-RIM (Simple Residual Income Model)
    // V0 = B0 + B0 * (ROE - Ke) / Ke

    const ONE_HUNDRED_MILLION = 100000000;
    const stac_yymm_list = kiBalanceSheet.output.slice(0, 5).map(item => item.stac_yymm);
    const total_cptl = (Number(kiBalanceSheet.output[0].total_cptl) * ONE_HUNDRED_MILLION); // 자본총계
    const total_cptl_list = kiBalanceSheet.output.slice(0, 5).map(item => Number(item.total_cptl) * ONE_HUNDRED_MILLION);
    const thtr_ntin = Number(kiIncomeStatement.output[0].thtr_ntin) * ONE_HUNDRED_MILLION; // 당기순이익
    const thtr_ntin_list = kiIncomeStatement.output.slice(0, 5).map(item => Number(item.thtr_ntin) * ONE_HUNDRED_MILLION);
    const ROE = thtr_ntin / total_cptl * 100;
    const ROE_list = thtr_ntin_list.map((item, index) => item / total_cptl_list[index] * 100);

    const stck_oprc = Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]); // 주식 시가2
    const lstn_stcn = Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]); // 상장 주수

    const md_date = (stac_yymm_list.map(item => item).join(" Target price(₩)|")) + " Target price(₩)|";
    // console.log(`md_date`, md_date);

    const md = ratioList.map((ratio, index) => {
      // const result = total_cptl * (1 + ((ROE - ratio) / ratio));
      const result_list = ROE_list.map((roe, index) => total_cptl_list[index] * (1 + ((roe - ratio) / ratio)));
      // console.log(`result_list`, result_list);
      // const target_price = result / lstn_stcn;
      const target_price_list = result_list.map(item => item / lstn_stcn);
      const percentage = (result_list[0] / lstn_stcn) / stck_oprc * 100 - 100;

      // console.log(`index`, index, `target_price_list`, target_price_list);

      // return `|${ratio.toFixed(2)}%|${percentage.toFixed(2)}%|${Number(target_price.toFixed(0)).toLocaleString()}|`;
      return `|${ratio.toFixed(2)}%|${percentage.toFixed(2)}%|${target_price_list.map(target_price => Number(target_price.toFixed(0)).toLocaleString()).join("|")}|`;
    }).join("\n");


    // console.log(`md`, md);

    const md_main = String.raw`
| $K_e$ (%) | ${stac_yymm_list[0]} Expected return(%) |${md_date}
|-----------|-----------------------------------------|-|-|-|-|--|
${md}
`;

    return <>
      <div className="w-full text-right p-4">
        <MdTableTemplate md_main={md_main} />
      </div>
    </>
  }

  const [validCookie, setValidCookie] = useState<any>(false);
  useEffect(() => {
    setValidCookie(isValidCookie("koreaInvestmentToken"));
  }, []);

  if (false == validCookie || false == !!kiToken["access_token"]) {
    return <>
      <Auth />
    </>
  }

  let bShowResult = true;
  if (("fulfilled" != kiInquireDailyItemChartPrice.state)
    || ("fulfilled" != kiBalanceSheet.state)
    || ("fulfilled" != kiInquirePrice.state)
    || ("fulfilled" != kiIncomeStatement.state)
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
      <div className={`${fixed ? "z-50 w-full fixed top-0 left-0 bg-white dark:bg-black" : "relative"}`}>
        <div className="flex flex-col w-full">
          <SearchAutocomplete placeHolder={"Please enter the stock name."} onSearchButton={onSearchButton} validCorpNameArray={validCorpNameArray} />
          <div className="dark:bg-black flex px-4 py-0 gap-1 overflow-x-auto">
            {krMarketHistory.map((stockName: string, index: number) => {
              return (
                <div key={index} className="dark:bg-black dark:text-white border text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl px-1 py-0.5 transition-all duration-200 min-w-fit">
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
      {(false == bShowResult) ?
        <>
          <div className="dark:bg-black h-lvh"></div>
        </> :
        <>
          <div className="dark:bg-black flex flex-col md:flex-row lg:flex-row">
            <div className="sm:flex-col md:flex-1 lg:flex-1">
              <div className={`flex shadow transition-all duration-500 ease-in-out ${fixed ? "z-40 w-full fixed pt-4 top-20 left-0 shadow-md bg-white dark:bg-black dark:border-b dark:border-gray-500" : "relative"}`}>
                <div className={`w-7/12 p-3 ${fixed ? "py-1" : ""} dark:bg-black dark:text-white font-mono`}>
                  <div className={`text-[0.6rem] ${fixed ? "hidden" : ""}`}>{kiInquirePrice.output["rprs_mrkt_kor_name"]} | {kiInquirePrice.output["bstp_kor_isnm"]} </div>
                  <div>
                    <div className="text-xl">
                      {kiInquireDailyItemChartPrice.output1.hts_kor_isnm}
                    </div>
                    <div className="dark:bg-black dark:text-white flex gap-2 font-mono items-center">
                      <div className="text-right">
                        {/* <span className={`${fixed ? "visible" : "invisible"} text-[0.7rem]`}> | </span> */}
                        <span className="underline decoration-dotted decoration-4 decoration-violet-500">{Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]).toLocaleString()}</span>
                        <span> </span><span className="text-[0.7rem]">원 | {kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]}</span>
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
                        data: kiInquireDailyItemChartPrice.output2.map((item: any) => item.stck_oprc).reverse(),
                        color: "rgb(138,92,236)", // chart 데이터 선 색
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
                      const stck_bsop_date = kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]; // 주식 영업 일자
                      const stck_oprc = Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]); // 주식 시가2
                      const lstn_stcn = Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]); // 상장 주수
                      const cras = Number(kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].cras : 0) * 100000000; // 유동 자산
                      const total_lblt = Number(kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[getYearMatchIndex(stck_bsop_date)].total_lblt : 0) * 100000000; // 부채 총계
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
\small = \frac{${Util.UnitConversion(cras, true)} - ${Util.UnitConversion(total_lblt, true)}}{${lstn_stcn} \tiny 개}
= {${((cras - total_lblt) / lstn_stcn).toFixed(0)} \tiny 원}
$$
`})()}
                  </ReactMarkdown>
                </div>
                {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, [1.0, 1.5, 2.0])}
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                <div className="flex flex-col">
                  <div className="flex cursor-pointer hover:bg-gray-200" onClick={() => setOpenSRIM(!openSRIM)}>
                    <span className={`transform transition-transform ${openSRIM ? "rotate-0" : "-rotate-90"}`}>
                      ▼
                    </span>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore" }], rehypeHighlight]}
                    >
                      {(() => {
                        return String.raw`
전략 2: S-RIM 모형 (Simple Residual Income Model):
`
                      })()}
                    </ReactMarkdown>
                  </div>
                  <div className={`px-4 overflow-hidden transition-all duration-500 ease-in-out ${openSRIM ? "max-h-48 p-4" : "max-h-0 p-0"}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore" }], rehypeHighlight]}
                    >
                      {(() => {
                        const ONE_HUNDRED_MILLION = 100000000;
                        const total_cptl = (Number(kiBalanceSheet.output[0].total_cptl) * ONE_HUNDRED_MILLION); // 자본총계
                        const str_total_cptl = Util.UnitConversion(total_cptl, true);
                        const thtr_ntin = Number(kiIncomeStatement.output[0].thtr_ntin) * ONE_HUNDRED_MILLION; // 당기순이익

                        const ROE = thtr_ntin / total_cptl * 100;
                        const str_ROE = Number(ROE).toFixed(2);

                        const lstn_stcn = Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]); // 상장 주수
                        const stck_oprc = Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]); // 주식 시가2

                        return String.raw`
$$
\small 기업가치 = 자기자본 + \frac{초과이익}{할인율} = B_0 + \frac{B_0 \cdot (ROE - K_e)}{K_e}
$$
---

$$
\small 적정주가 = \frac{기업가치}{상장주식수} = \frac{${str_total_cptl} + \frac{${str_total_cptl} \cdot (${str_ROE} - K_e)}{K_e}}{${lstn_stcn} 개}
$$

$\tiny B_0 = 현재 자기자본 (Book Value of Equity) = ${Util.UnitConversion(total_cptl, true)}$

$\tiny ROE = \frac{당기순이익 (Net Income)}{자기자본 (Equity)} \times {100} 
= \frac{${Util.UnitConversion(thtr_ntin, true)}}{${Util.UnitConversion(total_cptl, true)}} \times {100}
= {${str_ROE}}$

$\tiny K_e = 할인율$
`
                      })()}
                    </ReactMarkdown>
                  </div>
                </div>
                {getSRIM(kiBalanceSheet, kiIncomeStatement, kiInquireDailyItemChartPrice, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
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
              <div className="dark:bg-black dark:text-white text-md p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-full text-center">재무 정보</div>
                </div>
              </div>
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
              <div className="dark:bg-black dark:text-white text-md p-3 shadow">
                <div className="flex gap-2 font-mono">
                  <div className="w-full text-center">손익 정보</div>
                </div>
              </div>
              <div className="dark:bg-black dark:text-white text-xs p-3 shadow">
                {bShowResult && <table className="table-auto w-full text-right font-mono border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1 text-left">항목</th>
                      {kiIncomeStatement.output.slice(0, 5).map((item: any, index: number) => (
                        <th key={index} className="border pr-1 py-1">
                          {item.stac_yymm}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "매출액", key: "sale_account" },
                      { label: "매출원가", key: "sale_cost" },
                      { label: "매출 총 이익", key: "sale_totl_prfi" },
                      { label: "감가상각비", key: "depr_cost" },
                      { label: "판매 및 관리비", key: "sell_mang" },
                      { label: "영업 이익", key: "bsop_prti" },
                      { label: "영업 외 수익", key: "bsop_non_ernn" },
                      { label: "영업 외 비용", key: "bsop_non_expn" },
                      { label: "경상 이익", key: "op_prfi" },
                      { label: "영업", key: "bsop_prti" },
                      { label: "특별 이익", key: "spec_prfi" },
                      { label: "특별 손실", key: "spec_loss" },
                      { label: "당기순이익", key: "thtr_ntin" },
                    ].map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="border pr-1 py-1 text-left">{row.label}</td>
                        {kiIncomeStatement.output.slice(0, 5).map((item: any, colIndex: number) => {
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
                  rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore" }], rehypeHighlight]}
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
    </div >
  </>
}
