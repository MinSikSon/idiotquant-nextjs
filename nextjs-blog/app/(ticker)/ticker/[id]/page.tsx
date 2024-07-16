"use client"

import SearchPanel from "@/components/SearchPanel";
import { selectNcavList } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";

export default function Item({ params: { id } }: { params: { id: string } }) {
    const ncavList: object = useAppSelector(selectNcavList);

    return <SearchPanel
        ticker={decodeURI(id)}
        ncavList={ncavList}
    // marketInfoList={props.marketInfoList}
    />
}