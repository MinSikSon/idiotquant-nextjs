import Link from "next/link";
import { PAGE_WIDTH } from "@/components/pageHeader";
import { CONTROL_FOCUS_CLS } from "@/lib/ui-controls";

export function EtfNavigation({ active }: { active: "feed" | "mine" }) {
    return <nav aria-label="가상 ETF 메뉴" className={PAGE_WIDTH.content}>
        <div className="mx-auto flex max-w-3xl gap-4">
            {([
                ["feed", "/etfs", "공개 피드"],
                ["mine", "/etfs/draft", "내 가상 ETF"],
            ] as const).map(([section, href, label]) =>
                <Link key={section} href={href} aria-current={section === active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center justify-center border-b-2 px-2 text-sm font-semibold md:!flex-none md:min-w-28 ${CONTROL_FOCUS_CLS} ${section === active
                        ? "border-brand-ink text-brand-ink"
                        : "border-transparent text-neutral-600 hover:text-brand-ink dark:text-neutral-300"}`}>{label}</Link>)}
        </div>
    </nav>;
}
