"use client";

import { useLocale, useTranslations } from "next-intl";
import React, { useMemo } from "react";
import { formatKoreanUnit } from "@/lib/utils/financeCalc";
import { cn } from "@/lib/utils";
import ui from "@/components/research/research-ui.module.css";
import styles from "./StockMetrics.module.css";
import {
  BarChart3, Calendar, DollarSign, Coins,
  TrendingUp, Layers, Activity, AlertTriangle,
} from "lucide-react";

interface MetricItem {
  label: string;
  val: string;
  sub?: string;
  highlight?: boolean;
  type?: "valuation" | "price" | "volume";
  desc: string;
}

// =========================================================================
// 지표 카드
// =========================================================================
function MetricCard({ m }: { m: MetricItem }) {
  return (
    <div className={cn(ui.metric, styles.metric)}>
      <p className={cn(
        "text-[14px] font-medium mb-1 md:mb-2",
        m.highlight ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-600 dark:text-neutral-300"
      )}>
        {m.label}
      </p>
      <p className={cn(
        "text-[16px] md:text-[22px] font-semibold tabular-nums leading-normal break-words",
        m.highlight
          ? "text-neutral-900 dark:text-neutral-100"
          : "text-neutral-900 dark:text-white"
      )}>
        {m.val}
      </p>
      {m.sub && (
        <div className="flex items-center gap-1 mt-1 md:mt-1.5">
          <Calendar size={9} className="text-neutral-600 dark:text-neutral-300 shrink-0" />
          <span className="text-[13px] text-neutral-500 dark:text-neutral-400 font-mono">
            {m.sub.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}
          </span>
        </div>
      )}

      <p className={cn(ui.metricDescription, styles.description)}>{m.desc}</p>
    </div>
  );
}

// 섹션 레이블
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-neutral-600 dark:text-neutral-300">{icon}</span>
      <span className="text-[15px] font-semibold text-neutral-600 dark:text-neutral-300">{label}</span>
      <div className="flex-1 h-px bg-neutral-100 dark:bg-surface-dark-muted" />
    </div>
  );
}

// =========================================================================
// StockMetrics
// =========================================================================
export const StockMetrics = ({ data, isUs }: { data: any; isUs: boolean }) => {
  const t = useTranslations("metrics");

  const locale = useLocale();
  const isDelistedSuspect = !isUs && data?.kiChart?.output1 ? Number(data.kiChart.output1.lstn_stcn) === 0 : false;

  const metrics: MetricItem[] = useMemo(() => {
    const amount = (value: number) => locale === "ko" ? (isUs ? "$" : "") + formatKoreanUnit(value)
      : new Intl.NumberFormat(locale, { style: "currency", currency: isUs ? "USD" : "KRW", currencyDisplay: "narrowSymbol", notation: "compact", maximumFractionDigits: 2 }).format(value);
    const won = (value: number) => locale === "ko" ? `${value.toLocaleString(locale)}원` : `₩${value.toLocaleString(locale)}`;
    const shares = (value: number) => t("shareCount", { count: value.toLocaleString(locale) });

    const n = (val: any) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    if (!data) return [];
    if (isUs) {
      const detail = data.usDetail?.output;
      const search = data.usSearchInfo?.output;
      if (!detail || !search) return [];

      const usMarketCap = n(detail.last) * n(search.lstg_stck_num);
      const turnoverRatio = usMarketCap > 0
        ? (100 * n(detail.tamt) / usMarketCap).toFixed(3)
        : "0";

      // PER·PBR 은 같은 탭 위쪽 종목 카드가 크게 보여준다 — 여기서 또 적으면 같은 숫자가 두 번이다.
      return [
        { label: "EPS",     val: n(detail.epsx) ? `$${n(detail.epsx).toLocaleString()}` : "—", type: "valuation", desc: t("epsDesc") },
        { label: "BPS",     val: n(detail.bpsx) ? `$${n(detail.bpsx).toLocaleString()}` : "—", type: "valuation", desc: t("bpsDesc") },
        { label: t("high"), val: n(detail.h52p) ? `$${Number(detail.h52p).toFixed(2)}` : "—", sub: detail.h52d ? `${detail.h52d.slice(0,4)}-${detail.h52d.slice(4,6)}-${detail.h52d.slice(6,8)}` : "", type: "price", desc: t("highDesc") },
        { label: t("low"), val: n(detail.l52p) ? `$${Number(detail.l52p).toFixed(2)}` : "—", sub: detail.l52d ? `${detail.l52d.slice(0,4)}-${detail.l52d.slice(4,6)}-${detail.l52d.slice(6,8)}` : "", type: "price", desc: t("lowDesc") },
        { label: t("marketCap"),  val: amount(usMarketCap), type: "volume", desc: t("marketCapDesc") },
        { label: t("shares"), val: n(search.lstg_stck_num) ? shares(n(search.lstg_stck_num)) : "—", type: "volume", desc: t("sharesDesc") },
        { label: t("volume"),    val: n(detail.tvol) ? `${n(detail.tvol).toLocaleString()}` : "—", type: "volume", desc: t("volumeDesc") },
        { label: t("turnover"),  val: amount(n(detail.tamt)), type: "volume", desc: t("turnoverDesc") },
        { label: t("turnoverRatio"), val: `${turnoverRatio}%`, highlight: true, type: "volume", desc: t("turnoverRatioDesc") },
      ];
    } else {
      if (!data.kiPrice?.output || !data.kiChart?.output1) return [];
      const p = data.kiPrice.output;
      const c = data.kiChart.output1;

      const calculatedMarketCap = n(c.stck_prpr) * n(c?.lstn_stcn ?? 1);
      const turnoverRatio = calculatedMarketCap > 0
        ? (100 * n(p.acml_tr_pbmn) / calculatedMarketCap).toFixed(3)
        : "0";

      const fmt52Date = (d: string) => d ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : "";

      // 52주 최고/최저는 InquirePrice(p) output에 직접 제공됨
      const w52High = n(p.w52_hgpr);
      const w52Low  = n(p.w52_lwpr);
      // fallback: InquirePrice 값이 없으면 차트 output2 데이터에서 산출
      const fallbackHigh = (() => {
        const dailyItems = data.kiChart.output2 ?? [];
        if (!dailyItems.length) return { val: 0, date: "" };
        const currentShares = n(c.lstn_stcn);
        let best = 0, bestDate = "";
        for (const day of dailyItems) {
          const raw = n(day.stck_hgpr);
          if (!raw) continue;
          const dayShares = n(day.lstn_stcn);
          const adj = currentShares > 0 && dayShares > 0 ? raw * (dayShares / currentShares) : raw;
          if (adj > best) { best = adj; bestDate = day.stck_bsop_date ?? ""; }
        }
        return { val: best, date: bestDate };
      })();
      const fallbackLow = (() => {
        const dailyItems = data.kiChart.output2 ?? [];
        if (!dailyItems.length) return { val: 0, date: "" };
        const currentShares = n(c.lstn_stcn);
        let best = Infinity, bestDate = "";
        for (const day of dailyItems) {
          const raw = n(day.stck_lwpr);
          if (!raw) continue;
          const dayShares = n(day.lstn_stcn);
          const adj = currentShares > 0 && dayShares > 0 ? raw * (dayShares / currentShares) : raw;
          if (adj < best) { best = adj; bestDate = day.stck_bsop_date ?? ""; }
        }
        return { val: best < Infinity ? best : 0, date: bestDate };
      })();
      const finalHigh = w52High > 0 ? { val: w52High, date: p.w52_hgpr_date ?? "" } : fallbackHigh;
      const finalLow  = w52Low  > 0 ? { val: w52Low,  date: p.w52_lwpr_date ?? "" } : fallbackLow;

      // PER·PBR 은 같은 탭 위쪽 종목 카드가 크게 보여준다 — 여기서 또 적으면 같은 숫자가 두 번이다.
      return [
        { label: "EPS",     val: n(p.eps) ? won(n(p.eps)) : "—", type: "valuation", desc: t("epsDesc") },
        { label: "BPS",     val: n(p.bps) ? won(n(p.bps)) : "—", type: "valuation", desc: t("bpsDesc") },
        { label: t("high"), val: finalHigh.val > 0 ? won(Math.round(finalHigh.val)) : "—", sub: fmt52Date(finalHigh.date), type: "price", desc: t("highDesc") },
        { label: t("low"), val: finalLow.val  > 0 ? won(Math.round(finalLow.val))  : "—", sub: fmt52Date(finalLow.date),  type: "price", desc: t("lowDesc") },
        { label: t("marketCap"),  val: amount(calculatedMarketCap), type: "volume", desc: t("marketCapDesc") },
        { label: t("shares"), val: n(c.lstn_stcn) ? shares(n(c.lstn_stcn)) : "—", type: "volume", desc: t("sharesDesc") },
        { label: t("volume"),    val: n(p.acml_vol) ? `${n(p.acml_vol).toLocaleString()}` : "—", type: "volume", desc: t("volumeDesc") },
        { label: t("turnover"),  val: amount(n(p.acml_tr_pbmn)), type: "volume", desc: t("turnoverDesc") },
        { label: t("turnoverRatio"), val: `${turnoverRatio}%`, highlight: true, type: "volume", desc: t("turnoverRatioDesc") },
      ];
    }
  }, [data, isUs, locale, t]);

  if (!data) return null;

  if (metrics.length === 0) return null;

  const valuationMetrics = metrics.filter(m => m.type === "valuation");
  const priceMetrics     = metrics.filter(m => m.type === "price");
  const volumeMetrics    = metrics.filter(m => m.type === "volume");

  return (
    <div className={cn(ui.surface, styles.compact, "w-full flex flex-col")}>

      {/* ── 헤더 ── */}
      <div className={cn(ui.sectionHead, styles.header)}>
        <div className="flex items-center gap-x-2.5 md:gap-x-6">
          <div className="w-7 h-7 bg-surface-canvas dark:bg-surface-dark-card rounded-lg flex items-center justify-center border border-neutral-200 dark:border-surface-dark-border shrink-0">
            <BarChart3 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <div>
            <h4 className={ui.sectionTitle}>
              {t("title")}
            </h4>
            <p className="hidden md:block text-[13px] text-neutral-500 dark:text-neutral-400 font-mono font-bold uppercase tracking-normal mt-0.5">
              {t("subheading")}
            </p>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[13px] font-semibold font-mono uppercase tracking-normal shrink-0",
          isUs
            ? "bg-transparent text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
            : "bg-transparent text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
        )}>
      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shrink-0", "bg-neutral-400")} />
          {isUs
            ? <><DollarSign size={10} />USD</>
            : <><Coins size={10} />KRW</>
          }
        </div>
      </div>

      {/* ── 상장폐지 의심 배너 ── */}
      {isDelistedSuspect && (
        <div className="px-0 sm:px-5 py-3 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900/30 flex items-center gap-x-6">
          <AlertTriangle size={14} className="text-red-500 dark:text-red-400 shrink-0" />
          <p className="text-[13px] font-bold text-red-600 dark:text-red-400 leading-normal">
            {t("noShares")}
          </p>
        </div>
      )}

      {/* ── 콘텐츠 ── */}
      <div className="flex-1 p-3 space-y-2">

        {/* 밸류에이션 지표 */}
        {valuationMetrics.length > 0 && (
          <div>
            <SectionLabel icon={<Layers size={11} />} label={t("perShareGroup")} />
            <div className={cn(ui.metricGrid, styles.grid)}>
              {valuationMetrics.map((m, i) => <MetricCard key={i} m={m} />)}
            </div>
          </div>
        )}

        {/* 52주 가격 범위 */}
        {priceMetrics.length > 0 && (
          <div>
            <SectionLabel icon={<TrendingUp size={11} />} label={t("rangeGroup")} />
            <div className={cn(ui.metricGrid, styles.grid)}>
              {priceMetrics.map((m, i) => <MetricCard key={i} m={m} />)}
            </div>
          </div>
        )}

        {/* 시장 데이터 */}
        {volumeMetrics.length > 0 && (
          <div>
            <SectionLabel icon={<Activity size={11} />} label={t("marketGroup")} />
            <div className={cn(ui.metricGrid, styles.grid)}>
              {volumeMetrics.map((m, i) => <MetricCard key={i} m={m} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
