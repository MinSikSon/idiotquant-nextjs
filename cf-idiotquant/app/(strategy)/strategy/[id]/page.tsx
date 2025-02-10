"use client"

import { useAppSelector } from "@/lib/hooks"
import TablesExample8, { TablesExample8PropsType } from "@/components/tableExample8";
import { getStrategyInfoList, STRATEGY_TABLE_HEAD } from "@/lib/features/strategy/strategySlice";
import NotFound from "@/app/not-found";

export default function Item({ params: { id } }: { params: { id: number } }) {
    const strategyInfoList = useAppSelector(getStrategyInfoList);

    // console.log(`Number(id)`, Number(id));
    // console.log(`strategyInfoList[Number(id)]`, strategyInfoList[Number(id)]);
    if (undefined == strategyInfoList[Number(id)]) {
        return <NotFound />;
    }

    const props: TablesExample8PropsType = {
        title: strategyInfoList[Number(id)].title,
        subTitle: strategyInfoList[Number(id)].subTitle,
        desc: strategyInfoList[Number(id)].desc,
        financial_date: `- financial date: ${strategyInfoList[Number(id)].financial_date}`,
        market_date: `- market_date: ${strategyInfoList[Number(id)].market_date}`,
        tableHead: STRATEGY_TABLE_HEAD, // const
        tableRow: strategyInfoList[Number(id)].STRATEGY_TABLE_ROW,
    }

    return <>
        <TablesExample8 {...props} />
    </>

}

export const runtime = 'edge'