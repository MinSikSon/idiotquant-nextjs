"use client";

import { cn } from "@/lib/utils";
import {
    barGeometry, periodDelta, fmtEok, usdBlockFormatter,
    type BarModel, type BarItem, type StackRow, type Tone,
} from "./financialBars";

// 토큰 하나에서 막대·점·스택 색이 전부 나온다 — 항목마다 색 클래스를 따로 붙이면
// 다크 모드 대응이 두 배가 되고 색이 어긋나기 시작한다.
const TONE_BG: Record<Tone, string> = {
    green: "bg-[#16a34a]",
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
            <p className="text-[12.5px] font-bold text-neutral-800 dark:text-neutral-100">
                {row.title}
                {row.note && <span className="ml-1.5 text-[11px] font-semibold text-neutral-400">{row.note}</span>}
            </p>
            <div className="flex h-7 rounded-lg overflow-hidden bg-neutral-100 dark:bg-[#322f2a]">
                {row.segs.map(seg => (
                    <div
                        key={seg.label}
                        title={`${seg.label} ${seg.pct.toFixed(1)}%`}
                        style={{ width: `${seg.pct}%` }}
                        className={cn(
                            "grid place-items-center min-w-0 overflow-hidden whitespace-nowrap font-mono text-[10.5px] font-black",
                            TONE_BG[seg.tone],
                            seg.pale ? "opacity-45 text-neutral-900 dark:text-white" : "text-white"
                        )}
                    >
                        {seg.pct >= 12 ? `${seg.label} ${Math.round(seg.pct)}%` : seg.pct >= 6 ? `${Math.round(seg.pct)}%` : ""}
                    </div>
                ))}
            </div>
            {row.legend && (
                <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {row.legend.map(l => (
                        <span key={l.label} className="inline-flex items-center gap-1.5">
                            <i className={cn("w-2 h-2 rounded-[2px] shrink-0", TONE_BG[l.tone])} />
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
    if (d.turnedLoss) return <span className="font-mono text-[10.5px] font-bold text-rose-500 dark:text-rose-400">적자전환</span>;

    // 현금흐름처럼 음수가 정상인 항목은 변화율이 오해를 부른다 — 유출이 −4,200 → −5,900 으로
    // 커진 것을 "−40.5%" 로 적으면 줄어든 것처럼 읽힌다. 규모의 방향으로 바꿔 말한다.
    if (item.neutral) {
        const latest = item.values.find(v => v !== null) ?? null;
        const oldest = [...item.values].reverse().find(v => v !== null) ?? null;
        if (latest !== null && oldest !== null && latest < 0 && oldest < 0) {
            return (
                <span className="font-mono text-[10.5px] font-bold text-neutral-400">
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
            "font-mono text-[10.5px] font-bold tabular-nums",
            item.neutral || flat ? "text-neutral-400"
                : good ? "text-[#16a34a] dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
        )}>
            {d.spanCount}기 {flat ? "±0.0%" : `${d.pct > 0 ? "+" : "−"}${Math.abs(d.pct).toFixed(1)}%`}
        </span>
    );
}

// ── 항목 하나(최근 → 과거) ───────────────────────────────────────────────
function TrendBlock({ item, periods, unit }: { item: BarItem; periods: string[]; unit: Unit }) {
    const geo = barGeometry(item.values);
    const f = blockFormatter(unit, item.values);
    const latest = item.values.find(v => v !== null) ?? null;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-1.5">
                <span className={cn(
                    "text-[12.5px] font-bold flex items-center gap-1.5",
                    item.isTotal ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                )}>
                    {item.isTotal && <i className={cn("w-[3px] h-3 rounded-full shrink-0", TONE_BG[item.tone])} />}
                    {item.label}
                </span>
                <DeltaBadge item={item} />
                <span className={cn(
                    "ml-auto font-mono text-[12.5px] font-black tabular-nums",
                    latest !== null && latest < 0 ? "text-rose-500 dark:text-rose-400" : "text-neutral-900 dark:text-white"
                )}>
                    {f(latest)}
                </span>
            </div>

            {item.values.map((v, i) => {
                const bar = geo.bars[i];
                const isLatest = i === 0;
                return (
                    <div key={periods[i] ?? i} className="grid grid-cols-[1.9rem_1fr_3.6rem] items-center gap-1.5">
                        <span className={cn(
                            "font-mono text-[10px] tabular-nums",
                            isLatest ? "font-bold text-neutral-700 dark:text-neutral-200" : "text-neutral-400 dark:text-neutral-500"
                        )}>
                            {(periods[i] ?? "").replace(/^(\d{2})(\d{2})\./, "$2.").replace(/^FY\d{2}/, m => `'${m.slice(4)}`)}
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
                            "text-right font-mono tabular-nums",
                            isLatest ? "text-[11px] font-bold text-neutral-800 dark:text-neutral-100" : "text-[10px] text-neutral-400 dark:text-neutral-500",
                            v !== null && v < 0 && "text-rose-500 dark:text-rose-400"
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
        <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#35332e] flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h4 className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100">{model.title}</h4>
                <span className="font-mono text-[10px] text-neutral-400">
                    {model.periods[0]} → {model.periods[model.periods.length - 1]}
                    {unit === "eok" ? " · 억 원" : " · USD"}
                </span>
            </div>

            {model.stacks.length > 0 && (
                <div className="px-5 py-4 bg-[#faf9f7] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e] flex flex-col gap-3.5">
                    <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                        한눈에 · {model.periods[0]}
                    </span>
                    {model.stacks.map(s => <Stack key={s.title} row={s} />)}
                </div>
            )}

            <div className="px-5 pb-5">
                {model.groups.map(g => (
                    <div key={g.labelEn}>
                        <div className="flex items-center gap-1.5 mt-5 mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                            <i className={cn("w-[7px] h-[7px] rounded-full shrink-0", TONE_BG[g.tone])} />
                            {g.labelEn}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
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
        <div className="flex flex-col gap-4">
            {bs && <StatementCard model={bs} unit={unit} />}
            {is && <StatementCard model={is} unit={unit} />}
            <p className="text-[10.5px] leading-relaxed text-neutral-400 dark:text-neutral-500 break-keep px-1">
                막대 길이는 <span className="font-bold">항목별</span>로 자기 기간 최댓값을 100% 로 잡은 것입니다 —
                같은 항목의 세로 비교용이며, 항목끼리의 길이 비교는 의미가 없습니다.
                맨 위 구성 막대만 한 줄 합계가 100% 입니다.
            </p>
        </div>
    );
}
