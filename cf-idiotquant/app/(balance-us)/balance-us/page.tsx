"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/balance/shared";

// /balance-us 은 통합 페이지(/balance?country=us)로 리다이렉트한다. (?key= 보존)
function RedirectToBalance() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("country", "us");
    router.replace(`/balance?${params.toString()}`);
  }, [router, searchParams]);
  return <LoadingState message="이동 중..." />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState message="이동 중..." />}>
      <RedirectToBalance />
    </Suspense>
  );
}
