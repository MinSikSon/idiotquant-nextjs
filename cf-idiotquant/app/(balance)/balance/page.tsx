"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/balance/shared";
import { BalanceKrView } from "@/components/balance/balanceKrView";
import { BalanceUsView } from "@/components/balance/balanceUsView";
import { cn } from "@/lib/utils";

type Country = "kr" | "us";

// =========================================================================
// KR / US 전환 토글
// =========================================================================
function CountryToggle({ country, onChange }: { country: Country; onChange: (c: Country) => void }) {
  const items: { id: Country; label: string; flag: string }[] = [
    { id: "kr", label: "한국", flag: "🇰🇷" },
    { id: "us", label: "미국", flag: "🇺🇸" },
  ];
  return (
    <div className="flex items-center gap-1 bg-[#faf9f7] dark:bg-[#35332e] p-1 rounded-xl">
      {items.map(it => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap",
            country === it.id
              ? "bg-white dark:bg-[#1a1915] text-neutral-950 dark:text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
          )}
        >
          <span aria-hidden>{it.flag}</span>
          {it.label}
        </button>
      ))}
    </div>
  );
}

// =========================================================================
// 통합 페이지 본문
// =========================================================================
function BalancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const country: Country = searchParams.get("country") === "us" ? "us" : "kr";

  const handleChange = useCallback((next: Country) => {
    if (next === country) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("country", next);
    router.replace(`${pathname}?${params.toString()}`);
  }, [country, pathname, router, searchParams]);

  const toggle = <CountryToggle country={country} onChange={handleChange} />;

  return country === "us"
    ? <BalanceUsView countryToggle={toggle} />
    : <BalanceKrView countryToggle={toggle} />;
}

// =========================================================================
// 페이지 내보내기
// =========================================================================
export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="계좌 데이터를 불러오는 중..." />}>
      <BalancePage />
    </Suspense>
  );
}
