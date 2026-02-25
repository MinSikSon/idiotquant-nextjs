"use client";

import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

// 샘플 차트 데이터 (실제로는 API에서 최근 7일 데이터를 받아와야 함)
const sampleChartData = [
    { price: 72000 }, { price: 71500 }, { price: 73000 },
    { price: 74500 }, { price: 74000 }, { price: 76000 }, { price: 75500 }
];

export const StockVisualArea = ({ stockName, domain, chartData = sampleChartData, grade }: any) => {
    // 등급에 따른 차트 선 색상 변경
    const chartColor = grade === 'SS' ? '#fbbf24' : '#10b981';
    // 중요: domain이 비어있으면 img.logo.dev가 에러를 뱉으므로 기본값을 주거나 체크해야 합니다.
    // const targetDomain = domain && domain.trim() !== "" ? domain : "";
    // const logoUrl = targetDomain
    //     ? `https://img.logo.dev/${targetDomain}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true`
    //     : ""; // 도메인이 없으면 처음부터 빈 주소로 설정하여 onError 유도
    const logoUrl = stockName
        ? `https://img.logo.dev/ticker/${stockName}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true`
        : ""; // 도메인이 없으면 처음부터 빈 주소로 설정하여 onError 유도

    return (
        <div className="h-[11rem] w-full px-[1rem] rounded-md flex flex-col items-center justify-center relative group">
            {/* 1. 배경 미니 차트 (Sparkline) */}
            {/* <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                        <Line
                            type="monotone"
                            dataKey="price"
                            stroke={chartColor}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div> */}

            {/* 2. 중앙 기업 로고 (Clearbit API 활용) */}
            <div className="relative flex items-center justify-center w-full h-full flex-shrink-0 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm">
                {/* 1. 로고 이미지 */}
                <img
                    src={logoUrl}
                    alt={stockName}
                    className="h-fit w-fit object-contain relative z-10"
                    style={{ display: logoUrl ? 'block' : 'none' }} // URL이 없으면 처음부터 숨김
                    onError={(e: any) => {
                        // [해결 핵심 로직]
                        // 1. 깨진 이미지 옆에 나오는 alt 글자를 강제로 삭제
                        e.target.alt = "";
                        // 2. 이미지 태그 자체를 DOM에서 숨김
                        e.target.style.display = 'none';

                        // 3. 바로 뒤의 형제 요소(div)를 찾아 display를 flex로 강제 전환
                        const fallback = e.target.nextElementSibling as HTMLElement;
                        if (fallback) {
                            fallback.style.setProperty('display', 'flex', 'important');
                        }
                    }}
                />

                {/* 2. 대체 UI (Fallback)
          - 초기에는 display: none (단, 로고 URL이 없을 경우 초기 렌더링 시 flex로 보일 수 있게 처리 가능)
      */}
                <div
                    style={{ display: logoUrl ? 'none' : 'flex' }}
                    className="absolute inset-0 w-full h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-black rounded-xl text-xl border border-zinc-200 dark:border-zinc-700/50"
                >
                    {stockName.substring(0, 1)}
                </div>
            </div>

            {/* 3. 하단 섹터 텍스트 (옵션) */}
            {/* <div className="z-10 mt-2 text-[10px] text-gray-400 font-medium tracking-widest uppercase"> */}
            {/* {stockName} 분석 데이터 */}
            {/* </div> */}
        </div>
    );
};

// // 사용 예시
// export default function App() {
//   return (
//     <div className="p-10 bg-black min-h-screen">
//       <div className="w-64"> {/* 카드 너비에 맞게 조절 */}
//         <StockVisualArea 
//           stockName="삼성전자" 
//           domain="samsung.com" 
//           grade="S" 
//         />
//       </div>
//     </div>
//   );
// }