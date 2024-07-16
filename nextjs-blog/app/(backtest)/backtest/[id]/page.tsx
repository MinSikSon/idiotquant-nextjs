"use client"

import ItemPanel from "@/components/itemPanel";
import { selectBackTestNcavList } from "@/lib/features/backtest/backtestSlice";
import { useAppSelector } from "@/lib/hooks";

export default function Item({ params: { id } }: { params: { id: string } }) {
    const ncavList = useAppSelector(selectBackTestNcavList);

    return <ItemPanel
        ticker={decodeURI(id)}
        ncavList={ncavList}
    />
}