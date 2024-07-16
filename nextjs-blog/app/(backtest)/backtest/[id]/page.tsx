"use client"

import { GetMeredStocksList, GetStocksFilteredByStrategyNCAV } from "@/components/legacy/Strategy";
import SearchPanel from "@/components/SearchPanel";
import { selectBackTestNcavList, selectStartFinancialInfo, selectStartMarketInfo } from "@/lib/features/backtest/backtestSlice";
import { selectNcavList } from "@/lib/features/strategy/strategySlice";
import { useAppSelector } from "@/lib/hooks";

export default function Item({ params: { id } }: { params: { id: string } }) {
    // const startFinancialInfo = useAppSelector(selectStartFinancialInfo);
    // const startMarketInfo = useAppSelector(selectStartMarketInfo);

    // const mergedStockInfo = GetMeredStocksList(startFinancialInfo, startMarketInfo);
    // const dicFilteredStocks = GetStocksFilteredByStrategyNCAV(mergedStockInfo);
    const ncavList = useAppSelector(selectBackTestNcavList);
    return <SearchPanel
        ticker={decodeURI(id)}
        ncavList={ncavList}
    // marketInfoList={props.marketInfoList}
    />
}