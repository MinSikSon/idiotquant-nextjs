"use client"

import { useState, useEffect, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    Code,
    Spinner
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    reqGetOverseasStockTradingInquirePresentBalance,
    getKoreaInvestmentUsMaretPresentBalance,
    reqPostOrderUs,
    getKoreaInvestmentUsOrder,
    getKoreaInvestmentUsMaretNccs,
    reqGetOverseasStockTradingInquireNccs,
    getKoreaInvestmentUsMaretCcnl,
    reqGetOverseasStockTradingInquireCcnl,
    KoreaInvestmentOverseasPresentBalance,
    KoreaInvestmentOverseasCcnl,
    KoreaInvestmentOverseasNccs,
    KoreaInvestmentUsOrder
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
import { useSession } from "next-auth/react";

function formatNumber(num: number) {
    return num % 1 === 0 ? num.toLocaleString() : num.toFixed(2);
}

export default function Page() {
    return (
        // 핵심: useSearchParams를 사용하는 컴포넌트를 Suspense로 감쌉니다.
        <Suspense fallback={<LoadingState />}>
            <BalanceUs />
        </Suspense>
    );
}

function LoadingState() {
    return (
        <div className="h-screen flex items-center justify-center bp5-dark bg-black">
            <NonIdealState
                icon={<Spinner size={50} />}
                title="데이터를 불러오는 중..."
                description="잠시만 기다려 주세요."
            />
        </div>
    );
}

function BalanceUs() {
    const { data: session, status } = useSession();

    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Redux Selectors
    const kiBalance: KoreaInvestmentOverseasPresentBalance = useAppSelector(getKoreaInvestmentUsMaretPresentBalance);
    const kiCcnl: KoreaInvestmentOverseasCcnl = useAppSelector(getKoreaInvestmentUsMaretCcnl);
    const kiNccs: KoreaInvestmentOverseasNccs = useAppSelector(getKoreaInvestmentUsMaretNccs);
    const kiUsOrder: KoreaInvestmentUsOrder = useAppSelector(getKoreaInvestmentUsOrder);

    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);
    const usCapital: KrUsCapitalType = useAppSelector(selectUsCapital);

    // State: URL 파라미터 'key'를 우선으로 balanceKey 초기화
    const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || "");

    // 1. 초기 로드 및 URL 동기화
    useEffect(() => {
        const urlKey = searchParams.get("key");
        if (urlKey) {
            setBalanceKey(urlKey);
        } else if (session?.user?.id) {
            // URL에 키가 없으면 내 카카오 ID로 설정
            setBalanceKey(String(session.user.id));
        }


    }, []);
    useEffect(() => {
        // 마스터인 경우 멤버 리스트 로드
        if (session?.user?.name === process.env.NEXT_PUBLIC_MASTER) {
            dispatch(reqGetKakaoMemberList());
        }
    }, [session]);

    // 2. balanceKey가 확정/변경될 때마다 데이터 호출 및 URL 업데이트
    useEffect(() => {
        if (!balanceKey || balanceKey === "undefined") return;

        // URL 업데이트 (Master 상태 유지)
        if (searchParams.get("key") !== balanceKey) {
            router.replace(`${pathname}?key=${balanceKey}`);
        }

        // 미국 주식 관련 API 호출 (balanceKey 인자 전달)
        dispatch(reqGetOverseasStockTradingInquirePresentBalance(balanceKey));
        dispatch(reqGetOverseasStockTradingInquireCcnl(balanceKey));
        dispatch(reqGetOverseasStockTradingInquireNccs(balanceKey));
        dispatch(reqGetUsCapital(balanceKey));


    }, [balanceKey, dispatch, pathname, router, searchParams, kakaoTotal?.kakao_account?.profile?.nickname]);

    // 3. 토큰 조작 후 데이터 리프레시 로직
    const refreshStates = [
        useAppSelector(selectUsCapitalTokenPlusAll),
        useAppSelector(selectUsCapitalTokenPlusOne),
        useAppSelector(selectUsCapitalTokenMinusAll),
        useAppSelector(selectUsCapitalTokenMinusOne)
    ];

    useEffect(() => {
        if (refreshStates.some(s => s?.state === "fulfilled")) {
            dispatch(reqGetUsCapital(balanceKey));
        }
    }, [refreshStates, balanceKey, dispatch]);

    // 4. 에러/권한 없음 처리
    if (kiBalance.state === "rejected") {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <NonIdealState
                    icon={IconNames.ERROR}
                    title="미국 계좌 조회 권한 없음"
                    description="해외 주식 API 권한 또는 접근 토큰을 확인해 주세요."
                    action={<Tag large intent={Intent.DANGER}>ACCESS DENIED</Tag>}
                />
            </div>
        );
    }

    // Token 조작 핸들러
    const doTokenPlusAll = (num: number) => dispatch(reqPostUsCapitalTokenPlusAll({ key: balanceKey, num }));
    const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
    const doTokenMinusAll = (num: number) => dispatch(reqPostUsCapitalTokenMinusAll({ key: balanceKey, num }));
    const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostUsCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

    const exRate = kiBalance?.output2?.[0]?.frst_bltn_exrt;

    return (
        <div className="bp5-dark bg-zinc-50 dark:bg-black min-h-screen transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">

                {/* Header: Breadcrumbs & Exchange Rate */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div className="space-y-2">
                        <Breadcrumbs items={[
                            { icon: IconNames.GLOBE_NETWORK, text: "해외 투자" },
                            { icon: IconNames.OFFICE, text: "미국(US) 시장", current: true }
                        ]} />
                        <div className="flex items-center gap-4">
                            <H3 className="m-0 font-black tracking-tight uppercase">US Asset Portfolio</H3>
                            <Tag large minimal intent={Intent.PRIMARY} icon={IconNames.DOLLAR}>
                                🇺🇸 USD
                            </Tag>
                        </div>
                    </div>
                    {exRate && (
                        <div className="flex items-center gap-3 bg-zinc-200/50 dark:bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700">
                            <Text className="text-xs opacity-60 font-bold uppercase tracking-tighter">Current Exchange Rate</Text>
                            <Code className="text-blue-500 font-mono font-bold text-base bg-transparent p-0">
                                ₩{formatNumber(Number(exRate))}
                            </Code>
                        </div>
                    )}
                </div>

                <Divider className="mb-8" />

                {/* Main Content Sections */}
                <div className="space-y-12">

                    {/* 1. 자산 잔고 및 요약 (Master Selector 포함) */}
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
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

                    {/* 2. 알고리즘 전략 관리 */}
                    <Section
                        title="알고리즘 운용 전략 (Algorithm Management)"
                        icon={IconNames.GLOBE}
                        collapsible
                        className="animate-in fade-in slide-in-from-bottom-3 duration-700"
                    >
                        <SectionCard className="p-0 border-none overflow-hidden">
                            <StockListTable
                                data={usCapital}
                                kakaoTotal={kakaoTotal}
                                doTokenPlusAll={doTokenPlusAll}
                                doTokenMinusAll={doTokenMinusAll}
                                doTokenPlusOne={doTokenPlusOne}
                                doTokenMinusOne={doTokenMinusOne}
                                session={session}
                            />
                        </SectionCard>
                    </Section>

                    {/* 3. 주문/체결 내역 실시간 현황 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <Section title="최근 체결 내역 (Executed)" icon={IconNames.HISTORY} compact collapsible>
                            <SectionCard className="p-0 overflow-hidden min-h-[200px]">
                                <OverseasCcnlTable data={kiCcnl} />
                            </SectionCard>
                        </Section>

                        <Section title="미체결 주문 (Open Orders)" icon={IconNames.TIME} compact collapsible>
                            <SectionCard className="p-0 overflow-hidden min-h-[200px]">
                                <OverseasNccsTable data={kiNccs} />
                            </SectionCard>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
}