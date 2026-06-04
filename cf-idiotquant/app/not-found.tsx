"use client";

import Link from "next/link";
import { Search, Home, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotFoundProps {
  warnText?: string;
}

export default function NotFound({ warnText = "Oops! Not Found!" }: NotFoundProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-stone-50 dark:bg-[#0d0d0d] transition-colors duration-300">
      <div className="max-w-md w-full flex flex-col items-center text-center">
        
        {/* Animated Icon Section */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full animate-pulse" />
          <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#2a2a2a] shadow-xl">
            <Search className="w-10 h-10 text-blue-500 animate-bounce" />
            <AlertCircle className="absolute -top-1 -right-1 w-6 h-6 text-red-500 fill-white dark:fill-zinc-900" />
          </div>
        </div>

        {/* Text Section */}
        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-4">
          페이지를 찾을 수 없습니다
        </h1>
        
        <div className="space-y-6 mb-10">
          <p className="text-zinc-500 dark:text-zinc-400 font-medium break-keep">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다. <br />
            입력하신 주소가 정확한지 다시 한번 확인해 주세요.
          </p>

          <div className="inline-block px-4 py-2 rounded-lg bg-zinc-200/50 dark:bg-[#2a2a2a]/50 border border-zinc-300 dark:border-[#3a3a3a]">
            <code className="text-sm font-mono font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">
              {warnText}
            </code>
          </div>
        </div>

        {/* Action Button */}
        <Link href="/" className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-300" />
          <button className="relative flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-[#1a1a1a] text-zinc-900 dark:text-white rounded-xl font-bold border border-zinc-200 dark:border-[#2a2a2a] transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Home className="w-4 h-4 text-blue-500" />
            메인 페이지로 돌아가기
          </button>
        </Link>

        {/* Footer info for system feel */}
        <div className="mt-16 pt-8 border-t border-dashed border-zinc-200 dark:border-[#2a2a2a] w-full">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
            System Error Code: 404_NOT_FOUND
          </p>
        </div>
      </div>
    </div>
  );
}