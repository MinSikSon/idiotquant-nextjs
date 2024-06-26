"use client"

import React from "react";
import { TitlePanel } from "@/components/panel/title";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { initFinancialInfo, selectFinancialInfo, selectLoaded } from "@/lib/features/stock/financialInfoSlice";

export default function Home() {
  // const [openedPanel, setOpenedPanel] = React.useState<any>("");
  // const [financialInfoList, setFinancialInfoList] = React.useState<any>("");
  // const [marketInfoList, setMarketInfoList] = React.useState<any>("");
  // const [backTestResultLog, setBackTestResultLog] = React.useState<any>([]);
  const financialInfoLoaded = useAppSelector(selectLoaded);

  if (false == financialInfoLoaded) {
    console.log(`financialInfoLoaded:`, financialInfoLoaded);
    const dispatch = useAppDispatch();
    dispatch(initFinancialInfo());
  }

  const financialInfo = useAppSelector(selectFinancialInfo);
  console.log(`financialInfo`, financialInfo);
  // const financialInfo = getFinancialInfo();
  //   const marketInfo = getMarketInfo();
  //   setFinancialInfoList(financialInfo);
  //   setMarketInfoList(marketInfo);

  return <>
    <TitlePanel />
  </>;
}
