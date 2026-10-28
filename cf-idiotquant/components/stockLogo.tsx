"use client";

import { useState } from "react";
import Image from "next/image";

export function StockLogo({ ticker, name, isUs }: { ticker: string; name: string; isUs: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = isUs
    ? `https://img.logo.dev/ticker/${ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${ticker}`;

  return (
    <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm font-bold text-neutral-600 sm:h-9 sm:w-9">
      {failed ? name.charAt(0).toUpperCase() : (
        <Image src={src} alt="" fill unoptimized className="object-contain p-1" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
