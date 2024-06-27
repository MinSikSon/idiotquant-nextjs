"use client"

import React, { Suspense } from "react";
import { TitlePanel } from "@/components/panel/title";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { initFinancialInfo, selectFinancialInfo, selectLoaded } from "@/lib/features/financialInfo/financialInfoSlice";

export default function Home() {
  // const [openedPanel, setOpenedPanel] = React.useState<any>("");
  // const [financialInfoList, setFinancialInfoList] = React.useState<any>("");
  // const [marketInfoList, setMarketInfoList] = React.useState<any>("");
  // const [backTestResultLog, setBackTestResultLog] = React.useState<any>([]);
  const loaded = useAppSelector(selectLoaded);
  const financialInfo = useAppSelector(selectFinancialInfo);
  const dispatch = useAppDispatch();

  if (false == loaded) {
    console.log(`loaded:`, loaded);
    const year: string = "2023";
    const quarter: string = "4";
    dispatch(initFinancialInfo({ year, quarter }));
  }

  console.log(`financialInfo`, financialInfo);
  // const financialInfo = getFinancialInfo();
  //   const marketInfo = getMarketInfo();
  //   setFinancialInfoList(financialInfo);
  //   setMarketInfoList(marketInfo);

  return <>
    <Suspense fallback={<h1>Loading movie info</h1>}>
      <TitlePanel />
    </Suspense>
  </>;
}
