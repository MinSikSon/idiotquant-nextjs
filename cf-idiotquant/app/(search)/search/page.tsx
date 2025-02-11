"use client"

import React from "react";

import Login from "@/app/(login)/login/login"
import { selectState } from "@/lib/features/login/loginSlice";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { Button, Input } from "@material-tailwind/react";
import { reqPostApprovalKey, reqPostToken, reqGetInquireBalance, reqPostOrderCash, reqGetInquirePrice, KoreaInvestmentInquirePrice, getKoreaInvestmentInquirePrice, reqGetInquireDailyItemChartPrice, getKoreaInvestmentInquireDailyItemChartPrice, KoreaInvestmentInquireDailyItemChartPrice, reqGetBalanceSheet, getKoreaInvestmentBalanceSheet, KoreaInvestmentBalanceSheet } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { getKoreaInvestmentApproval, getKoreaInvestmentToken, getKoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { KoreaInvestmentApproval, KoreaInvestmentToken, KoreaInvestmentBalance } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { setKoreaInvestmentToken } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";

import corpCodeJson from "@/public/data/corpCode.json"
import { getCookie, isValidCookie, registerCookie } from "@/components/util";
import { MagnifyingGlassIcon, XCircleIcon } from "@heroicons/react/24/outline";

export default function Search() {
  const pathname = usePathname();
  const loginState = useAppSelector(selectState);
  const dispatch = useAppDispatch();

  const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);
  const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
  const kiInquirePrice: KoreaInvestmentInquirePrice = useAppSelector(getKoreaInvestmentInquirePrice);
  const kiBalanceSheet: KoreaInvestmentBalanceSheet = useAppSelector(getKoreaInvestmentBalanceSheet);
  const kiInquireDailyItemChartPrice: KoreaInvestmentInquireDailyItemChartPrice = useAppSelector(getKoreaInvestmentInquireDailyItemChartPrice);

  const [time, setTime] = React.useState<any>('');

  const [stockName, setStockName] = React.useState<any>("");
  const [startDate, setStartDate] = React.useState<any>("2025-02-03");
  const [endDate, setEndDate] = React.useState<any>((new Date()).toISOString().split('T')[0]);

  function reload(seq: any) {
    if ("init" == loginState) {
      return;
    }

    setTime(new Date());

    // login check ?
    // if ("init" == kiApproval.state) 
    {
      dispatch(reqPostApprovalKey());
    }

    const isValidCookieKoreaInvestmentToken = isValidCookie("koreaInvestmentToken");
    const cookieKoreaInvestmentToken = getCookie("koreaInvestmentToken");
    console.log(`cookieKoreaInvestmentToken`, typeof cookieKoreaInvestmentToken, cookieKoreaInvestmentToken);
    if (true == isValidCookieKoreaInvestmentToken) {
      const jsonCookieKoreaInvestmentToken = JSON.parse(cookieKoreaInvestmentToken);
      console.log(`jsonCookieKoreaInvestmentToken`, typeof jsonCookieKoreaInvestmentToken, jsonCookieKoreaInvestmentToken);
    }

    // const koreaInvestmentToken = sessionStorage.getItem('koreaInvestmentToken');
    // console.log(`koreaInvestmentToken`, koreaInvestmentToken, typeof koreaInvestmentToken, !!koreaInvestmentToken);
    if (false == isValidCookieKoreaInvestmentToken) {
      if ("init" == kiBalance.state && "" == kiToken["access_token"]) {
        dispatch(reqPostToken()); // NOTE: 1분에 한 번씩만 token 발급 가능
      }
      else {
        // sessionStorage.setItem('koreaInvestmentToken', JSON.stringify(kiToken));
        registerCookie("koreaInvestmentToken", JSON.stringify(kiToken));
      }
    }
    else {
      const jsonCookieKoreaInvestmentToken = JSON.parse(cookieKoreaInvestmentToken);
      // const json = JSON.parse(koreaInvestmentToken);
      const json = jsonCookieKoreaInvestmentToken;
      // console.log(`json`, json);
      const currentDate = time;
      const expiredDate = new Date(json["access_token_token_expired"].replace(" ", "T"));
      const skipPostToken = (expiredDate > currentDate);
      console.log(`skipPostToken`, skipPostToken);
      if (false == skipPostToken) {
        console.log(`expiredDate`, expiredDate, `currentDate`, currentDate);
        dispatch(reqPostToken());
      }
      else {
        if (false == !!kiToken["access_token"]) {
          dispatch(setKoreaInvestmentToken(json));
        }
      }
    }

    console.log(`[OpenApi] ${seq}-2 kiToken`, kiToken);
    console.log(`[OpenApi] ${seq}-2 loginState`, loginState);
    // if ("init" == kiBalance.state && "" != kiToken["access_token"]) {
    if ("" != kiToken["access_token"]) {
      dispatch(reqGetInquireBalance(kiToken));
    }

    console.log(`[OpenApi] kiInquirePrice`, kiInquirePrice);
    console.log(`[OpenApi] kiInquireDailyItemChartPrice`, kiInquireDailyItemChartPrice);
    console.log(`[OpenApi] kiBalanceSheet`, kiBalanceSheet);
  }
  React.useEffect(() => {
    console.log(`React.useEffect [kiToken]`, kiToken);
    reload('1');
  }, [kiToken]);

  React.useEffect(() => {
    console.log(`React.useEffect []`);
  }, [])

  React.useEffect(() => {
    console.log(`React.useEffect [kiInquireDailyItemChartPrice]`, kiInquireDailyItemChartPrice);
    console.log(`kiInquireDailyItemChartPrice.output1.hts_avls`, kiInquireDailyItemChartPrice.output1.hts_avls, `HTS 시가총액 (억)`);
  }, [kiInquireDailyItemChartPrice])
  React.useEffect(() => {
    // 날짜별로 분류 필요
    console.log(`kiBalanceSheet.output[0].cras`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].cras : 0, `유동자산 (억)`);
    console.log(`kiBalanceSheet.output[0].total_lblt`, kiBalanceSheet.output.length > 0 ? kiBalanceSheet.output[0].total_lblt : 0, `부채총계 (억)`);

  }, [kiBalanceSheet])



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
    return <div>NCAV ({ratio.toFixed(1)}): <span className={`${value >= 0 ? "text-blue-500" : "text-red-500"}`}>{value.toFixed(2)}%</span></div>
  }

  if ("init" == loginState) {
    return <>
      <Login parentUrl={pathname} />
    </>;
  }

  return <>
    <div className="flex items-center border m-2 p-2">
      <div className="flex-1" >
        <Input
          className=""
          color="black"
          label="주식 검색"
          type="string"
          value={stockName}
          crossOrigin={undefined}
          onChange={handleInputStockName}
          onKeyUp={handleInputStockNameOnKeyUp}
        />
      </div>
      <div className="flex" >
        <Button className="py-2 px-2" variant="outlined" value={stockName} onClick={() => onSearchButton(stockName)}>
          <MagnifyingGlassIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex" >
        <Button className="py-2 px-2" variant="outlined" value={stockName} onClick={() => setStockName("")}>
          <XCircleIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
    <div className="flex flex-col justify-between border m-2">
      <div className="flex-auto p-2">
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
    {kiInquireDailyItemChartPrice.output2.length > 0 && kiBalanceSheet.output.length > 0 ?
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
    {kiInquireDailyItemChartPrice.output2.length > 0 ?
      <div className="flex flex-col justify-between border mx-2 mb-1">
        <div className="flex-auto pl-2 text-sm font-bold">
          주가정보 (날짜: {kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"]})
        </div>
        <div className="flex-auto pl-4 text-xs">
          주가: {Number(Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"])).toLocaleString()}원
        </div>
        <div className="flex-auto pl-4 text-xs">
          상장주식수: {Number(Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"])).toLocaleString()}개
        </div>
        <div className="flex-auto pl-4 text-xs">
          시가총액: {Number(Number(kiInquireDailyItemChartPrice.output2[0]["stck_oprc"]) * Number(kiInquireDailyItemChartPrice.output1["lstn_stcn"])).toLocaleString()}원
        </div>
      </div>
      : <></>
    }
    {kiInquireDailyItemChartPrice.output2.length > 0 && kiBalanceSheet.output.length > 0 ?
      <div className="flex flex-col justify-between border mx-2 mb-1">
        <div className="flex-auto pl-2 text-sm font-bold">
          재무정보 (날짜: {kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].stac_yymm})
        </div>
        <div className="flex-auto pl-4 text-xs">
          유동자산: {(Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].cras) * 100000000).toLocaleString()}원
        </div>
        <div className="flex-auto pl-4 text-xs">
          부채총계: {(Number(kiBalanceSheet.output[getYearMatchIndex(kiInquireDailyItemChartPrice.output2[0]["stck_bsop_date"])].total_lblt) * 100000000).toLocaleString()}원
        </div>

      </div>
      : <></>
    }
  </>
}
