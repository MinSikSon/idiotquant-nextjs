"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import LineChart from "@/components/LineChart";
import { SecondarySection } from "@/components/secondary-section";
import { cn } from "@/lib/utils";
import ui from "@/components/research/research-ui.module.css";

interface StockCardProps {
  stock: {
    name: string;
    ticker: string;
    isUs: boolean;
    sector?: string;
    ncavMultiple: number | null;
    roe: number | null;
    per: number;
    pbr: number;
  };
  chartConfig: { data: number[]; categories: string[]; color: string };
  chartNotice?: 'suspended' | 'delisted';
  showMetrics?: boolean;
}

export function StockCard({ stock, chartConfig, chartNotice, showMetrics = true }: StockCardProps) {
  const t = useTranslations("metrics");
  const common = useTranslations("analysis");
  const { ncavMultiple, roe, per, pbr } = stock;
  const sector = stock.sector === "DEFAULT" ? undefined : stock.sector;
  if (!showMetrics && !sector && chartConfig.data.length === 0 && !chartNotice) return null;

  const metrics = [
    { label: common("ncavMultiple"), value: ncavMultiple === null ? "—" : common("multiple", { value: ncavMultiple.toFixed(2) }), basis: t("ncavBasis") },
    { label: "PBR", value: pbr > 0 ? common("multiple", { value: pbr.toFixed(2) }) : "—", basis: t("pbrBasis") },
    { label: "PER", value: per > 0 ? common("multiple", { value: per.toFixed(1) }) : "—", basis: t("perBasis") },
    { label: "ROE", value: roe === null ? "—" : `${roe.toFixed(1)}%`, basis: t("roeBasis") },
  ];

  return (
    <div className={cn(ui.surface, "mb-2")}>
      {sector && <p className="px-3 py-1 text-sm text-neutral-600 dark:text-neutral-300">{t("sector", { sector: sector === "전기·전자" ? t("electricElectronics") : sector })}</p>}
      {showMetrics && <dl className={ui.stats}>
        {metrics.map(({ label, value, basis }) => (
          <div key={label} className={ui.stat}>
            <dt className={ui.statLabel}>{label}</dt>
            <dd className={ui.statValue}>{value === "—" && <span className="sr-only">{common("noData")} </span>}{value}</dd>
            <dd className={ui.statDescription}>{basis}</dd>
          </div>
        ))}
      </dl>}
      {chartConfig.data.length > 0 ? (
        <SecondarySection title={t("priceChart")} className="mx-3 mb-2">
          <LineChart
            key={stock.ticker}
            data_array={[{ name: t("price"), data: chartConfig.data, color: chartConfig.color }]}
            category_array={chartConfig.categories}
            height={144}
            show_yaxis_label={false}
            interactive
            currency={stock.isUs ? 'USD' : 'KRW'}
            legend_disable
          />
        </SecondarySection>
      ) : chartNotice && (
        <p className={cn("flex items-start gap-2 px-3 py-2 text-sm", chartNotice === 'delisted' ? 'text-red-700 dark:text-red-400' : 'text-amber-800 dark:text-amber-300')}>
          <AlertTriangle size={14} aria-hidden="true" className="mt-1 shrink-0" />
          {chartNotice === 'suspended' ? t("suspended") : t("delisted")}
        </p>
      )}
    </div>
  );
}
