"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import { InboxIcon } from "lucide-react";
import { TabButton, ChartSectionSkeleton, fmtKrw, fmtUsd } from "@/components/balance/shared";

// =========================================================================
// 팔레트
// =========================================================================
const PIE_COLORS_LIGHT = [
  "#3b82f6", "#10b981", "#f59e0b", "#ec4899",
  "#8b5cf6", "#ef4444", "#14b8a6", "#6366f1",
  "#f97316", "#06b6d4",
];

const PIE_COLORS_DARK = [
  "#60a5fa", "#34d399", "#fbbf24", "#f472b6",
  "#a78bfa", "#f87171", "#2dd4bf", "#818cf8",
  "#fb923c", "#22d3ee",
];

// =========================================================================
// 커스텀 툴팁
// =========================================================================
function PieTooltip({ active, payload, isUs }: { active?: boolean; payload?: any[]; isUs: boolean }) {
  if (!active || !payload || payload.length === 0) return null;

  const { name, value, percent } = payload[0];
  const formatter = isUs ? fmtUsd : fmtKrw;
  const pctStr = typeof percent === "number" && !isNaN(percent)
    ? `${(percent * 100).toFixed(1)}%`
    : "";

  return (
    <div className="bg-white dark:bg-[#2a2a2a] px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#3a3a3a] shadow-lg">
      <p className="text-xs font-bold text-neutral-900 dark:text-white">{name}</p>
      <p className="text-xs text-neutral-600 dark:text-neutral-300">
        {formatter(value)}{pctStr ? ` (${pctStr})` : ""}
      </p>
    </div>
  );
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload || payload.length === 0) return null;

  const { name, value } = payload[0];

  return (
    <div className="bg-white dark:bg-[#2a2a2a] px-3 py-2 rounded-lg border border-neutral-200 dark:border-[#3a3a3a] shadow-lg">
      <p className="text-xs font-bold text-neutral-900 dark:text-white">{name}</p>
      <p className="text-xs font-mono text-neutral-600 dark:text-neutral-300">
        {value.toFixed(2)}%
      </p>
    </div>
  );
}

// =========================================================================
// 파이차트 컴포넌트
// =========================================================================
interface PortfolioPieChartProps {
  output1: any[];
  isUs: boolean;
}

function PortfolioPieChart({ output1, isUs }: PortfolioPieChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const colors = isDark ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;

  const pieData = useMemo(() => {
    const items = output1
      .map(item => ({
        name: isUs ? item.ovrs_item_name || item.pdno : item.prdt_name,
        value: Number(isUs ? item.frcr_evlu_amt2 : item.evlu_amt) || 0,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return items;
  }, [output1, isUs]);

  if (pieData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="p-4 rounded-2xl bg-stone-100 dark:bg-[#2a2a2a]">
          <InboxIcon size={24} className="text-neutral-400" />
        </div>
        <p className="text-sm font-medium text-neutral-400">보유 종목이 없습니다</p>
      </div>
    );
  }

  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* 파이차트 */}
      <div className="w-full sm:flex-1 sm:min-w-0">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip isUs={isUs} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 종목별 비중 리스트 */}
      <div className="w-full sm:flex-1 sm:min-w-0 space-y-2.5 sm:max-h-[260px] sm:overflow-y-auto">
        {pieData.map((item, index) => {
          const percent = (item.value / totalValue) * 100;
          const formatter = isUs ? fmtUsd : fmtKrw;

          return (
            <div key={index} className="flex items-center gap-3 pb-2.5 border-b border-neutral-100 dark:border-[#2a2a2a] last:border-0">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {item.name}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                  {formatter(item.value)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black text-neutral-900 dark:text-white">
                  {percent.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// 수익률 바차트 컴포넌트
// =========================================================================
function ProfitBarChart({ output1, isUs }: PortfolioPieChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const barData = useMemo(() => {
    return output1
      .map(item => ({
        name: isUs ? item.ovrs_item_name || item.pdno : item.prdt_name,
        value: Number(isUs ? item.evlu_pfls_rt1 : item.evlu_pfls_rt) || 0,
      }))
      .filter(item => Number(item.value) !== 0)
      .sort((a, b) => b.value - a.value);
  }, [output1, isUs]);

  if (barData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="p-4 rounded-2xl bg-stone-100 dark:bg-[#2a2a2a]">
          <InboxIcon size={24} className="text-neutral-400" />
        </div>
        <p className="text-sm font-medium text-neutral-400">수익률 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
    <div style={{ minWidth: 320 }}>
    <ResponsiveContainer width="100%" height={Math.max(barData.length * 34 + 40, 240)}>
      <BarChart
        data={barData}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 11 }}
          width={110}
          tickFormatter={(v: string) => v.length > 8 ? v.slice(0, 8) + "…" : v}
        />
        <Tooltip content={<BarTooltip />} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {barData.map((item, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                item.value >= 0
                  ? isDark ? "#f87171" : "#ef4444"
                  : isDark ? "#60a5fa" : "#3b82f6"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
    </div>
  );
}

// =========================================================================
// 포트폴리오 차트 섹션 (탭 전환)
// =========================================================================
interface PortfolioChartSectionProps {
  output1: any[];
  isUs: boolean;
  isLoading: boolean;
}

export function PortfolioChartSection({
  output1,
  isUs,
  isLoading,
}: PortfolioChartSectionProps) {
  const [activeTab, setActiveTab] = useState<"pie" | "bar">("pie");

  if (isLoading) {
    return <ChartSectionSkeleton />;
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-6 bg-stone-100 dark:bg-[#2a2a2a] p-1 rounded-xl w-fit">
        <TabButton
          active={activeTab === "pie"}
          onClick={() => setActiveTab("pie")}
        >
          자산 구성
        </TabButton>
        <TabButton
          active={activeTab === "bar"}
          onClick={() => setActiveTab("bar")}
        >
          수익률
        </TabButton>
      </div>

      <div className="animate-in fade-in duration-300">
        {activeTab === "pie" ? (
          <PortfolioPieChart output1={output1} isUs={isUs} />
        ) : (
          <ProfitBarChart output1={output1} isUs={isUs} />
        )}
      </div>
    </>
  );
}
