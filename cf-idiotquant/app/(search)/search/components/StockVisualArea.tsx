"use client";

import React, { useState, useEffect } from 'react';

export const StockVisualArea = ({ stockName }: { stockName: string }) => {
    const [isError, setIsError] = useState(false);

    // 한글이 포함되어 있는지 체크 (한글 종목명은 로고 API가 지원하지 않음)
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(stockName);

    // 한글이 없고 에러가 아닐 때만 URL 생성
    const logoUrl = (stockName && !hasKorean && !isError)
        ? `https://img.logo.dev/ticker/${stockName.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true`
        : "";

    // 종목이 바뀌면 에러 상태 초기화
    useEffect(() => {
        setIsError(false);
    }, [stockName]);

    return (
        <div className="h-[12rem] w-full px-[1rem] flex flex-col items-center justify-center relative group">
            <div className="relative flex items-center justify-center w-full h-full bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden shadow-inner border border-zinc-200 dark:border-white/5">

                {/* 1. 로고 이미지 (영문 티커일 때만 시도) */}
                {logoUrl && !hasKorean && !isError ? (
                    <img
                        src={logoUrl}
                        alt={stockName}
                        className="h-fit w-fit object-contain z-10 transition-transform duration-500 group-hover:scale-110"
                        onError={() => setIsError(true)}
                    />
                ) : (
                    /* 2. 대체 UI: 한글 이름이거나 로고 로드 실패 시 즉시 노출 */
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="w-20 h-20 rounded-[2rem] bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center border border-zinc-100 dark:border-zinc-600">
                            <span className="text-4xl font-black text-zinc-800 dark:text-zinc-100 tracking-tighter">
                                {stockName ? stockName.substring(0, 1) : "?"}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};