export function newsletterMarketBase() {
    return (process.env.NODE_ENV === "development"
        ? process.env.LOCAL_NEWSLETTER_MARKET_URL || process.env.NEXT_PUBLIC_API_URL
        : process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
}
