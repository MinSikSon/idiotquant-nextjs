"use client"

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    H3,
    Text,
    Divider,
    NonIdealState,
    Icon,
    Intent,
    Breadcrumbs,
    BreadcrumbProps,
    Spinner
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    reqGetInquireBalance,
    getKoreaInvestmentBalance,
    KoreaInvestmentBalance,
    getKoreaInvestmentOrderCash,
    KoreaInvestmentOrderCash,
    reqPostOrderCash
} from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import {
    reqGetCapitalToken
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
    KakaoTotal,
    reqGetKakaoMemberList,
    selectKakaoMemberList,
    selectKakaoTotal
} from "@/lib/features/kakao/kakaoSlice";
import {
    KrUsCapitalType,
    reqGetKrCapital,
    reqGetUsCapital,
    reqPostKrCapitalTokenMinusAll,
    reqPostKrCapitalTokenMinusOne,
    reqPostKrCapitalTokenPlusAll,
    reqPostKrCapitalTokenPlusOne,
    selectKrCapital,
    selectKrCapitalTokenMinusAll,
    selectKrCapitalTokenMinusOne,
    selectKrCapitalTokenPlusAll,
    selectKrCapitalTokenPlusOne
} from "@/lib/features/capital/capitalSlice";

import InquireBalanceResult from "@/components/inquireBalanceResult";
import StockListTable from "@/components/balance/stockListTable";
import { useSession } from "next-auth/react";

const DEBUG = false;

export default function Page() {
    return (
        // 핵심: useSearchParams를 사용하는 컴포넌트를 Suspense로 감쌉니다.
        <Suspense fallback={<LoadingState />}>
            <BalanceKr />
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

function BalanceKr() {
    const { data: session, status } = useSession();

    const dispatch = useAppDispatch();

    // Selectors
    const kiBalance: KoreaInvestmentBalance = useAppSelector(getKoreaInvestmentBalance);
    const kiOrderCash: KoreaInvestmentOrderCash = useAppSelector(getKoreaInvestmentOrderCash);
    const krCapital: KrUsCapitalType = useAppSelector(selectKrCapital);
    const kakaoTotal: KakaoTotal = useAppSelector(selectKakaoTotal);
    const kakaoMemberList = useAppSelector(selectKakaoMemberList);

    const krCapitalTokenPlusAll = useAppSelector(selectKrCapitalTokenPlusAll);
    const krCapitalTokenPlusOne = useAppSelector(selectKrCapitalTokenPlusOne);
    const krCapitalTokenMinusAll = useAppSelector(selectKrCapitalTokenMinusAll);
    const krCapitalTokenMinusOne = useAppSelector(selectKrCapitalTokenMinusOne);


    // BalanceKr.tsx 또는 BalanceUs.tsx 상단 부분
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // URL에 key가 있으면 그 값을, 없으면 내 카카오 ID를 초기값으로 사용
    const [balanceKey, setBalanceKey] = useState(searchParams.get("key") || String(session?.user?.id || ""));

    // 1. URL 파라미터와 balanceKey 상태 동기화
    useEffect(() => {
        const urlKey = searchParams.get("key");
        if (urlKey && urlKey !== balanceKey) {
            setBalanceKey(urlKey);
        }
    }, [searchParams]);

    // 2. balanceKey가 변경될 때마다 URL 업데이트 및 데이터 리프레시
    useEffect(() => {
        if (balanceKey && balanceKey !== "undefined") {
            // URL 업데이트 (뒤로가기 기록 방지를 위해 replace 사용 가능)
            router.replace(`${pathname}?key=${balanceKey}`);

            // 해당 사용자의 데이터 요청
            dispatch(reqGetInquireBalance(balanceKey));
            // 한국/미국 여부에 따라 적절한 Capital 요청
            if (pathname.includes("kr")) dispatch(reqGetKrCapital(balanceKey));
            else dispatch(reqGetUsCapital(balanceKey));
        }
    }, [balanceKey]);

    // 초기 데이터 로딩
    useEffect(() => {
        dispatch(reqGetInquireBalance());
        dispatch(reqGetCapitalToken());
        if (session?.user?.id) setBalanceKey(String(session.user.id));
    }, [dispatch, session?.user?.id]);

    useEffect(() => {
        if (krCapital.state === "init") {
            dispatch(reqGetKrCapital());
        }
    }, [krCapital.state, dispatch]);

    useEffect(() => {
        if (session?.user?.name === process.env.NEXT_PUBLIC_MASTER) {
            dispatch(reqGetKakaoMemberList());
        }
    }, [kakaoTotal, dispatch]);

    // 토큰 변동 시 데이터 리프레시 로직
    const refreshStates = [krCapitalTokenPlusAll, krCapitalTokenPlusOne, krCapitalTokenMinusAll, krCapitalTokenMinusOne];
    useEffect(() => {
        if (refreshStates.some(s => s?.state === "fulfilled")) {
            dispatch(reqGetKrCapital(balanceKey));
        }
    }, [refreshStates, balanceKey, dispatch]);

    // 권한 없음 처리 (Blueprintjs NonIdealState)
    if (kiBalance.state === "rejected") {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <NonIdealState
                    icon={IconNames.LOCK}
                    title="접근 권한 없음"
                    description="계좌 조회 권한이 없거나 토큰이 만료되었습니다."
                    action={<Text className="opacity-50">관리자에게 문의하세요.</Text>}
                />
            </div>
        );
    }

    // 핸들러 함수들
    const doTokenPlusAll = (num: number) => dispatch(reqPostKrCapitalTokenPlusAll({ key: balanceKey, num }));
    const doTokenPlusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenPlusOne({ key: balanceKey, num, ticker }));
    const doTokenMinusAll = (num: number) => dispatch(reqPostKrCapitalTokenMinusAll({ key: balanceKey, num }));
    const doTokenMinusOne = (num: number, ticker: string) => ticker && dispatch(reqPostKrCapitalTokenMinusOne({ key: balanceKey, num, ticker }));

    const BREADCRUMBS: BreadcrumbProps[] = [
        { icon: IconNames.CHART, text: "투자 현황" },
        { icon: IconNames.MAP_MARKER, text: "한국(KR) 계좌", current: true },
    ];

    return (
        <div className="bp5-dark bg-zinc-50 dark:bg-black min-h-screen transition-colors duration-200">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div className="space-y-2">
                        <Breadcrumbs items={BREADCRUMBS} className="mb-2" />
                        <div className="flex items-center gap-3">
                            <H3 className="m-0 font-black tracking-tight uppercase">Portfolio Balance</H3>
                            <span className="text-2xl">🇰🇷</span>
                        </div>
                    </div>
                    <Text className="opacity-50 text-xs font-mono">
                        REAL-TIME KOREA INVESTMENT DATA
                    </Text>
                </div>

                <Divider className="mb-8" />

                {/* 메인 잔고 결과 섹션 */}
                <div className="space-y-10">
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <InquireBalanceResult
                            balanceKey={balanceKey}
                            setBalanceKey={setBalanceKey}
                            kiBalance={kiBalance}
                            reqGetInquireBalance={reqGetInquireBalance}
                            kiOrderCash={kiOrderCash}
                            reqPostOrderCash={reqPostOrderCash}
                            kakaoTotal={kakaoTotal}
                            kakaoMemberList={kakaoMemberList}
                        />
                    </section>

                    {/* 알고리즘 및 토큰 관리 섹션 */}
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Icon icon={IconNames.Layers} intent={Intent.PRIMARY} />
                            <Text className="font-bold text-lg">알고리즘 운용 종목 관리</Text>
                        </div>
                        <StockListTable
                            data={krCapital}
                            kakaoTotal={kakaoTotal}
                            doTokenPlusAll={doTokenPlusAll}
                            doTokenMinusAll={doTokenMinusAll}
                            doTokenPlusOne={doTokenPlusOne}
                            doTokenMinusOne={doTokenMinusOne}
                            session={session}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
}