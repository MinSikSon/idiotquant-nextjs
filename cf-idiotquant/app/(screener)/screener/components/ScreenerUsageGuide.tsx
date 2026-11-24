import { useTranslations } from "next-intl";

const topics = ["guideStrategies", "guideFilters", "guideRisk", "guideWatch", "guideCompare"] as const;

export default function ScreenerUsageGuide() {
  const t = useTranslations("screener");
    return (
        <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-brand-ink dark:text-neutral-200 dark:hover:bg-surface-dark-hover [&::-webkit-details-marker]:hidden">
                {t("guide")}
                <span aria-hidden="true" className="text-neutral-400 group-open:hidden">＋</span>
                <span aria-hidden="true" className="hidden text-neutral-400 group-open:inline">−</span>
            </summary>
            <ul className="grid gap-4 px-3 py-3">
                {topics.map(topic => (
                    <li key={topic}>
                        <h2 className="text-sm font-semibold">{t(topic)}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t(`${topic}Desc`)}</p>
                    </li>
                ))}
            </ul>
            <p className="px-3 pb-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                {t("guideFooter")}
            </p>
        </details>
    );
}
