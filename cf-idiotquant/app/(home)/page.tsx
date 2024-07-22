"use client"

import { Ticker } from "@/components/main";
import TablesExample8, { Example8TableHeadType, Example8TableRowType, TablesExample8PropsType } from "@/components/tableExample8";
import React from "react";

export default function Home() {

  const TABLE_HEAD: Example8TableHeadType[] = [
    {
      // head: "Digital Asset",
      head: "종목명",
      customeStyle: "!text-left",
    },
    {
      // head: "Price",
      head: "주가",
      customeStyle: "text-right",
    },
    {
      // head: "Change",
      head: "기대수익율",
      customeStyle: "text-right",
    },
    // {
    //     head: "Volume",
    //     customeStyle: "text-right",
    // },
    {
      // head: "Market Cap",
      head: "시가 총액",
      customeStyle: "text-right",
    },
    {
      head: "Trend",
      customeStyle: "text-right",
    },
    // {
    //     head: "Actions",
    //     customeStyle: "text-right",
    // },
  ];


  const TABLE_ROW: Example8TableRowType[] = [
    {
      img: "/logos/btc.png",
      digitalAsset: "BTC",
      detail: "Bitcoin",
      price: "$46,727.30",
      change: "+2.92%",
      volume: "$45.31B",
      market: "$915.61B",
      color: "green",
      trend: 4,
    },
    {
      img: "/logos/eth.png",
      digitalAsset: "ETH",
      detail: "Ethereum",
      price: "$2,609.30",
      change: "+6.80%",
      volume: "$23.42B",
      market: "$313.58B",
      color: "green",
    },
    {
      img: "/logos/usdt.png",
      digitalAsset: "USDT",
      detail: "TetherUS",
      price: "$1.00",
      change: "-0.01%",
      volume: "$94.37B",
      market: "$40,600",
      color: "red",
    },
    {
      img: "/logos/sol.png",
      digitalAsset: "SOL",
      detail: "Solana",
      price: "$1.00",
      change: "+6.35%",
      volume: "$3.48B",
      market: "$43.26B",
      color: "green",
    },
    {
      img: "/logos/xrp.png",
      digitalAsset: "XRP",
      detail: "Ripple",
      price: "$100.19",
      change: "-0.95%",
      volume: "$1.81B",
      market: "$32.45B",
      color: "red",
    },
  ];

  const props: TablesExample8PropsType = {
    title: " 퀀트 종목 추천",
    subTitle: "저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.",
    tableHead: TABLE_HEAD,
    tableRow: TABLE_ROW,
  }

  return <>
    <Ticker />
    <TablesExample8 {...props} />
  </>
}
