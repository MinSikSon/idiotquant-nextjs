"use client"

import TablesExample8, { Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import { selectStrategyTableRow, STRATEGY_TABLE_HEAD } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";
import React from "react";

export default function Home() {
  const strategyTableRow = useAppSelector(selectStrategyTableRow);

  const props: TablesExample8PropsType = {
    title: " 퀀트 종목 추천",
    subTitle: "저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.",
    tableHead: STRATEGY_TABLE_HEAD,
    tableRow: strategyTableRow,
  }

  return <>
    <TablesExample8 {...props} />
  </>
}
