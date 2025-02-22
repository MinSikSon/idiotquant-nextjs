"use client"

import { useAppSelector } from "@/lib/hooks"
import TablesExample8, { TablesExample8PropsType } from "@/components/tableExample8";
import { getStrategyInfoList, STRATEGY_TABLE_HEAD } from "@/lib/features/strategy/strategySlice";
import NotFound from "@/app/not-found";
import { Chip } from "@material-tailwind/react";

export default function Item({ params: { id } }: { params: { id: number } }) {
    const strategyInfoList = useAppSelector(getStrategyInfoList);
    if (undefined == strategyInfoList[Number(id)]) {
        return <NotFound />;
    }

    const props: TablesExample8PropsType = {
        title: <div className="font-bold text-xl">{strategyInfoList[Number(id)].title}</div>,
        subTitle: strategyInfoList[Number(id)].subTitle,
        desc: <div className="flex flex-col font-bold">{((strategyInfoList[Number(id)].desc).split(",")).map(item => {
            // return <div>{item}</div>
            return <div key={item} className="flex items-center">{item.split(":").map((item, index) => {
                if (0 == index) {
                    return <Chip key={item} className="mr-2" variant="outlined" value={item} />
                }
                return <div key={item} className="text-sm">{item}</div>
            })}</div>
        })}</div>,
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