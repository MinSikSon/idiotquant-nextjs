"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useViewAsUser } from "@/lib/viewAsUser";
import { StockLogoRegistration } from "@/components/stockLogoRegistration";

export function StockLogo({ ticker, name, isUs }: { ticker: string; name: string; isUs: boolean }) {
  const [failed, setFailed] = useState(false);
  const [missing, setMissing] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [version, setVersion] = useState(0);
  const { data: session } = useSession();
  const viewAsUser = useViewAsUser();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin" && !viewAsUser;
  const src = isUs
    ? `https://img.logo.dev/ticker/${ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${ticker}`;

  useEffect(() => {
    if (!isAdmin || isUs) return;
    const controller = new AbortController();
    fetch(`/api/admin/stock-logo?ticker=${encodeURIComponent(ticker)}`, { signal: controller.signal })
      .then(async response => { if (response.ok) setMissing((await response.json()).missing === true); })
      .catch(() => { /* 통신 오류만으로 등록 버튼을 표시하지 않는다. */ });
    return () => controller.abort();
  }, [isAdmin, isUs, ticker]);

  const logo = failed ? (name.trim() || ticker || "?").charAt(0).toUpperCase() : (
    <Image src={version ? `${src}?v=${version}` : src} alt="" fill unoptimized className="object-contain p-1" onError={() => setFailed(true)} />
  );
  const className = "relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm font-bold text-neutral-600 sm:h-9 sm:w-9";

  return (
    <>
      {isAdmin && missing ? (
        <button type="button" className={className + " ring-2 ring-violet-300"} aria-label={`${name} 로고 등록`} title="홈페이지 주소로 로고 등록"
          onClick={() => setRegistering(true)}>
          {logo}<span aria-hidden className="absolute bottom-0 right-0 rounded-tl bg-violet-600 px-0.5 text-[10px] leading-3 text-white">+</span>
        </button>
      ) : <span className={className}>{logo}</span>}
      {registering && isAdmin && <StockLogoRegistration ticker={ticker} name={name} onClose={() => setRegistering(false)}
        onSaved={() => { setRegistering(false); setMissing(false); setVersion(Date.now()); setFailed(false); }} />}
    </>
  );
}
