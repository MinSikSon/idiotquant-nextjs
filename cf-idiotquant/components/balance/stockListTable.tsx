"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Key, 
  Minus, 
  Plus, 
  Eye, 
  Search, 
  Info, 
  Copy, 
  X, 
  BarChart3, 
  Box, 
  ClipboardCheck, 
  Wallet, 
  TrendingUp 
} from "lucide-react";
import { UsCapitalStockItem, KrUsCapitalType } from "@/lib/features/capital/capitalSlice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 클래스 병합 유틸리티 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  data?: KrUsCapitalType;
  kakaoTotal: any;
  doTokenPlusAll: (val: number) => void;
  doTokenPlusOne: (val: number, sym: string) => void;
  doTokenMinusAll: (val: number) => void;
  doTokenMinusOne: (val: number, sym: string) => void;
  className?: string;
  session: any;
}

export default function StockListTable({
  data,
  doTokenPlusAll,
  doTokenPlusOne,
  doTokenMinusAll,
  doTokenMinusOne,
  className = "",
  session,
}: Props) {
  const rows = data?.stock_list ?? [];
  const [selected, setSelected] = useState<UsCapitalStockItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // 관리자 여부 확인 (기존 로직 유지)
  const isMaster = useMemo(() =>
    session?.user?.name === process.env.NEXT_PUBLIC_MASTER,
    [session]);

  const tokenAmounts = [10000, 100000, 1000000];

  // 모달 닫기 처리
  const closeModal = () => {
    setIsOpen(false);
    setSelected(null);
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 1. Global Token Control (Only for Master) */}
      {isMaster && (
        <section className="overflow-hidden rounded-xl border border-red-200 bg-red-50/30 p-1 dark:border-red-900/30 dark:bg-red-900/10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-red-100 dark:border-red-900/20">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-red-900 dark:text-red-400">Global Token Master Control</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-600 text-white rounded uppercase tracking-wider">
              Master Only
            </span>
          </div>
          <div className="p-4 flex flex-wrap items-center gap-4">
            <span className="text-[10px] font-bold text-red-800/60 dark:text-red-400/60 uppercase">Batch Refill</span>
            <div className="flex flex-wrap gap-2">
              {[50000, 100000, 500000, 1000000].map(amt => (
                <div key={`batch-${amt}`} className="inline-flex rounded-lg shadow-sm border border-red-200 dark:border-red-800 overflow-hidden">
                  <button
                    onClick={() => doTokenPlusAll(amt)}
                    className="bg-white dark:bg-[#1a1a1a] hover:bg-red-50 dark:hover:bg-red-950 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors border-r border-red-100 dark:border-red-800"
                  >
                    +{amt / 10000}만
                  </button>
                  <button
                    onClick={() => doTokenMinusAll(amt)}
                    className="bg-white dark:bg-[#1a1a1a] hover:bg-red-50 dark:hover:bg-red-950 px-2 py-1.5 text-red-600 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. Desktop View (Table) */}
      <div className="relative overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-[#2a2a2a] dark:bg-[#0d0d0d]">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-zinc-50/80 text-zinc-500 dark:bg-[#1a1a1a]/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">종목</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">PER / PBR</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">BPS / EPS</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">시가총액</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">NCAV 비율</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Token</th>
              {isMaster && <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Refill</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-[#2a2a2a]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isMaster ? 7 : 6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <Search className="w-10 h-10" />
                    <p className="text-sm">운용 종목이 없습니다.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`row-${idx}`} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelected(row); setIsOpen(true); }}
                      className="flex items-center gap-2 group/btn"
                    >
                      <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-[#2a2a2a] group-hover/btn:bg-blue-500 group-hover/btn:text-white transition-all">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover/btn:text-blue-600 transition-colors tracking-tight">
                        {row.symbol}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center font-mono">
                      <span className="text-zinc-700 dark:text-zinc-300">{row.condition?.per || "-"}</span>
                      <span className="text-[10px] text-zinc-400">{row.condition?.pbr || "-"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono leading-tight">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">B: {row.condition?.bps?.toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-400">E: {row.condition?.eps?.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                    ₩{(row.condition?.MarketCapitalization || 0).toLocaleString()}억
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors",
                      Number(row.ncavRatio) > 1 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-zinc-100 text-zinc-500 dark:bg-[#2a2a2a] dark:text-zinc-500"
                    )}>
                      {row.ncavRatio}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                    {row.token?.toLocaleString()}
                  </td>
                  {isMaster && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {tokenAmounts.map(amt => (
                          <div key={`indiv-${amt}`} className="flex items-center rounded-md border border-zinc-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] overflow-hidden shadow-xs">
                            <button
                              onClick={() => doTokenPlusOne(amt, row.symbol)}
                              className="px-2 py-1 hover:bg-stone-50 dark:hover:bg-[#2a2a2a] text-[10px] font-bold border-r border-zinc-100 dark:border-[#2a2a2a]"
                            >
                              {amt / 10000}만
                            </button>
                            <button
                              onClick={() => doTokenMinusOne(amt, row.symbol)}
                              className="px-1.5 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Detail Analysis Dialog (Custom Tailwind Modal) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={closeModal} 
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1a1a1a] animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-4 dark:border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-600 p-1.5 text-white">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Strategy Analysis: <span className="text-blue-600">{selected?.symbol}</span>
                </h2>
              </div>
              <button 
                onClick={closeModal}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatItem
                  label="유동자산"
                  value={`${(selected?.condition?.AssetsCurrent || 0).toLocaleString()}억`}
                  icon={<Box className="w-3.5 h-3.5" />}
                />
                <StatItem
                  label="유동부채"
                  value={`${(selected?.condition?.LiabilitiesCurrent || 0).toLocaleString()}억`}
                  icon={<ClipboardCheck className="w-3.5 h-3.5" />}
                />
                <StatItem
                  label="당기순이익"
                  value={`${(selected?.condition?.NetIncome || 0).toLocaleString()}억`}
                  icon={<Wallet className="w-3.5 h-3.5" />}
                />
                <StatItem
                  label="현재가"
                  value={`₩${Number(selected?.condition?.LastPrice || 0).toLocaleString()}`}
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  <Info className="w-3 h-3" />
                  <span>Technical Metadata</span>
                </div>
                <div className="relative group">
                  <pre className="max-h-[300px] overflow-auto rounded-xl border border-zinc-200 bg-stone-50 p-4 font-mono text-[11px] leading-relaxed dark:border-[#2a2a2a] dark:bg-[#0d0d0d] dark:text-zinc-400">
                    {JSON.stringify(selected, null, 2)}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(selected))}
                    className="absolute right-3 top-3 rounded-md bg-white p-2 shadow-sm border border-zinc-200 opacity-0 group-hover:opacity-100 hover:bg-blue-50 transition-all dark:bg-[#2a2a2a] dark:border-[#3a3a3a]"
                  >
                    <Copy className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-[#2a2a2a] dark:bg-[#1a1a1a]/50">
              <button
                onClick={closeModal}
                className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 상세 페이지용 스탯 컴포넌트 */
function StatItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-stone-50 border border-zinc-100 dark:bg-[#1a1a1a] dark:border-[#2a2a2a]">
      <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
      </div>
      <p className="text-base font-mono font-black text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}