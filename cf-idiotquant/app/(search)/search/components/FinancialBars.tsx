"use client";

import { cn } from "@/lib/utils";
import {
    barGeometry, periodDelta, fmtEok, usdBlockFormatter,
    type BarModel, type BarItem, type StackRow, type Tone,
} from "./financialBarsData";

// 토큰 하나에서 막대·점·스택 색이 전부 나온다 — 항목마다 색 클래스를 따로 붙이면
// 다크 모드 대응이 두 배가 되고 색이 어긋나기 시작한다.
const TONE_BG: Record<Tone, string> = {
    green: "bg-brand",
    rose: "bg-[#d4525c]",
    emerald: "bg-emerald-500",
    indigo: "bg-indigo-500",
    violet: "bg-violet-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
};

type Unit = "eok" | "usd";
const blockFormatter = (unit: Unit, values: (number | null)[]) =>
    unit === "eok" ? fmtEok : usdBlockFormatter(values);

// ── 구성 스택 ────────────────────────────────────────────────────────────
function Stack({ row }: { row: StackRow }) {
    return (
        <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-bold text-neutral-800 dark:text-neutral-100">
                {row.title}
                {row.note && <span className="ml-1.5 text-[13px] font-semibold text-neutral-600 dark:text-neutral-300">{row.note}</span>}
            </p>
            <div className="flex h-7 rounded-lg overflow-hidden bg-neutral-100 dark:bg-[#322f2a]">
                {row.segs.map(seg => (
                    <div
                        key={seg.label}
                        title={`${seg.label} ${seg.pct.toFixed(1)}%`}
                        style={{ width: `${seg.pct}%` }}
                        className={cn(
                            "relative grid place-items-center min-w-0 overflow-hidden whitespace-nowrap font-mono text-[13px] sm:text-[15px] font-bold",
                            TONE_BG[seg.tone],
                            seg.pale ? "text-neutral-900 dark:text-white" : "text-white"
                        )}
                    >
                        {seg.pale && <span aria-hidden="true" className="absolute inset-0 bg-white/70 dark:bg-black/30" />}
                        <span className="relative">{seg.pct >= 20 ? `${seg.label} ${Math.round(seg.pct)}%` : seg.pct >= 6 ? `${Math.round(seg.pct)}%` : ""}</span>
                    </div>
                ))}
            </div>
            {row.legend && (
                <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-neutral-500 dark:text-neutral-400">
                    {row.legend.map(l => (
                        <span key={l.label} className="inline-flex items-center gap-1.5">
                            <i className={cn("w-2 h-2 rounded-sm shrink-0", TONE_BG[l.tone])} />
                            {l.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── 증감 배지 ────────────────────────────────────────────────────────────
function DeltaBadge({ item }: { item: BarItem }) {
    const d = periodDelta(item.values);
    if (d.turnedLoss) return <span className="font-mono text-[15px] font-bold text-rose-700 dark:text-rose-300">적자전환</span>;

    // 현금흐름처럼 음수가 정상인 항목은 변화율이 오해를 부른다 — 유출이 −4,200 → −5,900 으로
    // 커진 것을 "−40.5%" 로 적으면 줄어든 것처럼 읽힌다. 규모의 방향으로 바꿔 말한다.
    if (item.neutral) {
        const latest = item.values.find(v => v !== null) ?? null;
        const oldest = [...item.values].reverse().find(v => v !== null) ?? null;
        if (latest !== null && oldest !== null && latest < 0 && oldest < 0) {
            return (
                <span className="font-mono text-[15px] font-bold text-neutral-600 dark:text-neutral-300">
                    유출 {Math.abs(latest) >= Math.abs(oldest) ? "확대" : "축소"}
                </span>
            );
        }
    }

    if (d.pct === null) return null;
    // 방향이 아니라 좋고/나쁨으로 칠한다 — 부채·비용은 늘면 나쁘다.
    const good = item.costLike ? d.pct < 0 : d.pct > 0;
    const flat = Math.abs(d.pct) < 0.05;
    return (
        <span className={cn(
            "font-mono text-[15px] font-bold tabular-nums",
            item.neutral || flat ? "text-neutral-600 dark:text-neutral-300"
                : good ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
        )}>
            {d.spanCount}기 {flat ? "±0.0%" : `${d.pct > 0 ? "+" : "−"}${Math.abs(d.pct).toFixed(1)}%`}
        </span>
    );
}

// ── 항목 하나(최근 → 과거) ───────────────────────────────────────────────
function compactPeriod(period: string) {
    const dates = period.match(/\d{4}-\d{2}-\d{2}/g);
    const date = dates?.at(-1)?.slice(2).replaceAll("-", ".")
        ?? period.replace(/^(\d{2})(\d{2})\./, "$2.").replace(/^FY(\d{4})$/, "$1");
    const basis = period.includes(" · ") ? period.split(" · ").at(-1)?.replace("분기 공시", "분기") : undefined;
    return { date, basis };
}

function TrendBlock({ item, periods, unit }: { item: BarItem; periods: string[]; unit: Unit }) {
    const geo = barGeometry(item.values);
    const f = blockFormatter(unit, item.values);
    const latest = item.values.find(v => v !== null) ?? null;

    if (item.values.every(v => v === null)) {
        return (
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-neutral-100 py-2 text-[13px] dark:border-neutral-800">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 break-keep">{item.label}</span>
                <span className="shrink-0 whitespace-nowrap text-neutral-500 dark:text-neutral-400">제공 자료 없음</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-1.5">
                <span className={cn(
                    "text-[13px] font-bold flex items-center gap-1.5",
                    item.isTotal ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                )}>
                    {item.isTotal && <i className={cn("w-[3px] h-3 rounded-full shrink-0", TONE_BG[item.tone])} />}
                    {item.label}
                </span>
                <DeltaBadge item={item} />
                <span className={cn(
                    "ml-auto hidden sm:block shrink-0 whitespace-nowrap font-mono text-[13px] font-semibold tabular-nums",
                    latest !== null && latest < 0 ? "text-rose-700 dark:text-rose-300" : "text-neutral-900 dark:text-white"
                )}>
                    {f(latest)}
                </span>
            </div>

            {item.values.map((v, i) => {
                const bar = geo.bars[i];
                const isLatest = i === 0;
                const period = periods[i] ?? "";
                const { date, basis } = compactPeriod(period);
                return (
                    <div key={periods[i] ?? i} className="grid min-h-7 sm:min-h-8 grid-cols-[3.25rem_minmax(0,1fr)_4.25rem] sm:grid-cols-[4.5rem_minmax(0,1fr)_4rem] items-center gap-1.5">
                        <span className={cn(
                            "flex flex-col whitespace-nowrap font-mono text-[13px] leading-4 tabular-nums",
                            isLatest ? "font-bold text-neutral-700 dark:text-neutral-200" : "text-neutral-500 dark:text-neutral-400"
                        )} title={period} aria-label={period}>
                            <span aria-hidden="true">{date}</span>
                            {basis && <span aria-hidden="true" className="text-[13px] font-normal leading-3 text-neutral-500 dark:text-neutral-400">{basis}</span>}
                        </span>

                        <div className={cn(
                            "relative rounded bg-neutral-100 dark:bg-[#322f2a]",
                            isLatest ? "h-3" : "h-2"
                        )}>
                            {geo.zeroPct > 0 && (
                                <span className="absolute -inset-y-0.5 w-px bg-neutral-400/50 dark:bg-neutral-500/50" style={{ left: `${geo.zeroPct}%` }} />
                            )}
                            {!bar.empty && bar.pct > 0 && (
                                <span
                                    className={cn(
                                        "absolute inset-y-0 rounded",
                                        bar.negative ? "bg-[#d4525c]" : TONE_BG[item.tone],
                                        isLatest ? "opacity-100" : "opacity-40"
                                    )}
                                    style={bar.negative
                                        ? { right: `${100 - geo.zeroPct}%`, width: `${bar.pct}%` }
                                        : { left: `${geo.zeroPct}%`, width: `${bar.pct}%` }}
                                />
                            )}
                        </div>

                        <span className={cn(
                            "whitespace-nowrap text-right font-mono tabular-nums",
                            isLatest ? "text-[13px] font-bold text-neutral-800 dark:text-neutral-100" : "text-[13px] text-neutral-500 dark:text-neutral-400",
                            v !== null && v < 0 && "text-rose-700 dark:text-rose-300"
                        )}>
                            {f(v)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ── 명세서 한 장 ─────────────────────────────────────────────────────────
function StatementCard({ model, unit }: { model: BarModel; unit: Unit }) {
    return (
        <div className="bg-transparent sm:bg-white dark:sm:bg-surface-dark-card rounded-none border-0 sm:rounded-xl sm:border border-neutral-200 dark:border-border-subtle-dark overflow-hidden">
            <div className="px-0 sm:px-5 py-2 sm:py-3.5 border-b border-neutral-100 dark:border-border-subtle-dark flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h4 className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100">{model.title}</h4>
                <span className="font-mono text-[13px] text-neutral-600 dark:text-neutral-300">
                    {compactPeriod(model.periods[0] ?? "").date} → {compactPeriod(model.periods[model.periods.length - 1] ?? "").date}
                    {unit === "eok" ? " · 억 원" : " · USD"}
                </span>
            </div>

            {model.stacks.length > 0 && (
                <div className="px-0 sm:px-5 py-2 sm:py-4 bg-surface-canvas dark:bg-surface-dark border-b border-neutral-100 dark:border-border-subtle-dark flex flex-col gap-2 sm:gap-3.5">
                    <span className="font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-300">
                        한눈에 · {compactPeriod(model.periods[0] ?? "").date}
                    </span>
                    {model.stacks.map(s => <Stack key={s.title} row={s} />)}
                </div>
            )}

            <div className="px-0 sm:px-5 pb-3 sm:pb-5">
                {model.groups.map(g => (
                    <div key={g.labelEn}>
                        <div className="flex items-center gap-1.5 mt-3 sm:mt-5 mb-1.5 sm:mb-2 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-300">
                            <i className={cn("w-[7px] h-[7px] rounded-full shrink-0", TONE_BG[g.tone])} />
                            {g.labelEn}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-4">
                            {g.items.map(item => (
                                <TrendBlock key={item.label} item={item} periods={model.periods} unit={unit} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FinancialBars({ bs, is, unit }: { bs: BarModel | null; is: BarModel | null; unit: Unit }) {
    if (!bs && !is) return null;
    return (
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
            {bs && <StatementCard model={bs} unit={unit} />}
            {is && <StatementCard model={is} unit={unit} />}
            <details className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                <summary className="flex min-h-11 cursor-pointer items-center font-medium">그래프 읽는 법</summary>
                <p>각 항목의 첫 줄이 최신 자료입니다. 막대 길이는 같은 항목의 기간별 변화만 비교하세요. 증감률은 표시된 자료 중 가장 오래된 값과 최신 값을 비교합니다.</p>
                <p className="mt-2">항목별 최댓값을 100%로 표시하며, 항목끼리 막대 길이를 비교할 수 없습니다. 구성 막대는 한 줄의 합계가 100%입니다.</p>
                {unit === "usd" && <p className="mt-2">USD · K = 천 달러 · M = 백만 달러 · B = 십억 달러. —는 공시 자료에 값이 없다는 뜻이며 0과 다릅니다.</p>}
            </details>
        </div>
    );
}
