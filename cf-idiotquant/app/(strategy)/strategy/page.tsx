"use client"

import { Web3Card2, Web3CardPropsType } from "@/components/topCreators2";
import { getStrategyInfoList, StrategyInfo } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";
import { Button } from "@material-tailwind/react";

export default function Strategy() {
    const strategyInfoList = useAppSelector(getStrategyInfoList);

    let propsList: Web3CardPropsType[] = strategyInfoList.map((item: StrategyInfo, key: any) => {
        return {
            title: <div className="">{item.title}</div>,
            subTitle: <div className="">{item.subTitle}</div>,
            // imgs: item.img,
            cardNum: String(key),
            profileImg: item.profileImg,
            summary: item.desc,
            // detail: item.detail,
        };
    });

    return <>
        {!!strategyInfoList.length ?
            <Web3Card2 title={'Investment strategy'} parentRouter={'strategy'} data={propsList} />
            :
            <Button variant="text" loading={true} className="font-mono">loading...</Button>
        }
    </>
}

