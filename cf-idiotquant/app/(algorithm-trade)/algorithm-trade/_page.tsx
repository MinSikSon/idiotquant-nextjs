// "use client";

// import React, { useEffect } from "react";
// import { useAppDispatch, useAppSelector } from "@/lib/hooks";

// // Blueprintjs Components
// import {
//     Spinner,
//     NonIdealState,
//     Icon,
//     Intent,
//     Divider
// } from "@blueprintjs/core";
// import { IconNames } from "@blueprintjs/icons";

// // Redux
// import {
//     selectStrategyNcavLatest,
//     reqGetNcavLatest,
//     StrategyNcavLatestType
// } from "@/lib/features/backtest/backtestSlice";

// // 개편된 Table 컴포넌트 (앞서 드린 코드가 적용된 파일)
// import ResponsiveNCAV from "./table";

// const DEBUG = true;

// export default function AlgorithmTrade() {
//     const dispatch = useAppDispatch();

//     // Redux에서 데이터 가져오기
//     const strategyNcavLatest: StrategyNcavLatestType = useAppSelector(selectStrategyNcavLatest);

//     useEffect(() => {
//         dispatch(reqGetNcavLatest());
//     }, [dispatch]);

//     useEffect(() => {
//         if (DEBUG) console.log(`[AlgorithmTrade] strategyNcavLatest:`, strategyNcavLatest);
//     }, [strategyNcavLatest]);

//     // 로딩 상태 확인 (list가 없고 호출 중일 때)
//     const isLoading = !strategyNcavLatest?.list;

//     return (
//         <div className="flex flex-col w-full min-h-screen !bg-gray-50 dark:!bg-zinc-950">
//             {/* 상단 타이틀 영역: 모바일 고려 여백 조절 */}
//             <div className="py-3 px-4 md:py-5 text-center">
//                 <div className="flex items-center justify-center gap-3 mb-2">
//                     <Icon icon={IconNames.LIGHTBULB} intent={Intent.WARNING} size={24} />
//                     <h2 className="!text-2xl md:!text-3xl !font-black !tracking-tight dark:!text-white">
//                         종목 추천
//                     </h2>
//                 </div>
//                 <p className="!text-gray-500 dark:!text-zinc-400 text-sm md:!text-base">
//                     <span className="font-bold">idiot quant 알고리즘</span>이 분석한 <span className="text-blue-600 font-bold">현재 가장 저평가된 종목</span> 리스트입니다.
//                 </p>
//             </div>

//             <Divider className="mx-6 md:mx-auto max-w-[1400px]" />

//             {/* 메인 컨텐츠 영역 */}
//             <main className="flex-1 w-full max-w-[1400px] mx-auto">
//                 {isLoading ? (
//                     // 데이터 로딩 중일 때 표시할 상태
//                     <div className="py-20">
//                         <NonIdealState
//                             icon={<Spinner intent={Intent.PRIMARY} size={48} />}
//                             title="데이터를 불러오는 중입니다"
//                             description="최신 NCAV 종목 추천 리스트를 가져오고 있습니다. 잠시만 기다려주세요."
//                         />
//                     </div>
//                 ) : strategyNcavLatest.list && Object.keys(strategyNcavLatest.list).length > 0 ? (
//                     // 데이터가 있을 때 테이블 렌더링
//                     <ResponsiveNCAV strategies={strategyNcavLatest?.list as any} />
//                 ) : (
//                     // 데이터가 비어있을 때 표시할 상태
//                     <div className="py-20">
//                         <NonIdealState
//                             icon={IconNames.SEARCH as any}
//                             title="추천 종목이 없습니다"
//                             description="현재 조건에 부합하는 종목이 없거나 데이터를 찾을 수 없습니다."
//                             action={<button onClick={() => dispatch(reqGetNcavLatest())} className="bp5-button bp5-intent-primary">다시 시도</button>}
//                         />
//                     </div>
//                 )}
//             </main>

//             {/* 하단 여백 유지 */}
//             <div className="h-10 md:h-20" />
//         </div>
//     );
// }