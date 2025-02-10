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

import corpCodeJson from "@/public/data/corpCode.json"

export default function Search() {
  const pathname = usePathname();
  const loginState = useAppSelector(selectState);
  const dispatch = useAppDispatch();

  const kiToken: KoreaInvestmentToken = useAppSelector(getKoreaInvestmentToken);

  const [stockName, setStockName] = React.useState<any>("");
  const [startDate, setStartDate] = React.useState<any>("2025-02-03");
  const [endDate, setEndDate] = React.useState<any>("2025-02-07");


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

    setStockName("");
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
  };

  return <>
    {"init" == loginState ?
      <Login parentUrl={pathname} />
      :
      <>
        <div className="flex justify-between border m-2">
          <div className="flex-auto p-2">
            <Input
              className=""
              color="black"
              label="주식 검색"
              type='string'
              value={stockName}
              crossOrigin={undefined}
              onChange={handleInputStockName}
              onKeyUp={handleInputStockNameOnKeyUp}
            />
          </div>
          <div className="flex-auto p-2">
            <Button className="" variant="outlined" value={stockName} onClick={() => {
              // console.log(`stockName`, stockName);
              onSearchButton(stockName);
            }}>검색</Button>
          </div>
        </div>
        <div className="flex flex-col justify-between border m-2">
          <div className="flex-auto p-2">
            <Input
              className=""
              color="black"
              label="시작날짜"
              type="date"
              value={startDate} crossOrigin={undefined}
              onChange={handleInputStartDate}
            />
          </div>
          <div className="flex-auto p-2">
            <Input
              className=""
              color="black"
              label="종료날짜"
              type="date"
              value={endDate} crossOrigin={undefined}
              onChange={handleInputEndDate}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between border m-2">
          <div className="flex-auto p-2">
            {formatDate(startDate)}~{formatDate(endDate)}
          </div>
        </div>
      </>
    }
  </>
}
