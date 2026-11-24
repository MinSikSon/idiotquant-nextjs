export function formatBillingAmount({ amount, currency }: { amount: number; currency: string }) {
    const formatter = new Intl.NumberFormat("ko-KR", { style: "currency", currency });
    // Stripe의 ISK, UGX 금액 표기는 소수점 두 자리를 사용합니다.
    const digits = ["isk", "ugx"].includes(currency) ? 2 : formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(amount / 10 ** digits);
}

export const billingDate = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul",
});
