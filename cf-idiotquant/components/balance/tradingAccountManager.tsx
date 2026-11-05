"use client";

import { useState } from "react";
import TradingAccountList from "./tradingAccountList";
import TradingAccountPanel from "./tradingAccountPanel";

export default function TradingAccountManager({ country, balanceKey, onChanged }: {
  country: "KR" | "US"; balanceKey: string; onChanged?: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const accountKey = selectedKey ?? balanceKey;

  return (
    <>
      <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
        관리·토큰 확인 ID: <strong className="text-neutral-900 dark:text-neutral-100">{accountKey || "미선택"}</strong>
        <span className="block mt-1">상단 MASTER MODE의 조회 계정과 별도로 선택할 수 있습니다.</span>
      </p>
      <details className="mb-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">등록 계정 목록 · 선택</summary>
        <TradingAccountList country={country} balanceKey={accountKey} onSelect={setSelectedKey} refreshToken={refreshToken} />
      </details>
      <TradingAccountPanel key={`${country}:${accountKey}`} country={country} balanceKey={accountKey} onChanged={() => {
        setRefreshToken(value => value + 1);
        if (accountKey === balanceKey) onChanged?.();
      }} />
    </>
  );
}
