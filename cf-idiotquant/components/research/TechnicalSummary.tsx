import { useLocale, useTranslations } from "next-intl";
import ui from "./research-ui.module.css";
import { technicalSummary, type PriceBar } from '@/lib/research/technical';

const formatDate = (date: string) => `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6)}`;

export default function TechnicalSummary({ bars, currency }: { bars: PriceBar[]; currency: string }) {
    const t = useTranslations("technical");
    const locale = useLocale();
    const formatNumber = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 });
    const compareWithAverage = (change: number, above: "higher" | "moreVolume", below: "lower" | "lessVolume") => {
        const rounded = Number(change.toFixed(2));
        return rounded === 0 ? t("similar") : t(rounded > 0 ? above : below, { value: formatNumber(Math.abs(rounded)) });
    };
    const result = technicalSummary(bars);
    const latest = bars.at(-1);
    const momentum = (period: number, change: number | null) => {
        const previous = bars.at(-(period + 1));
        const rounded = change == null ? null : Number(change.toFixed(2));
        return {
            basis: previous ? t("compareDate", { date: formatDate(previous.date) }) : t("comparePeriod", { count: period }),
            conclusion: rounded == null ? null : rounded === 0 ? t("flat")
                : t(rounded > 0 ? "rose" : "fell", { value: formatNumber(Math.abs(rounded)) }),
        };
    };
    const average = (period: number, price: number | null) => ({
        basis: t("average", { count: period, price: price == null ? "" : ` ${currency}${formatNumber(price)}` }),
        conclusion: latest && price != null ? compareWithAverage((latest.close / price - 1) * 100, "higher", "lower") : null,
    });
    const rsi = result.rsi14 == null ? null : Number(result.rsi14.toFixed(2));
    const groups = [
        {
            heading: t("momentumHeading"),
            comparisons: [momentum(20, result.momentum20), momentum(60, result.momentum60)],
        },
        {
            heading: t("averageHeading"),
            comparisons: [average(20, result.sma20), average(60, result.sma60)],
        },
        {
            heading: t("volumeHeading"),
            comparisons: [{
                basis: result.volumeRatio == null ? t("volumeBasis") : t("volumeRatio", { value: formatNumber(result.volumeRatio) }),
                conclusion: result.volumeRatio == null ? null : compareWithAverage((result.volumeRatio - 1) * 100, "moreVolume", "lessVolume"),
            }],
        },
        {
            heading: t("rsiHeading"),
            comparisons: [{
                basis: rsi == null ? t("rsi") : t("rsiValue", { value: formatNumber(rsi) }),
                conclusion: rsi == null ? null : rsi > 70 ? t("rsiUp")
                    : rsi < 30 ? t("rsiDown") : t("rsiFlat"),
            }],
        },
    ];

    return (
        <section aria-label={t("title")} className={`${ui.surface} p-3`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">{t("title")}</h2>
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{latest ? t("asOf", { date: formatDate(latest.date), price: `${currency}${formatNumber(latest.close)}` }) : t("noPrice")}</span>
            </div>
            {latest && <dl className="mt-2 space-y-2">
                {groups.map(({ heading, comparisons }) => (
                    <div key={heading} className="border-t border-[var(--analysis-line)] pt-2 break-keep [overflow-wrap:anywhere]">
                        <dt className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{heading}</dt>
                        {comparisons.map(({ basis, conclusion }) => (
                            <dd key={basis} className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 tabular-nums">
                                <span className="font-semibold">{conclusion ?? t("insufficient")}</span>
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">{basis}</span>
                            </dd>
                        ))}
                    </div>
                ))}
            </dl>}
            <details className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                <summary className="min-h-11 cursor-pointer py-2 font-medium">{t("method")}</summary>
                <p className="mt-2 leading-6">{t("methodPrice", { count: result.count })}</p>
                <p className="mt-2 leading-6">{t("methodRsi")}</p>
                <p className="mt-2 leading-6">{t("methodSource")}</p>
                <a className="mt-2 inline-block text-brand-ink underline underline-offset-4" href="https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi" target="_blank" rel="noreferrer">{t("rsiReference")}</a>
            </details>
        </section>
    );
}
