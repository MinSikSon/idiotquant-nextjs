"use client"

import { Web3Card2, Web3CardPropsType } from "@/components/topCreators2";
import { getStrategyInfoList, StrategyInfo } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";
import { getRandomMainImage, getRandomUserImage } from "@/app/(strategy)/strategy/image";

export default function Strategy() {
    const strategyInfoList = useAppSelector(getStrategyInfoList);
    console.log(`[Home] strategyInfoList`, strategyInfoList, strategyInfoList.length);

    let propsList: Web3CardPropsType[] = strategyInfoList.map((item: StrategyInfo, key: any) => {
        return {
            title: item.title,
            subTitle: item.subTitle,
            imgs: item.img,
            cardNum: String(key),
            profileImg: item.profileImg,
            summary: `(추천 종목 수: ${item.stockList.length}) ${item.desc}`,
            // detail: item.detail,
        };
    });

    return <>
        {!!strategyInfoList ? <Web3Card2 title={'Strategy'} parentRouter={'strategy'} data={propsList} /> : <></>}
    </>
}

