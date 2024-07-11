"use client"

import SearchPanel from "@/components/SearchPanel";

export default function Item({ params: { id } }: { params: { id: string } }) {

    return <SearchPanel
        ticker={decodeURI(id)}
    // marketInfoList={props.marketInfoList}
    />
}