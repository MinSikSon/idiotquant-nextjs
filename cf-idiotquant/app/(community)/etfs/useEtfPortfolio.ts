import { useEffect, useState } from "react";
import { defaultPortfolioKey, useRepresentativePortfolio } from "@/lib/features/algorithmTrade/representativePortfolio";
import { activePortfolioTrading, heldPortfolioTickers, type PortfolioBalanceRow } from "@/lib/features/algorithmTrade/portfolioStocks";
import { fetchTradingStatus } from "@/lib/features/algorithmTrade/tradingStatusAPI";
import { getKrCapital, getUsCapital } from "@/lib/features/capital/capitalAPI";
import type { KrUsCapitalType } from "@/lib/features/capital/capitalSlice";
import { getKakaoMemberList } from "@/lib/features/kakao/kakaoAPI";
import { getInquireBalanceApi } from "@/lib/features/koreaInvestment/koreaInvestmentAPI";
import { getOverseasStockTradingInquirePresentBalance } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketAPI";
import type { EtfMarket } from "@/lib/features/communityEtfs/api";

export interface EtfPortfolio {
    held?: Set<string>;
    trading?: ReturnType<typeof activePortfolioTrading>;
    failed: boolean;
}

async function loadPortfolio(market: EtfMarket, accountKey: string): Promise<EtfPortfolio> {
    const isUs = market === "US";
    const key = encodeURIComponent(accountKey);
    const [balance, capital, status] = await Promise.allSettled([
        (isUs ? getOverseasStockTradingInquirePresentBalance : getInquireBalanceApi)(key) as Promise<{
            success?: boolean; rt_cd?: string; output1?: PortfolioBalanceRow[];
        }>,
        (isUs ? getUsCapital : getKrCapital)(key) as Promise<KrUsCapitalType & { success?: boolean }>,
        fetchTradingStatus(market, key),
    ]);
    const inventory = balance.status === "fulfilled" ? balance.value : undefined;
    const held = inventory?.success !== false && (inventory?.rt_cd == null || inventory.rt_cd === "0") && Array.isArray(inventory?.output1)
        ? heldPortfolioTickers(inventory.output1, isUs) : undefined;
    const pool = capital.status === "fulfilled" ? capital.value : undefined;
    const trading = status.status === "fulfilled" && status.value === true && pool?.success !== false && Array.isArray(pool?.stock_list)
        ? activePortfolioTrading(pool.stock_list, pool.groups ?? [], isUs) : undefined;
    const tradingOff = status.status === "fulfilled" && status.value === false;
    return { held, trading, failed: !held || (!trading && !tradingOff) };
}

export function useEtfPortfolioKey(userId: string | undefined, attempt: number) {
    const saved = useRepresentativePortfolio(userId);
    const [fallback, setFallback] = useState<{ userId: string; attempt: number; key: string | null }>();
    useEffect(() => {
        if (!userId || saved !== null) return;
        let active = true;
        void getKakaoMemberList().then((response: unknown) => {
            if (active) setFallback({ userId, attempt, key: defaultPortfolioKey(response) });
        });
        return () => { active = false; };
    }, [userId, saved, attempt]);
    if (!userId || saved === undefined) return undefined;
    return saved ?? (fallback?.userId === userId && fallback.attempt === attempt ? fallback.key : undefined);
}

export function useEtfPortfolio(market: EtfMarket, userId: string | undefined, accountKey: string | null | undefined, attempt: number) {
    const [result, setResult] = useState<{ userId: string; accountKey: string; attempt: number; data: EtfPortfolio }>();
    useEffect(() => {
        if (!userId || !accountKey) return;
        let active = true;
        void loadPortfolio(market, accountKey).then(data => {
            if (active) setResult({ userId, accountKey, attempt, data });
        });
        return () => { active = false; };
    }, [market, userId, accountKey, attempt]);
    return result && result.userId === userId && result.accountKey === accountKey && result.attempt === attempt
        ? result.data : undefined;
}
