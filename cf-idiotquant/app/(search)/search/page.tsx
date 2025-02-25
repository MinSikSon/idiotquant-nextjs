"use client"

import React from "react";

import Login from "@/app/(login)/login/login"
import { selectState } from "@/lib/features/login/loginSlice";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, Chip, Input } from "@material-tailwind/react";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance, getKoreaInvestmentInquirePrice } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import corpCodeJson from "@/public/data/validCorpCode.json"
import { getCookie, isValidCookie, registerCookie, Util } from "@/components/util";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";
import Auth from "@/components/auth";
import { getKoreaInvestmentUsMaretSearchInfo, reqGetQuotationsSearchInfo } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { getKoreaInvestmentUsMaretPriceDetail, reqGetQuotationsPriceDetail } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import SearchAutocomplete from "@/components/searchAutoComplete";

export default function Search() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const loginState = useAppSelector(selectState);
  const kiApproval: KoreaInvestmentApproval = useAppSelector(getKoreaInvestmentApproval);
  const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
  const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
  const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
  const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);
  const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);


  const kiUsMaretSearchInfo: any = useAppSelector(getKoreaInvestmentUsMaretSearchInfo);
  const kiUsMaretPriceDetail: any = useAppSelector(getKoreaInvestmentUsMaretPriceDetail);

  const [time, setTime] = React.useState<any>("");

  const [stockName, setStockName] = React.useState<any>("");
  const [startDate, setStartDate] = React.useState<any>("2025-02-03");
  const [endDate, setEndDate] = React.useState<any>((new Date()).toISOString().split('T')[0]);

  React.useEffect(() => {
    // console.log(`[Search]`, `kiToken:`, kiToken);
    const isValidKiAccessToken = !!kiToken["access_token"];
    if (true == isValidKiAccessToken) {
      dispatch(reqGetInquireBalance(kiToken));
    }
  }, [kiToken]);

  React.useEffect(() => {
    // console.log(`React.useEffect []`);
  }, [])

  React.useEffect(() => {
    // console.log(`React.useEffect [kiInquireDailyItemChartPrice]`, kiInquireDailyItemChartPrice);
    // console.log(`kiInquireDailyItemChartPrice.output1.hts_avls`, kiInquireDailyItemChartPrice.output1.hts_avls, `HTS 시가총액 (억)`);
  }, [kiInquireDailyItemChartPrice])
  React.useEffect(() => {
    // 날짜별로 분류 필요
    // console.log(`React.useEffect [kiBalanceSheet]`, kiBalanceSheet);
    // console.log(`kiBalanceSheet.output[0].cras`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].cras : 0, `유동자산 (억)`);
    // console.log(`kiBalanceSheet.output[0].total_lblt`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].total_lblt : 0, `부채총계 (억)`);

  }, [kiBalanceSheet])

  React.useEffect(() => {
    // console.log(`React.useEffect [kiInquirePrice]`, kiInquirePrice);
  }, [kiInquirePrice])

  React.useEffect(() => {
    // console.log(`React.useEffect [kiUsMaretSearchInfo]`, kiUsMaretSearchInfo);
  }, [kiUsMaretSearchInfo])
  React.useEffect(() => {
    // console.log(`React.useEffect [kiUsMaretPriceDetail]`, kiUsMaretPriceDetail);
  }, [kiUsMaretPriceDetail])

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
    // console.log(`jsonStock`, jsonStock);
    // console.log(`stockName`, stockName, `jsonStock`, jsonStock);
    if (!!jsonStock) {
      const { stock_code } = jsonStock;
      // console.log(`stockCode`, stock_code);
      dispatch(reqGetInquirePrice({ koreaInvestmentToken: kiToken, PDNO: stock_code }));
      dispatch(reqGetInquireDailyItemChartPrice({ koreaInvestmentToken: kiToken, PDNO: stock_code, FID_INPUT_DATE_1: formatDate(startDate), FID_INPUT_DATE_2: formatDate(endDate) }))
      dispatch(reqGetBalanceSheet({ koreaInvestmentToken: kiToken, PDNO: stock_code }));
    }

    // setStockName("");
  }

  const handleInputStockName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStockName(e.target.value);
  };
  const handleInputStockNameOnKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ("" === e.currentTarget.value) {
      return;
    }
    if ("Enter" === e.key) {
      // console.log(e);
      onSearchButton(String(e.currentTarget.value));  // 엔터를 눌렀을 때 버튼 클릭
    }
  };

  const handleInputStartDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };
  const handleInputEndDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    console.log(`Date.now()`, Date.now());
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
    const value: number = ((((Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].cras) * 100000000) - (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].total_lblt) * 100000000)) / (Number(Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]) * ratio)) - 1) * 100);
    return <div className="font-mono">NCAV ({ratio.toFixed(1)}): <span className={`${value >= 0 ? "text-red-500" : "text-blue-500"}`}>{value.toFixed(2)}%</span></div>
  }

  function Foreign() {
    return <>
      <div>해외주식 financial info 갱신 (test: APPL)</div>
      <Button onClick={() => dispatch(reqGetQuotationsSearchInfo({ koreaInvestmentToken: kiToken, PDNO: "AAPL" }))}>/uapi/overseas-price/v1/quotations/search-info</Button>
      <div>
        <div>serach-info</div>
        <div className="text-xs">{JSON.stringify(kiUsMaretSearchInfo)}</div>
        <div className="text-xs">{!!kiUsMaretSearchInfo.output ? Object.keys(kiUsMaretSearchInfo.output).map((key: any) => { return <div key={key}>{key} : {kiUsMaretSearchInfo.output[key]}</div> }) : <></>}</div>
      </div>
      <Button onClick={() => dispatch(reqGetQuotationsPriceDetail({ koreaInvestmentToken: kiToken, PDNO: "AAPL" }))}>/uapi/overseas-price/v1/quotations/price-detail</Button>
      <div>
        <div>price-detail</div>
        <div className="text-xs">{JSON.stringify(kiUsMaretPriceDetail)}</div>
        <div className="text-xs">{!!kiUsMaretPriceDetail.output ? Object.keys(kiUsMaretPriceDetail.output).map((key: any) => { return <div key={key}>{key} : {kiUsMaretPriceDetail.output[key]}</div> }) : <></>}</div>
      </div>
    </>
  }

  if ("init" == loginState) {
    return <>
      <Login parentUrl={pathname} />
    </>;
  }

  if (false == isValidCookie("koreaInvestmentToken") || false == !!kiToken["access_token"]) {
    return <>
      <Auth />
    </>
  }

  return <>
    <SearchAutocomplete onSearchButton={onSearchButton} />

    <div className="flex flex-col justify-between border m-2">
      <div className="flex-1 p-2">
        <Input
          className=""
          color="black"
          label="날짜"
          type="date"
          value={endDate} crossOrigin={undefined}
          onChange={handleInputEndDate}
          min="2004-12-01"
          max={(new Date()).toISOString().split('T')[0]}
        />
      </div>
    </div>
    {"fulfilled" == kiInquireDailyItemChartPrice.state && "fulfilled" == kiBalanceSheet.state ?
      <>
        <div className="flex flex-col justify-between border mx-2 mb-1">
          <div className="flex-auto pl-2 text-sm font-bold">
            종목명: {kiInquireDailyItemChartPrice.output1.hts_kor_isnm}
          </div>
        </div>
        <div className="flex flex-col justify-between border mx-2 mb-1">
          <div className="flex-auto pl-2 text-sm font-bold">
            각종 투자 전략
          </div>
          <div className="flex-auto pl-4 text-xs">
            {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.0)}
          </div>
          <div className="flex-auto pl-4 text-xs">
            {getNcav(kiBalanceSheet, kiInquireDailyItemChartPrice, 1.5)}
          </div>
        </div>
      </>
      :
      <>
      </>}
    {"fulfilled" == kiInquireDailyItemChartPrice.state ?
      <div className="flex flex-col justify-between border mx-2 mb-1">
        <div className="flex pl-2 text-sm font-bold">
          주가정보 (날짜: {kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]})
        </div>
        <div className="flex pl-4 text-xs items-center">
          <Chip className="px-1 py-0" size="sm" variant="outlined" value={`주가`} />
          <div className="ml-1">
            {Number(Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"])).toLocaleString()}원
          </div>
        </div>
        <div className="flex pl-4 text-xs items-center">
          <Chip className="px-1 py-0" size="sm" variant="outlined" value={`상장주식수`} />
          <div className="ml-1">
            {Number(Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"])).toLocaleString()}개
          </div>
        </div>
        <div className="flex pl-4 text-xs items-center">
          <Chip className="px-1 py-0" size="sm" variant="outlined" value={`시가총액`} />
          <div className="ml-1">
            {(() => {
              const market_cap = (Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"]));
              return <div className="flex">
                <div className="ml-1">{market_cap.toLocaleString()}원</div>
                <div className="ml-1">({Util.UnitConversion(market_cap, true)})</div>
              </div>
            })()}
          </div>
        </div>
      </div>
      : <></>
    }
    {("fulfilled" == kiInquirePrice.state) ?
      <>
        <div className="flex flex-col justify-between border mx-2 mb-1">
          <div className="flex pl-2 text-sm font-bold">
            최근 영업일 기준 주가 정보
          </div>
          <div className="flex pl-4 text-xs items-center">
            <Chip className="px-1 py-0" size="sm" variant="outlined" value={`대표 시장 한글 명`} />
            <div className="ml-1">
              {kiInquirePrice.output["rprs_mrkt_kor_name"]}
            </div>
          </div>
          <div className="flex pl-4 text-xs items-center">
            <Chip className="px-1 py-0" size="sm" variant="outlined" value={`업종`} />
            <div className="ml-1">
              {kiInquirePrice.output["bstp_kor_isnm"]}
            </div>
          </div>
          <div className="flex pl-4 text-xs items-center">
            <Chip className="px-1 py-0" size="sm" variant="outlined" value={`PER`} />
            <div className="ml-1">
              {Number(Number(kiInquirePrice.output["per"])).toLocaleString()}배
            </div>
            <Chip className="px-1 ml-2 py-0" size="sm" variant="outlined" value={`EPS`} />
            <div className="ml-1">
              {Number(Number(kiInquirePrice.output["eps"]).toFixed(0)).toLocaleString()}원
            </div>
          </div>
          <div className="flex pl-4 text-xs items-center">
            <Chip className="px-1 py-0" size="sm" variant="outlined" value={`PBR`} />
            <div className="ml-1">
              {Number(Number(kiInquirePrice.output["pbr"])).toLocaleString()}배
            </div>
            <Chip className="px-1 ml-2 py-0" size="sm" variant="outlined" value={`BPS`} />
            <div className="ml-1">
              {Number(Number(kiInquirePrice.output["bps"]).toFixed(0)).toLocaleString()}원
            </div>
          </div>
          <div className="flex pl-4 text-xs items-center">
            <Chip className="px-1 py-0" size="sm" variant="outlined" value={`52주 최저가 / 최고가`} />
            <div className="ml-1">
              {Number(kiInquirePrice.output["w52_lwpr"]).toLocaleString()}원 / {Number(kiInquirePrice.output["w52_hgpr"]).toLocaleString()}원
            </div>
          </div>
        </div>
      </>
      : <></>
    }
    {"fulfilled" == kiInquireDailyItemChartPrice.state && "fulfilled" == kiBalanceSheet.state ?
      <div className="flex flex-col justify-between border mx-2 mb-1">
        <div className="flex pl-2 text-sm font-bold items-center">
          재무정보 (날짜: {kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].stac_yymm})
        </div>
        <div className="flex pl-4 text-xs items-center">
          <Chip className="px-1 py-0" size="sm" variant="outlined" value={`유동자산`} /> {(() => {
            const current_asset = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].cras) * 100000000);
            return <div className="flex">
              <div className="ml-1">{current_asset.toLocaleString()}원</div>
              <div className="ml-1">({Util.UnitConversion(current_asset, true)})</div>
            </div>
          })()}
        </div>
        <div className="flex pl-4 text-xs items-center">
          <Chip className="px-1 py-0" size="sm" variant="outlined" value={`부채총계`} /> {(() => {
            const total_liabilities = (Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].total_lblt) * 100000000);
            return <div className="flex">
              <div className="ml-1">{total_liabilities.toLocaleString()}원</div>
              <div className="ml-1">({Util.UnitConversion(total_liabilities, true)})</div>
            </div>
          })()}
        </div>
      </div>
      : <></>
    }
    {/* <Foreign /> */}

  </>
}
