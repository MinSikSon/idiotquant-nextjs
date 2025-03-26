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

const DEBUG = false;

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

  const [stockName, setStockName] = React.useState<any>("");
  const [startDate, setStartDate] = React.useState<any>("2025-02-03");
  const [endDate, setEndDate] = React.useState<any>((new Date()).toISOString().split('T')[0]);

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
  }, [kiInquirePrice])

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
      dispatch(reqGetInquirePrice({ koreaInvestmentToken: kiToken, PDNO: stock_code }));
      dispatch(reqGetInquireDailyItemChartPrice({ koreaInvestmentToken: kiToken, PDNO: stock_code, FID_INPUT_DATE_1: formatDate(startDate), FID_INPUT_DATE_2: formatDate(endDate) }))
      dispatch(reqGetBalanceSheet({ koreaInvestmentToken: kiToken, PDNO: stock_code }));
    }
  }

  const handleInputEndDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    if (DEBUG) console.log(`Date.now()`, Date.now());
    const date = new Date(e.target.value);

    // 5일을 빼기 위해 setDate() 사용
    date.setDate(date.getDate() - 5);

    setStartDate(date.toISOString().split('T')[0]); // 결과: "2025-01-30"
  };

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
        <div className="w-3/12 text-right text-[0.6rem]">전략-NCAV({ratio.toFixed(1)})</div>
        <div className="w-5/12 text-right">목표가: <span className={`${value >= 0 ? "text-red-500" : "text-blue-500"}`}>{(Number(target_price.toFixed(0)).toLocaleString())}원</span></div>
        <div className="w-4/12"><span className={`${value >= 0 ? "text-red-500" : "text-blue-500"}`}>{value.toFixed(2)}%</span></div>
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

  return <>
    <SearchAutocomplete placeHolder={"회사명을 검색하세요..."} onSearchButton={onSearchButton} validCorpNameArray={validCorpNameArray} />
    <div className="border border-black rounded p-1 m-1">
      <div className="text-base">
        {kiInquireDailyItemChartPrice.output1.hts_kor_isnm} - {kiInquirePrice.output["rprs_mrkt_kor_name"]}
      </div>
      <div className="text-xs border border-black rounded p-1 m-1">
        <div className="flex gap-2">
          <div className="w-3/12 bg-yellow-200 text-right">현재가</div>
          <div className="w-5/12 bg-yellow-100 text-right">{Number(kiInquireDailyItemChartPrice.output1["stck_prpr"]).toLocaleString()} 원</div>
          <div className="w-4/12 text-[0.6rem]">{kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]}</div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right">시가총액</div>
          <div className="w-9/12 text-right">
            {(() => {
              const market_cap = (Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]));
              return <div className="flex gap-2">
                <div className="w-7/12 text-[0.6rem]">{market_cap.toLocaleString()} 원</div>
                <div className="w-5/12 text-[0.6rem] text-left">({Util.UnitConversion(market_cap, true)})</div>
              </div>
            })()}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right">상장주식수</div>
          <div className="w-5/12 text-right">{Number(Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"])).toLocaleString()} 개</div>
          <div className="w-4/12"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-full">
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
                      size: 4, // 마지막 마커 크기
                    },
                  ],
                }
              }
            />
          </div>
        </div>
      </div>
      <div className="text-xs border border-black rounded p-1 m-1">
        <div className="flex gap-2">
          <div className="w-3/12 text-right">52주 최저가</div>
          <div className="w-5/12 text-right">{Number(kiInquirePrice.output["w52_lwpr"]).toLocaleString()} 원</div>
          <div className="w-4/12 text-[0.6rem]">({kiInquirePrice.output["dryy_lwpr_date"]})</div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right bg-red-300">52주 최고가</div>
          <div className="w-5/12 text-right bg-red-200">{Number(kiInquirePrice.output["w52_hgpr"]).toLocaleString()} 원</div>
          <div className="w-4/12 text-[0.6rem]">({kiInquirePrice.output["w52_hgpr_date"]})</div>
        </div>
      </div>
      <div className="text-xs border border-black rounded p-1 m-1">
        <div className="flex gap-2">
          <div className="w-3/12 text-right">PER</div>
          <div className="w-5/12 text-right">{Number(Number(kiInquirePrice.output["per"])).toLocaleString()} 배</div>
          <div className="w-4/12"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right">PBR</div>
          <div className="w-5/12 text-right">{Number(Number(kiInquirePrice.output["pbr"])).toLocaleString()} 배</div>
          <div className="w-4/12"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right">EPS</div>
          <div className="w-5/12 text-right">{Number(Number(kiInquirePrice.output["eps"])).toLocaleString()} 원</div>
          <div className="w-4/12"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right">BPS</div>
          <div className="w-5/12 text-right">{Number(Number(kiInquirePrice.output["bps"])).toLocaleString()} 원</div>
          <div className="w-4/12"></div>
        </div>
      </div>
      <div className="text-xs border border-black rounded p-1 m-1">
        <div className="flex gap-2">
          <div className="w-3/12 text-right">업종</div>
          <div className="w-9/12 text-left">{kiInquirePrice.output["bstp_kor_isnm"]}</div>
          {/* <div className="w-4/12"></div> */}
        </div>
      </div>
      <div className="text-xs border border-black rounded p-1 m-1">
        <div className="flex gap-2">
          <div className="w-3/12 text-right">거래량</div>
          <div className="w-5/12 text-right">{Number(kiInquirePrice.output["acml_vol"]).toLocaleString()} 회</div>
          <div className="w-4/12"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right">전일 거래대금</div>
          <div className="w-5/12 text-right">{Number(kiInquirePrice.output["acml_tr_pbmn"]).toLocaleString()} 원</div>
          <div className="w-4/12"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right text-[0.6rem]">거래대금/시가총액</div>
          <div className="w-5/12 text-right">{(100 * Number(kiInquirePrice.output["acml_tr_pbmn"]) / (Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]))).toFixed(3)} %</div>
          <div className="w-4/12"></div>
        </div>
      </div>
      <div className="text-xs border border-red-500 rounded p-1 m-1">
        {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.0)}
        {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.5)}
      </div>
      <div className="text-xs border border-black rounded p-1 m-1">
        <div className="flex gap-2">
          <div className="w-3/12 text-right">재무-유동자산</div>
          <div className="w-9/12 text-right">
            {(() => {
              const current_asset = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].cras) * 100000000);
              return <div className="flex gap-2">
                <div className="w-8/12 text-right">{current_asset.toLocaleString()} 원</div>
                <div className="w-4/12 text-right">({Util.UnitConversion(current_asset, true)})</div>
                {/* <div className="w-1/12"></div> */}
              </div>
            })()}
          </div>
          {/* <div className="w-4/12"></div> */}
        </div>
        <div className="flex gap-2">
          <div className="w-3/12 text-right">재무-부채총계</div>
          <div className="w-9/12 text-right">
            {(() => {
              const total_liabilities = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].total_lblt) * 100000000);
              return <div className="flex gap-2">
                <div className="w-8/12 text-right">{total_liabilities.toLocaleString()} 원</div>
                <div className="w-4/12 text-right">({Util.UnitConversion(total_liabilities, true)})</div>
                {/* <div className="w-1/12"></div> */}
              </div>
            })()}
          </div>
        </div>
      </div>
    </div>
  </>
}
