"use client"

import React from "react";
import { useAppSelector } from "@/lib/hooks";
import { selectStrategyList } from "@/lib/features/strategy/strategySlice";
import { Web3Card2, Web3CardPropsType } from "@/components/topCreators2";

export default function Home() {
  const strategyList = useAppSelector(selectStrategyList);
  console.log(`[Home] strategyList`, strategyList);

  let props: Web3CardPropsType = {
    name: 'NCAV',
    desc: 'Net-Current Asset Value',
    imgs: 'https://www.investopedia.com/thmb/cOymT7ainOZSwk5xh7KmI0CfRME=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/Stock_source-d84b531c2d3441a7a0611e8af4d9d750.jpg',
    cardNum: '0',
    profileImg: 'https://www.investopedia.com/thmb/cOymT7ainOZSwk5xh7KmI0CfRME=/750x0/filters:no_upscale():max_bytes(150000):strip_icc():format(webp)/Stock_source-d84b531c2d3441a7a0611e8af4d9d750.jpg',
    summary: '저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.',

    detail: strategyList,
  }
  const propsList: Web3CardPropsType[] = [
    props
  ]

  return <>
    {!!strategyList ? <Web3Card2 title={'Strategy'} parentRouter={'strategy'} data={propsList} /> : <></>}
  </>
}
