import type { Metadata } from "next";
import { Suspense } from "react";
import NewsletterFlow from "./NewsletterFlow";
import { latestSampleQuarter } from "./historySample";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "관심종목 뉴스레터", robots: { index: false, follow: true } };

export default function NewsletterPage() {
    return <Suspense fallback={<p role="status" className="p-5">관심종목 뉴스레터를 여는 중입니다.</p>}>
        <NewsletterFlow checkoutEnabled={process.env.NEXT_PUBLIC_TOSS_TEST_CHECKOUT === "true"}
            sampleEndDate={latestSampleQuarter()} />
    </Suspense>;
}
