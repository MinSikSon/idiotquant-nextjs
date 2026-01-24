"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Button,
  Card,
  Elevation,
  Section,
  SectionCard,
  HTMLTable,
  Tag,
  Icon,
  Divider,
  Spinner,
  Intent
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

// Redux & Hooks
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  reqGetInquirePrice, getKoreaInvestmentInquirePrice,
  reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice,
  reqGetBalanceSheet, getKoreaInvestmentBalanceSheet,
  reqGetIncomeStatement, getKoreaInvestmentIncomeStatement,
  KoreaInvestmentBalanceSheet, KoreaInvestmentIncomeStatement, KoreaInvestmentInquirePrice, KoreaInvestmentInquireDailyItemChartPrice
} from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import {
  reqGetQuotationsSearchInfo, getKoreaInvestmentUsMaretSearchInfo,
  reqGetQuotationsPriceDetail, getKoreaInvestmentUsMaretPriceDetail,
  reqGetOverseasPriceQuotationsDailyPrice, getKoreaInvestmentUsMarketDailyPrice,
  KoreaInvestmentOverseasSearchInfo, KoreaInvestmentOverseasPriceDetail, KoreaInvestmentOverseasPriceQuotationsDailyPrice
} from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import {
  reqGetFinnhubUsFinancialsReported, selectFinnhubFinancialsAsReported, FinnhubFinancialsAsReportedType
} from "@/lib/features/finnhubUsMarket/finnhubUsMarketSlice";
import { reqPostLaboratory } from "@/lib/features/ai/aiSlice";
import { selectAiStreamOutput } from "@/lib/features/ai/aiStreamSlice";
import { addKrMarketHistory, selectKrMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";
import {
  selectCloudflareUserInfo, selectCloudflareStarredStocks,
  getCloudFlareStarredStocks, setCloudFlareStarredStocks, StarredStock
} from "@/lib/features/cloudflare/cloudflareSlice";

// Components & Data
import corpCodeJson from "@/public/data/validCorpCode.json";
import { Util } from "@/components/util";
import SearchAutocomplete from "@/components/searchAutoComplete";
import LineChart from "@/components/LineChart";
import FinnhubBalanceSheetTable from "./table";

// Constants & Assets
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";
import validCorpNameArray from "@/public/data/validCorpNameArray.json";

const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];
const all_tickers = [...us_tickers, ...validCorpNameArray];
const ONE_HUNDRED_MILLION = 100000000;
const DEBUG = false;

export default function Search() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();

  // --- State ---
  const [krOrUs, setKrOrUs] = useState<"KR" | "US">("KR");
  const [name, setName] = useState("");
  const [startDate] = useState("20170101");
  const [endDate] = useState(new Date().toISOString().split('T')[0]);
  const [usStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [fixed, setFixed] = useState(false);
  const [openNCAV, setOpenNCAV] = useState(false);
  const [openSRIM, setOpenSRIM] = useState(false);
  const [waitResponse, setWaitResponse] = useState(false);
  const [response, setResponse] = useState("");

  // --- Selectors ---
  const krMarketHistory = useAppSelector(selectKrMarketHistory);
  const kiPrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
  const kiBS: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);
  const kiIS: KoreaInvestmentIncomeStatement = useAppSelector(getKoreaInvestmentIncomeStatement);
  const kiChart: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);
  const cfUserInfo = useAppSelector(selectCloudflareUserInfo);
  const cfStarred = useAppSelector(selectCloudflareStarredStocks);
  const aiStreamOutput = useAppSelector(selectAiStreamOutput);

  const usSearchInfo: KoreaInvestmentOverseasSearchInfo = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
  const usDetail: KoreaInvestmentOverseasPriceDetail = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);
  const usDaily: KoreaInvestmentOverseasPriceQuotationsDailyPrice = useAppSelector(getKoreaInvestmentUsMarketDailyPrice);
  const finnhubData: FinnhubFinancialsAsReportedType = useAppSelector(selectFinnhubFinancialsAsReported);

  // --- Handlers & Helpers ---
  useEffect(() => {
    const handleScroll = () => setFixed(window.scrollY > 140);
    window.addEventListener("scroll", handleScroll, { passive: true });
    if (cfStarred?.state === "init") dispatch(getCloudFlareStarredStocks());
    return () => window.removeEventListener("scroll", handleScroll);
  }, [cfStarred?.state, dispatch]);

  const formatDate = (date: string) => date.replaceAll("-", "");

  const getYearMatchIndex = (yearMonthDate: string) => {
    if (kiBS.output.length > 0) {
      const year = yearMonthDate?.slice(0, 4);
      for (let i = 0; i < kiBS.output.length; ++i) {
        if (kiBS.output[i].stac_yymm.startsWith(year)) return i;
      }
    }
    return 0;
  };

  const handleOnClickStarredIcon = () => {
    const stockName = kiChart.output1.hts_kor_isnm;
    const prevStarred: StarredStock[] = cfStarred.starredStock || [];
    const isStarred = prevStarred.some(item => item.name === stockName);
    let newStarred: StarredStock[] = isStarred
      ? prevStarred.filter(item => item.name !== stockName)
      : [...prevStarred, { name: stockName, date: new Date().toString(), isFavorite: true }];

    dispatch(setCloudFlareStarredStocks({ starredStocks: newStarred }));
  };

  const onSearchButton = (stockName: string) => {
    const isUs = us_tickers.includes(stockName.toUpperCase());
    if (!isUs) {
      setKrOrUs("KR");
      const corp: any = corpCodeJson;
      const jsonStock = corp[stockName];
      if (jsonStock) {
        const code = jsonStock.stock_code;
        dispatch(reqGetInquirePrice({ PDNO: code }));
        dispatch(reqGetInquireDailyItemChartPrice({ PDNO: code, FID_INPUT_DATE_1: formatDate(startDate), FID_INPUT_DATE_2: formatDate(endDate) }));
        dispatch(reqGetBalanceSheet({ PDNO: code }));
        dispatch(reqGetIncomeStatement({ PDNO: code }));
        setName(stockName);
        setWaitResponse(true);
        dispatch(addKrMarketHistory(stockName));
      }
    } else {
      setKrOrUs("US");
      const ticker = stockName.toUpperCase();
      dispatch(reqGetQuotationsSearchInfo({ PDNO: ticker }));
      dispatch(reqGetQuotationsPriceDetail({ PDNO: ticker }));
      dispatch(reqGetOverseasPriceQuotationsDailyPrice({ PDNO: ticker, FID_INPUT_DATE_1: formatDate(usStartDate) }));
      dispatch(reqGetFinnhubUsFinancialsReported(ticker));
      dispatch(addKrMarketHistory(stockName));
    }
  };

  // AI Stream Sync
  useEffect(() => {
    if (aiStreamOutput) {
      const lines = aiStreamOutput.split('\n');
      let content = "";
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { setWaitResponse(false); break; }
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.response) content += parsed.response;
          } catch (e) { }
        }
      }
      setResponse(content);
    }
  }, [aiStreamOutput]);

  // US Helpers
  const getUsCras = () => {
    const bs = finnhubData?.data?.[0]?.report?.bs ?? [];
    return Number(bs.find(i => i.concept === "us-gaap_AssetsCurrent" || i.concept === "AssetsCurrent")?.value ?? 1);
  };
  const getUsLblt = () => {
    const bs = finnhubData?.data?.[0]?.report?.bs ?? [];
    return Number(bs.find(i => i.concept === "us-gaap_Liabilities" || i.concept === "Liabilities")?.value ?? 1);
  };

  // --- Sub-Components ---
  const MdTableTemplate = (props: any) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: "ignore" }], rehypeHighlight]}
      components={{
        table: ({ node, ...p }) => (
          <table className="w-full table-auto border-collapse shadow-sm rounded-lg overflow-hidden text-[0.65rem] sm:text-sm dark:text-zinc-300" {...p} />
        ),
        th: ({ node, ...p }) => (
          <th className="px-2 py-2 bg-gray-100 dark:bg-zinc-800 font-bold text-left border-b dark:border-zinc-700" {...p} />
        ),
        td: ({ node, ...p }) => (
          <td className="px-2 py-2 border-b dark:border-zinc-800 text-right font-mono" {...p} />
        ),
        tr: ({ node, ...p }) => {
          const cellVal = (node?.children[1] as any)?.children[0]?.value;
          let bg = "";
          if (cellVal?.includes("%")) {
            const n = parseFloat(cellVal);
            if (n > 0) bg = "bg-green-50 dark:bg-green-900/10";
            else if (n < 0) bg = "bg-red-50 dark:bg-red-900/10";
          }
          return <tr className={`${bg} hover:bg-gray-50 dark:hover:bg-zinc-800/50`} {...p} />;
        }
      }}
    >
      {props.md_main}
    </ReactMarkdown>
  );

  const InfoRow = ({ label, value, unit, className = "" }: any) => (
    <div className={`flex gap-2 py-1 items-center border-b border-gray-100 dark:border-zinc-800/50 ${className}`}>
      <div className="w-4/12 text-right text-gray-500 dark:text-zinc-200 text-[11px]">{label}</div>
      <div className="w-6/12 text-right font-mono font-bold dark:text-zinc-200">{value}</div>
      <div className="w-2/12 text-left text-[10px] text-gray-400">{unit}</div>
    </div>
  );

  // --- Main Rendering Logic ---
  const renderKrContent = () => {
    if (kiChart.state !== "fulfilled" || kiBS.state !== "fulfilled" || kiPrice.state !== "fulfilled") {
      return <div className="py-20 text-center"><Spinner intent={Intent.PRIMARY} size={40} /></div>;
    }
    // 1. 테이블에 표시할 모든 항목 정의 (기존 코드에서 누락된 항목 포함)
    const bsRows = [
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
    ];

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* KR Header & Chart */}
        <Card elevation={Elevation.ONE} className="dark:bg-zinc-900 p-0 overflow-hidden rounded-xl border-none mb-4">
          <div className={`flex transition-all duration-300 ${fixed ? "fixed top-[64px] left-0 w-full z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur shadow-md px-4 py-2" : "p-4"}`}>
            <div className="w-7/12">
              {!fixed && <div className="text-[10px] text-zinc-500">{kiPrice.output.rprs_mrkt_kor_name} | {kiPrice.output.bstp_kor_isnm}</div>}
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black dark:text-white">{kiChart.output1.hts_kor_isnm}</h2>
                {cfUserInfo?.state === "fulfilled" && (
                  <Button minimal onClick={handleOnClickStarredIcon}>
                    {cfStarred?.starredStock?.some(i => i.name === kiChart.output1.hts_kor_isnm)
                      ? <StarSolid className="h-5 w-5 text-amber-400" />
                      : <StarOutline className="h-5 w-5 text-zinc-400" />}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400 underline decoration-dotted decoration-2">
                  {Number(kiChart.output1.stck_prpr).toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500">원 | {kiChart.output2[0].stck_bsop_date}</span>
              </div>
            </div>
            <div className="w-5/12 h-20">
              <LineChart
                data_array={[{ name: "Price", data: kiChart.output2.map(i => i.stck_oprc).reverse(), color: "#6366f1" }]}
                category_array={kiChart.output2.map(i => i.stck_bsop_date).reverse()}
                height={fixed ? 60 : 80} show_yaxis_label={false} legend_disable
              />
            </div>
          </div>
        </Card>

        {fixed && <div className="h-32" />}

        {/* Strategies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Section title="NCAV 청산가치 전략" collapsible className="dark:bg-zinc-400 rounded-xl overflow-hidden">
            <SectionCard className="dark:bg-zinc-950 ">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {`$$ 적정주가 = \\frac{(유동자산 - 총부채)}{상장주식수} $$`}
                </ReactMarkdown>
              </div>
              <MdTableTemplate md_main={getNcavTable(kiBS, kiChart)} />
            </SectionCard>
          </Section>

          <Section title="S-RIM 적정주가 전략" collapsible className="dark:bg-zinc-400 rounded-xl overflow-hidden">
            <SectionCard className="dark:bg-zinc-950">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {`$$ 기업가치 = 자기자본 + \\frac{자기자본 \\cdot (ROE - K_e)}{K_e} $$`}
                </ReactMarkdown>
              </div>
              <MdTableTemplate md_main={getSRIMTable(kiBS, kiIS, kiChart)} />
            </SectionCard>
          </Section>
        </div>

        {/* Market Data Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card elevation={Elevation.ZERO} className="dark:bg-zinc-900 border-none rounded-xl">
            <InfoRow label="PER" value={kiPrice.output.per} unit="배" />
            <InfoRow label="PBR" value={kiPrice.output.pbr} unit="배" />
            <InfoRow label="EPS" value={Number(kiPrice.output.eps).toLocaleString()} unit="원" />
            <InfoRow label="BPS" value={Number(kiPrice.output.bps).toLocaleString()} unit="원" />
          </Card>
          <Card elevation={Elevation.ZERO} className="dark:bg-zinc-900 border-none rounded-xl">
            <InfoRow label="52주 최저" value={`${Number(kiPrice.output.w52_lwpr).toLocaleString()}`} unit={`원 (${kiPrice.output.dryy_lwpr_date})`} />
            <InfoRow label="52주 최고" value={`${Number(kiPrice.output.w52_hgpr).toLocaleString()}`} unit={`원 (${kiPrice.output.w52_hgpr_date})`} className="bg-red-50 dark:bg-red-900/10" />
            <InfoRow label="시가총액" value={(Number(kiChart.output1.stck_prpr) * Number(kiChart.output1.lstn_stcn)).toLocaleString()} unit="원" />
            <InfoRow label="상장주식수" value={Number(kiChart.output1.lstn_stcn).toLocaleString()} unit="개" />
          </Card>
          <Card elevation={Elevation.ZERO} className="dark:bg-zinc-900 border-none rounded-xl">
            <InfoRow label="거래량" value={Number(kiPrice.output.acml_vol).toLocaleString()} unit="회" />
            <InfoRow label="전일 거래대금" value={Number(kiPrice.output.acml_tr_pbmn).toLocaleString()} unit="원" />
            <InfoRow label="대금/시총" value={(100 * Number(kiPrice.output.acml_tr_pbmn) / (Number(kiChart.output1.stck_prpr) * Number(kiChart.output1.lstn_stcn))).toFixed(3)} unit="%" />
          </Card>
        </div>

        {/* Financial Tables */}

        {/* 2. 렌더링 부분 */}
        <Section title="재무상태표 상세 (최근 5개년)" className="dark:bg-zinc-900 rounded-xl mb-6">
          <SectionCard className="p-0 overflow-x-auto dark:bg-zinc-950">
            <HTMLTable bordered striped interactive className="w-full text-right font-mono text-xs dark:text-zinc-300">
              <thead>
                <tr className="bg-gray-100 dark:bg-zinc-800">
                  <th className="text-left p-2 border-none min-w-[120px] text-zinc-500 dark:text-zinc-200">계정항목 (단위: 억)</th>
                  {kiBS.output.slice(0, 5).map((v, i) => (
                    <th key={i} className="text-right p-2 border-none text-zinc-500 dark:text-zinc-200">{v.stac_yymm}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bsRows.map((row) => (
                  <tr key={row.key} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                    <td className="text-left p-2 border-none font-sans text-zinc-500 dark:text-zinc-200">
                      {row.label}
                    </td>
                    {kiBS.output.slice(0, 5).map((v, i) => {
                      // TypeScript Index Signature 오류 해결: 
                      // v[row.key] 대신 v[row.key as keyof typeof v] 사용
                      const val = Number(v[row.key as keyof typeof v] || 0) * ONE_HUNDRED_MILLION;
                      return (
                        <td key={i} className="p-2 border-none text-zinc-500 dark:text-zinc-200">
                          {Util.UnitConversion(val, false)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          </SectionCard>
        </Section>

        {/* AI Insight */}
        {response && (
          <Card elevation={Elevation.TWO} className="mt-8 border-t-4 border-blue-500 dark:bg-zinc-900">
            <div className="flex items-center gap-2 mb-3 text-blue-500">
              <Icon icon={IconNames.CHAT} />
              <h3 className="text-sm font-bold m-0">AI 리서치 리포트</h3>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderUsContent = () => {
    if (usSearchInfo.state !== "fulfilled") {
      return <div className="py-20 text-center"><Spinner size={40} /></div>;
    }

    return (
      <div className="animate-in fade-in duration-500">
        <Card elevation={Elevation.ONE} className="dark:bg-zinc-900 p-0 overflow-hidden rounded-xl border-none mb-4">
          <div className={`flex transition-all duration-300 ${fixed ? "fixed top-[74px] left-0 w-full z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur shadow-md px-4 py-2" : "p-4"}`}>
            <div className="w-7/12">
              {!fixed && <Tag intent="primary" minimal className="text-[10px] text-zinc-500">{usSearchInfo.output.tr_mket_name} | {usDetail.output.e_icod}</Tag>}
              <h2 className="text-xl md:text-2xl font-black dark:text-white">{usSearchInfo.output.prdt_name}</h2>
              <p className="text-zinc-500 font-mono mt-1">{usSearchInfo.output.prdt_eng_name}</p>
              <div className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400 underline decoration-dotted decoration-2">
                {Number(usDetail.output.last).toFixed(2)} <span className="text-xs">{usDetail.output.curr}</span>
              </div>
            </div>
            <div className="w-5/12 h-20">
              <LineChart
                data_array={[{ name: "Price", data: usDaily.output2.map(i => i.clos).reverse(), color: "#818cf8" }]}
                category_array={usDaily.output2.map(i => i.xymd).reverse()}
                height={fixed ? 60 : 80} show_yaxis_label={false} legend_disable
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Section title="US NCAV 모형" className="dark:bg-zinc-400 rounded-xl">
            <SectionCard className="dark:bg-zinc-950">
              <MdTableTemplate md_main={getUsNcavTable(finnhubData, usDetail)} />
            </SectionCard>
          </Section>
          <Card className="dark:bg-zinc-900 border-none rounded-xl grid grid-cols-1 gap-1">
            <InfoRow label="PER" value={usDetail.output.perx} unit="배" />
            <InfoRow label="PBR" value={usDetail.output.pbrx} unit="배" />
            <InfoRow label="EPS" value={usDetail.output.epsx} unit={usDetail.output.curr} />
            <InfoRow label="시가총액" value={Number(usDetail.output.tomv).toLocaleString()} unit={usDetail.output.curr} />
          </Card>
        </div>

        {finnhubData.state === "fulfilled" && (
          <Section title="Finnhub Financials (As Reported)" className="dark:bg-zinc-900 rounded-xl">
            <FinnhubBalanceSheetTable data={finnhubData.data} />
          </Section>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* Header & Search */}
      <div className={`z-10 w-full transition-all duration-300 ${fixed ? "fixed top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur shadow-sm" : "relative bg-white dark:bg-zinc-900"}`}>
        <SearchAutocomplete placeHolder="🇰🇷 종목명 또는 🇺🇸 티커" onSearchButton={onSearchButton} validCorpNameArray={all_tickers} />
        <div className="flex px-4 py-1 gap-1 overflow-x-auto no-scrollbar border-t dark:border-zinc-800">
          {krMarketHistory.slice(-6).reverse().map((s, i) => (
            <Tag key={i} interactive round minimal onClick={() => onSearchButton(s)} className="cursor-pointer !text-black dark:!text-white hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors">
              {s}
            </Tag>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {krOrUs === "KR" ? renderKrContent() : renderUsContent()}
      </main>
    </div>
  );
}

// --- Logic Helpers (기존 수식 유지) ---

function getNcavTable(kiBS: any, kiChart: any) {
  const bsIdx = 0; // 최신 기준
  const cras = Number(kiBS.output[bsIdx]?.cras || 0) * ONE_HUNDRED_MILLION;
  const lblt = Number(kiBS.output[bsIdx]?.total_lblt || 0) * ONE_HUNDRED_MILLION;
  const lstn = Number(kiChart.output1.lstn_stcn);
  const prpr = Number(kiChart.output1.stck_prpr);

  const ratios = [1.0, 1.5, 2.0];
  const rows = ratios.map(r => {
    const target = (cras - lblt) / lstn;
    const returnPct = ((target / (prpr * r)) - 1) * 100;
    return `| ${r.toFixed(2)} | ${returnPct.toFixed(2)}% | ${Math.round(target).toLocaleString()} |`;
  }).join("\n");

  return `| ratio | Exp. Return | Target Price(₩) |\n|---|---|---|\n${rows}`;
}

function getSRIMTable(kiBS: any, kiIS: any, kiChart: any) {
  const total_cptl = Number(kiBS.output[0].total_cptl) * ONE_HUNDRED_MILLION;
  const thtr_ntin = Number(kiIS.output[0].thtr_ntin) * ONE_HUNDRED_MILLION;
  const ROE = (thtr_ntin / total_cptl) * 100;
  const lstn = Number(kiChart.output1.lstn_stcn);
  const prpr = Number(kiChart.output1.stck_prpr);

  const keList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 예시 할인율 Ke
  const rows = keList.map(ke => {
    const value = total_cptl * (1 + (ROE / 100 - ke / 100) / (ke / 100));
    const target = value / lstn;
    const returnPct = (target / prpr - 1) * 100;
    return `| ${ke.toFixed(1)}% | ${returnPct.toFixed(2)}% | ${Math.round(target).toLocaleString()} |`;
  }).join("\n");

  return `| Ke (%) | Exp. Return | Target Price(₩) |\n|---|---|---|\n${rows}`;
}

function getUsNcavTable(finnhub: any, detail: any) {
  const bs = finnhub?.data?.[0]?.report?.bs ?? [];
  const cras = Number(bs.find((i: any) => i.concept.includes("AssetsCurrent"))?.value ?? 0);
  const lblt = Number(bs.find((i: any) => i.concept.includes("Liabilities"))?.value ?? 0);
  const lstn = Number(detail.output.shar || 1);
  const last = Number(detail.output.last || 1);

  const ratios = [1.0, 1.5];
  const rows = ratios.map(r => {
    const target = (cras - lblt) / lstn;
    const returnPct = ((target / (last * r)) - 1) * 100;
    return `| ${r.toFixed(2)} | ${returnPct.toFixed(2)}% | ${target.toFixed(2)} |`;
  }).join("\n");

  return `| ratio | Exp. Return | Target Price($) |\n|---|---|---|\n${rows}`;
}