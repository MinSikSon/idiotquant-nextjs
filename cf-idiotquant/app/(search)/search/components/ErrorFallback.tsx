"use client";

import React from 'react';
import { AlertCircle, RefreshCcw, RotateCw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-in fade-in zoom-in duration-300">
      {/* 경고 아이콘 영역 */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
        <div className="relative p-6 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-3xl">
          <AlertCircle size={48} className="text-red-500 dark:text-red-400" />
        </div>
      </div>

      {/* 텍스트 영역 */}
      <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-3 tracking-tight">
        데이터를 불러오는 중 문제가 발생했습니다
      </h3>

      <p className="text-neutral-500 dark:text-neutral-400 mb-10 max-w-sm font-medium leading-relaxed">
        {error.message ||
          '주식 정보를 가져오는 중에 예상치 못한 오류가 발생했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.'}
      </p>

      {/* 액션 버튼 그룹 */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none justify-center">
        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-red-500/20"
        >
          <RefreshCcw size={18} className="animate-spin-slow" />
          다시 시도
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold hover:bg-[#f5f1eb] dark:hover:bg-[#35332e] transition-all active:scale-95"
        >
          <RotateCw size={18} />
          페이지 새로고침
        </button>
      </div>

      {/* 에러 코드 푸터 */}
      <div className="mt-16 flex flex-col items-center gap-2">
        <div className="h-px w-12 bg-neutral-200 dark:bg-[#35332e]" />
        <span className="text-[10px] text-neutral-400 uppercase tracking-[0.3em] font-black">
          Error Code: ERR_STOCK_FETCH_FAILURE
        </span>
      </div>

      <style jsx>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}