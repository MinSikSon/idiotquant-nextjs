"use client"

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    H3,
    Text,
    Divider,
    NonIdealState,
    Tag,
    Intent,
    Breadcrumbs,
    Section,
    SectionCard,
    Code
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    reqGetOverseasStockTradingInquirePresentBalance,
    getKoreaInvestmentUsMaretPresentBalance,
    KoreaInvestmentOverseasPresentBalance,
    reqPostOrderUs,
    getKoreaInvestmentUsOrder,
    KoreaInvestmentUsOrder,
    getKoreaInvestmentUsMaretNccs,
    reqGetOverseasStockTradingInquireNccs,
    getKoreaInvestmentUsMaretCcnl,
    reqGetOverseasStockTradingInquireCcnl,
    KoreaInvestmentOverseasCcnl,
    KoreaInvestmentOverseasNccs
} from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import {
    KakaoTotal,
    reqGetKakaoMemberList,
    selectKakaoMemberList,
    selectKakaoTotal
} from "@/lib/features/kakao/kakaoSlice";
import {
    KrUsCapitalType,
    reqGetUsCapital,
    reqPostUsCapitalTokenPlusAll,
    reqPostUsCapitalTokenPlusOne,
    reqPostUsCapitalTokenMinusAll,
    reqPostUsCapitalTokenMinusOne,
    selectUsCapital,
    selectUsCapitalTokenMinusAll,
    selectUsCapitalTokenPlusAll,
    selectUsCapitalTokenPlusOne,
    selectUsCapitalTokenMinusOne
} from "@/lib/features/capital/capitalSlice";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import OverseasCcnlTable from "@/components/balance/ccnlTable";
import OverseasNccsTable from "@/components/balance/nccsTable";
import StockListTable from "@/components/balance/stockListTable";

const DEBUG = false;

function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}

export default function BalanceUs() {
    const dispatch = useAppDispatch();

    // Selectors
    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);
    const kiCcnl: KoreaInvestmentOverseasCcnl = useAppSelector(getKoreaInvestmentUsMaretCcnl);
    const kiNccs: KoreaInvestmentOverseasNccs = useAppSelector(getKoreaInvestmentUsMaretNccs);
    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);
    const usCapital: KrUsCapitalType = useAppSelector(selectUsCapital);

    const [balanceKey, setBalanceKey] = useState(String(kakaoTotal?.id || ""));

    // US Capital Tokens
    const refreshStates = [
        useAppSelector(selectUsCapitalTokenPlusAll),
        useAppSelector(selectUsCapitalTokenPlusOne),
        useAppSelector(selectUsCapitalTokenMinusAll),
        useAppSelector(selectUsCapitalTokenMinusOne)
    ];

    useEffect(() => {
        if ("init" === kiBalance.state) dispatch(reqGetOverseasStockTradingInquirePresentBalance());
        if ("init" === kiCcnl.state) dispatch(reqGetOverseasStockTradingInquireCcnl());
        if ("init" === kiNccs.state) dispatch(reqGetOverseasStockTradingInquireNccs());
        if ("init" === usCapital.state) dispatch(reqGetUsCapital());
        if (kakaoTotal?.id) setBalanceKey(String(kakaoTotal.id));
    }, [dispatch, kiBalance.state, kiCcnl.state, kiNccs.state, usCapital.state, kakaoTotal?.id]);

    useEffect(() => {
        if (kakaoTotal?.kakao_account?.profile?.nickname === process.env.NEXT_PUBLIC_MASTER) {
            dispatch(reqGetKakaoMemberList());
        }
    }, [kakaoTotal, dispatch]);

    useEffect(() => {
        if (refreshStates.some(s => s?.state === "fulfilled")) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [refreshStates, balanceKey, dispatch]);

    if (kiBalance.state === "rejected") {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <NonIdealState
                    icon={IconNames.ERROR}
                    // intent={Intent.DANGER}
                    title="미국 계좌 권한 없음"
                    description="해외 주식 서비스 신청 여부 및 API 권한을 확인해 주세요."
                />
            </div>
        );
    }

    const doTokenPlusAll = (num: number) => dispatch(reqPostUsCapitalTokenPlusAll({ key: balanceKey, num }));
    const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
    const doTokenMinusAll = (num: number) => dispatch(reqPostUsCapitalTokenMinusAll({ key: balanceKey, num }));
    const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

    const exRate = kiBalance?.output2?.[0]?.frst_bltn_exrt;

    return (
        <div className="bp5-dark bg-zinc-50 dark:bg-black min-h-screen transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div className="space-y-2">
                        <Breadcrumbs items={[
                            { icon: IconNames.GLOBE_NETWORK, text: "해외 투자" },
                            { icon: IconNames.OFFICE, text: "미국(US) 시장", current: true }
                        ]} />
                        <div className="flex items-center gap-4">
                            <H3 className="m-0 font-black tracking-tight">US MARKET BALANCE</H3>
                            <Tag large minimal intent={Intent.PRIMARY} icon={IconNames.DOLLAR}>
                                🇺🇸 USD
                            </Tag>
                        </div>
                    </div>
                    {exRate && (
                        <div className="flex items-center gap-2 bg-zinc-200/50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full">
                            <Text className="text-xs opacity-60 font-bold">실시간 환율</Text>
                            <Code className="text-blue-500 font-mono font-bold">$1 = ₩{formatNumber(Number(exRate))}</Code>
                        </div>
                    )}
                </div>

                <Divider className="mb-8" />

                {/* Main Results */}
                <div className="space-y-12">
                    {/* 1. 해외 주식 잔고 및 요약 */}
                    <section className="animate-in fade-in duration-500">
                        <InquireBalanceResult
                            balanceKey={balanceKey}
                            setBalanceKey={setBalanceKey}
                            kiBalance={kiBalance}
                            reqGetInquireBalance={reqGetOverseasStockTradingInquirePresentBalance}
                            reqGetInquireCcnl={reqGetOverseasStockTradingInquireCcnl}
                            reqGetInquireNccs={reqGetOverseasStockTradingInquireNccs}
                            reqGetUsCapital={reqGetUsCapital}
                            kiOrderCash={kiUsOrder}
                            reqPostOrderCash={reqPostOrderUs}
                            kakaoTotal={kakaoTotal}
                            kakaoMemberList={kakaoMemberList}
                        />
                    </section>

                    {/* 2. 알고리즘 전략 종목 관리 */}
                    <Section
                        title="알고리즘 운용 전략"
                        icon={IconNames.GLOBE}
                        collapsible
                        className="animate-in fade-in slide-in-from-bottom-2 duration-700"
                    >
                        <SectionCard className="p-0 border-none">
                            <StockListTable
                                data={usCapital}
                                kakaoTotal={kakaoTotal}
                                doTokenPlusAll={doTokenPlusAll}
                                doTokenMinusAll={doTokenMinusAll}
                                doTokenPlusOne={doTokenPlusOne}
                                doTokenMinusOne={doTokenMinusOne}
                            />
                        </SectionCard>
                    </Section>

                    {/* 3. 주문/체결 현황 (Ccnl/Nccs) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <Section title="체결 내역 (Executed)" icon={IconNames.HISTORY} compact>
                            <SectionCard className="p-0 overflow-hidden">
                                <OverseasCcnlTable data={kiCcnl} />
                            </SectionCard>
                        </Section>

                        <Section title="미체결 내역 (Open Orders)" icon={IconNames.TIME} compact>
                            <SectionCard className="p-0 overflow-hidden">
                                <OverseasNccsTable data={kiNccs} />
                            </SectionCard>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
}