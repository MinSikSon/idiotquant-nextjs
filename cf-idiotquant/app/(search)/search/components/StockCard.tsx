"use client";

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
}

export function StockCard({ stock, chartConfig, chartNotice }: StockCardProps) {
  const { ncavMultiple, roe, per, pbr } = stock;
  const metrics = [
    { label: "NCAV 배수", value: ncavMultiple === null ? "—" : `${ncavMultiple.toFixed(2)}배`, basis: "순유동자산 ÷ 시가총액" },
    { label: "PBR", value: pbr > 0 ? `${pbr.toFixed(2)}배` : "—", basis: "주가 ÷ 주당순자산" },
    { label: "PER", value: per > 0 ? `${per.toFixed(1)}배` : "—", basis: "주가 ÷ 주당순이익" },
    { label: "ROE", value: roe === null ? "—" : `${roe.toFixed(1)}%`, basis: "순이익 ÷ 자기자본" },
  ];

  return (
    <div className={ui.surface}>
      {stock.sector && stock.sector !== "DEFAULT" && <p className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300">업종 {stock.sector}</p>}
      <dl className={ui.stats}>
        {metrics.map(({ label, value, basis }) => (
          <div key={label} className={ui.stat}>
            <dt className={ui.statLabel}>{label}</dt>
            <dd className={ui.statValue}>{value === "—" && <span className="sr-only">자료 없음 </span>}{value}</dd>
            <dd className={ui.statDescription}>{basis}</dd>
          </div>
        ))}
      </dl>
      {chartConfig.data.length > 0 ? (
        <SecondarySection title="주가 추이" className="mx-3 mt-3">
          <LineChart
            key={stock.ticker}
            data_array={[{ name: "주가", data: chartConfig.data, color: chartConfig.color }]}
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
          {chartNotice === 'suspended' ? '거래정지로 주가 추이를 표시할 수 없습니다.' : '상장폐지로 주가 추이를 표시할 수 없습니다.'}
        </p>
      )}
    </div>
  );
}
