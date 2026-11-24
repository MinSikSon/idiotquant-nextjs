"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

// 재가입 쿨다운으로 가입이 거부되면 로그인 페이지에 안내 (signIn 콜백이 ?error=withdraw_cooldown 으로 리다이렉트)
export function WithdrawCooldownBanner() {
  const t = useTranslations("login");
    const sp = useSearchParams();
    if (sp.get("error") !== "withdraw_cooldown") return null;
    const days = sp.get("days") ?? "30";
    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-[13px] text-amber-800 dark:text-amber-300 text-center">
            {t.rich("cooldown", { count: days, days: text => <b>{text}</b> })}
        </div>
    );
}
