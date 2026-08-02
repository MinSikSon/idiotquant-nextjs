"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Power, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { listTradingAccounts, TradingAccountSummary } from "@/lib/features/algorithmTrade/tradingAccountAPI";

const won = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.trunc(n || 0));

// 등록된 자동매매 계정 목록 (admin 전용). 항목을 누르면 그 계정이 선택되어
// 아래 계정 편집 패널·자동매매 토글이 해당 계정을 대상으로 동작한다.
export default function TradingAccountList({ country, balanceKey, onSelect, refreshToken }: {
  country: "KR" | "US";
  balanceKey: string;
  onSelect: (userId: string) => void;
  refreshToken?: number;
}) {
  const [accounts, setAccounts] = useState<TradingAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setAccounts(await listTradingAccounts(country));
    setLoading(false);
  }, [country]);

  useEffect(() => { load(); }, [load, refreshToken]);

  return (
    <div className="mb-3 rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#1a1915] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 dark:text-neutral-400">
          <Users className="w-3.5 h-3.5" />
          등록된 자동매매 계정
          <span className="text-neutral-400">({accounts.length})</span>
        </span>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 disabled:opacity-50">
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> 새로고침
        </button>
      </div>

      {loading ? (
        <p className="py-3 text-center text-xs text-neutral-400">불러오는 중…</p>
      ) : accounts.length === 0 ? (
        <p className="py-3 text-center text-xs text-neutral-400">
          등록된 {country} 자동매매 계정이 없습니다. 아래에서 계정을 등록하세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {accounts.map(acc => {
            const selected = String(acc.user_id) === String(balanceKey);
            return (
              <li key={acc.user_id}>
                <button
                  onClick={() => onSelect(String(acc.user_id))}
                  aria-current={selected}
                  className={cn(
                    "w-full flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-left transition-colors",
                    selected
                      ? "border-[#16a34a] bg-[#f0fdf4] dark:bg-[#14532d]/20"
                      : "border-neutral-200 dark:border-[#35332e] hover:border-neutral-300 dark:hover:border-[#4a4641]"
                  )}
                >
                  <span className="font-mono text-xs font-bold dark:text-white">{acc.user_id}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black",
                    acc.is_active
                      ? "bg-[#f0fdf4] text-[#16a34a] dark:bg-[#14532d]/40"
                      : "bg-neutral-100 text-neutral-500 dark:bg-[#35332e]")}>
                    <Power className="inline w-3 h-3 -mt-0.5 mr-0.5" />{acc.is_active ? "대상" : "제외"}
                  </span>
                  <span className="ml-auto text-[11px] text-neutral-400">
                    {acc.account_number || "계좌번호 미등록"} · 월 {won(acc.monthly_budget_krw)}원
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
