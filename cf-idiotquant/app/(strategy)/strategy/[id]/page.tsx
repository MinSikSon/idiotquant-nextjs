"use client"

import { useAppSelector } from "@/lib/hooks"
import { TemplateArticle } from "@/components/templateArticle";
import Stategy from "../page";
import TablesExample8, { TablesExample8PropsType } from "@/components/tableExample8";
import { selectStrategyTableRow, selectStrategyFinancialDate, selectStrategyMarketDate, STRATEGY_TABLE_HEAD } from "@/lib/features/strategy/strategySlice";

export default function Item({ params: { id } }: { params: { id: number } }) {
    const strategyTableRow = useAppSelector(selectStrategyTableRow);
    const strategyFinancialDate = useAppSelector(selectStrategyFinancialDate);
    const strategyMarketDate = useAppSelector(selectStrategyMarketDate);

    const props: TablesExample8PropsType = {
        title: " 퀀트 종목 추천",
        subTitle: "저평가 주식을 추천합니다. 순유동자산 대비 시가총액이 얼마나 높은 지를 기준으로 합니다.",
        financial_date: strategyFinancialDate,
        market_date: strategyMarketDate,
        tableHead: STRATEGY_TABLE_HEAD,
        tableRow: strategyTableRow,
    }

    return <>
        <TablesExample8 {...props} />
    </>

}

export const runtime = 'edge'