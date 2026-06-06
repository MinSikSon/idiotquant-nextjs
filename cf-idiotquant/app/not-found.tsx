"use client";

import Link from "next/link";
import { Search, Home, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotFoundProps {
  warnText?: string;
}

export default function NotFound({ warnText = "Oops! Not Found!" }: NotFoundProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#fcfaf7] dark:bg-[#1a1915] transition-colors duration-300">
      <div className="max-w-md w-full flex flex-col items-center text-center">
        
        {/* Animated Icon Section */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#16a34a]/20 blur-[60px] rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] shadow-xl">
            <Search className="w-10 h-10 text-[#f0fdf4]0 animate-bounce" />
            <AlertCircle className="absolute -top-1 -right-1 w-6 h-6 text-red-500 fill-white dark:fill-neutral-900" />
          </div>
        </div>

        {/* Text Section */}
        <h1 className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white tracking-tighter mb-4">
          페이지를 찾을 수 없습니다
        </h1>
        
        <div className="space-y-6 mb-10">
          <p className="text-neutral-500 dark:text-neutral-400 font-medium break-keep">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다. <br />
            입력하신 주소가 정확한지 다시 한번 확인해 주세요.
          </p>

          <div className="inline-block px-4 py-2 rounded-lg bg-neutral-200/50 dark:bg-[#35332e]/50 border border-neutral-300 dark:border-[#4a4641]">
            <code className="text-sm font-mono font-bold text-neutral-700 dark:text-neutral-300 tracking-tight">
              {warnText}
            </code>
          </div>
        </div>

        {/* Action Button */}
        <Link href="/" className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#16a34a] to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-300" />
          <button className="relative flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-[#242320] text-neutral-900 dark:text-white rounded-xl font-bold border border-neutral-200 dark:border-[#35332e] transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Home className="w-4 h-4 text-[#f0fdf4]0" />
            메인 페이지로 돌아가기
          </button>
        </Link>

        {/* Footer info for system feel */}
        <div className="mt-16 pt-8 border-t border-dashed border-neutral-200 dark:border-[#35332e] w-full">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">
            System Error Code: 404_NOT_FOUND
          </p>
        </div>
      </div>
    </div>
  );
}