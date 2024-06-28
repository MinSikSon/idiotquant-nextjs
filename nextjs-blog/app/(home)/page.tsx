"use client"

import React, { Suspense, useEffect } from "react";
import { TitlePanel } from "@/components/panel/title";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { initFinancialInfo, selectFinancialInfo, selectLoaded } from "@/lib/features/financialInfo/financialInfoSlice";
import { initMarketInfo, selectMarketInfo, selectMarketInfoLoaded } from "@/lib/features/marketInfo/marketInfoSlice";

export default function Home() {
  // const [openedPanel, setOpenedPanel] = React.useState<any>("");
  // const [financialInfoList, setFinancialInfoList] = React.useState<any>("");
  // const [marketInfoList, setMarketInfoList] = React.useState<any>("");
  // const [backTestResultLog, setBackTestResultLog] = React.useState<any>([]);
  const dispatch = useAppDispatch();

  const financialInfoLoaded = useAppSelector(selectLoaded);
  const financialInfo: object = useAppSelector(selectFinancialInfo);

  const marketInfoLoaded = useAppSelector(selectMarketInfoLoaded);
  const marketInfo: object = useAppSelector(selectMarketInfo);

  useEffect(() => {
    if (false == financialInfoLoaded) {
      console.log(`loaded:`, financialInfoLoaded);
      const year: string = "2023";
      const quarter: string = "4";
      dispatch(initFinancialInfo({ year, quarter }));
    }
    if (false == marketInfoLoaded) {
      console.log(`loaded:`, marketInfoLoaded);
      const date: string = "20230426";
      dispatch(initMarketInfo({ date }));
    }
  }, [])

  // const financialInfo = getFinancialInfo();
  //   const marketInfo = getMarketInfo();
  //   setFinancialInfoList(financialInfo);
  //   setMarketInfoList(marketInfo);

  console.log(`financialInfo`, financialInfo);
  console.log(`marketInfo`, marketInfo);

  return <>
    <TitlePanel />
  </>;
}
