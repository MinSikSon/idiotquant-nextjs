"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// URL과 로컬 상태를 서로 복사하면 연속 선택 중 이전 URL이 새 선택을 되돌릴 수 있다.
// 계좌는 URL 한 곳에서 읽고, 선택 이벤트에서만 주소를 변경한다.
export function useBalanceAccount(userId?: string | number): [string, (key: string) => void] {
  const searchParams = useSearchParams();
  const urlKey = searchParams.get("key");
  const balanceKey = urlKey || String(userId ?? "");
  const setBalanceKey = useCallback((key: string) => {
    if (!key || key === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("key") === key) return;
    url.searchParams.set("key", key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (!urlKey && balanceKey) setBalanceKey(balanceKey);
  }, [urlKey, balanceKey, setBalanceKey]);

  return [balanceKey, setBalanceKey];
}
