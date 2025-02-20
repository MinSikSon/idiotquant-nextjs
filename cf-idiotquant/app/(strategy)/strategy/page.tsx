"use client"

import { Web3Card2, Web3CardPropsType } from "@/components/topCreators2";
import { getStrategyInfoList, StrategyInfo } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";
import Loading from "@/components/Loading";

export default function Strategy() {
    const strategyInfoList = useAppSelector(getStrategyInfoList);
    // console.log(`[Home] strategyInfoList`, strategyInfoList, strategyInfoList.length);
    // console.log(`[Home] strategyInfoList.length`, strategyInfoList.length);
    // console.log(`[Home] !!strategyInfoList`, !!strategyInfoList);

    let propsList: Web3CardPropsType[] = strategyInfoList.map((item: StrategyInfo, key: any) => {
        return {
            title: item.title,
            subTitle: item.subTitle,
            imgs: item.img,
            cardNum: String(key),
            profileImg: item.profileImg,
            summary: item.desc,
            // detail: item.detail,
        };
    });

    return <>
        {!!strategyInfoList.length ? <Web3Card2 title={'Strategy'} parentRouter={'strategy'} data={propsList} /> : <Loading loadingMsg={`loading...`} />}
    </>
}

