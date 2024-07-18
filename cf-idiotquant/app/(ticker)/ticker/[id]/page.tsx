"use client"

import ItemPanel from "@/components/itemPanel";
import { selectNcavList } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";

export default function Item({ params: { id } }: { params: { id: string } }) {
    const ncavList: object = useAppSelector(selectNcavList);

    return <ItemPanel
        ticker={decodeURI(id)}
        ncavList={ncavList}
    />
}

export const runtime = 'edge'