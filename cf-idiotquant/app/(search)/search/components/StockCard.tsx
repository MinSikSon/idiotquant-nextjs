"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import LineChart from "@/components/LineChart";
import { SecondarySection } from "@/components/secondary-section";
import { cn } from "@/lib/utils";
import ui from "@/components/research/research-ui.module.css";

interface StockCardProps {
  stock: {
    ticker: string;
    isUs: boolean;
    sector?: string;
  };
  chartConfig: { data: number[]; categories: string[]; color: string };
  chartNotice?: 'suspended' | 'delisted';
}

export function StockCard({ stock, chartConfig, chartNotice }: StockCardProps) {
  const t = useTranslations("metrics");
  const sector = stock.sector === "DEFAULT" ? undefined : stock.sector;
  if (!sector && chartConfig.data.length === 0 && !chartNotice) return null;

  return (
    <div className={cn(ui.surface, "mb-2")}>
      {sector && <p className="px-3 py-1 text-sm text-neutral-600 dark:text-neutral-300">{t("sector", { sector: sector === "전기·전자" ? t("electricElectronics") : sector })}</p>}
      {chartConfig.data.length > 0 ? (
        <SecondarySection title={t("priceChart")} defaultOpen className="mx-3 mb-2">
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
