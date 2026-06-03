"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import {
    RefreshCw, Loader2, CheckCircle2, Clock,
    Database, TrendingUp, Activity, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── 타입 ───────────────────────────────────────────────
interface ScanInfo {
    scanDate: string | null;
    lastIndex: number;
    done: boolean;
    updatedAt: string | null;
    totalStocks: number;
    progressPct: number;
}

interface ArchiveInfo {
    weekLabel: string | null;
    weekLastIndex: number;
    weekDone: boolean;
    weekProgressPct: number;
    monthLabel: string | null;
    monthLastIndex: number;
    monthDone: boolean;
    monthProgressPct: number;
}

interface DailySummary {
    total_rows: number;
    scan_days: number;
    unique_tickers: number;
    latest_date: string | null;
    oldest_date: string | null;
}

interface ArchivePeriod {
    period_type: string;
    periods: number;
    total_rows: number;
}

interface StatusData {
    scan: ScanInfo;
    archive: ArchiveInfo;
    stockDataDaily: DailySummary;
    stockDataArchive: ArchivePeriod[];
}

interface DailyDate {
    scan_date: string;
    total_cnt: number;
    ncav_cnt: number;
    low_pbr_cnt: number;
    low_per_cnt: number;
    s_rim_cnt: number;
}

// ── 상수 ───────────────────────────────────────────────
const STRATEGY_META = [
    { key: "ncav_cnt",    label: "NCAV",   color: "text-emerald-500",  bg: "bg-emerald-500" },
    { key: "low_pbr_cnt", label: "저PBR",  color: "text-blue-500",     bg: "bg-blue-500" },
    { key: "low_per_cnt", label: "저PER",  color: "text-orange-500",   bg: "bg-orange-500" },
    { key: "s_rim_cnt",   label: "S-RIM",  color: "text-violet-500",   bg: "bg-violet-500" },
] as const;

// ── 유틸 ───────────────────────────────────────────────
function fmtDate(d: string | null): string {
    if (!d) return "—";
    if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    return d;
}

function fmtKst(iso: string | null): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
    } catch {
        return iso;
    }
}

// ── 진행 바 ────────────────────────────────────────────
function ProgressBar({ pct, color = "bg-blue-500" }: { pct: number; color?: string }) {
    return (
        <div className="w-full bg-zinc-700 rounded-full h-2 overflow-hidden">
            <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.min(100, pct)}%` }}
            />
        </div>
    );
}

// ── 상태 배지 ──────────────────────────────────────────
function StatusBadge({ done }: { done: boolean }) {
    return done ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={11} /> 완료
        </span>
    ) : (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full">
            <Clock size={11} /> 진행 중
        </span>
    );
}

// ── 메인 페이지 ────────────────────────────────────────
export default function ScanStatusPage() {
    const [status, setStatus] = useState<StatusData | null>(null);
    const [dates, setDates] = useState<DailyDate[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statusRes, datesRes] = await Promise.all([
                fetch("/api/proxy/scan/status"),
                fetch("/api/proxy/scan/daily/dates"),
            ]);
            const statusJson = await statusRes.json();
            const datesJson = await datesRes.json();
            if (statusJson.success) setStatus(statusJson.data);
            if (datesJson.success) setDates(datesJson.data ?? []);
            setLastRefresh(new Date());
        } catch {
            setError("데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, 60_000);
        return () => clearInterval(id);
    }, [fetchData]);

    const scan = status?.scan;
    const archive = status?.archive;
    const daily = status?.stockDataDaily;
    const archivePeriods = status?.stockDataArchive ?? [];
    const latestDate = dates[0];
    const weeklyInfo  = archivePeriods.find(p => p.period_type === "weekly");
    const monthlyInfo = archivePeriods.find(p => p.period_type === "monthly");

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-6 max-w-4xl mx-auto">
            {/* ── 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Activity size={20} className="text-blue-400" />
                        스캔 현황 대시보드
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">
                        {lastRefresh
                            ? `마지막 갱신: ${lastRefresh.toLocaleTimeString("ko-KR")} · 60초 자동 갱신`
                            : "로딩 중…"}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                >
                    {loading
                        ? <Loader2 size={13} className="animate-spin" />
                        : <RefreshCw size={13} />}
                    새로고침
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-800 rounded-lg text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* ── 요약 카드 4개 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <SummaryCard
                    icon={<Database size={15} className="text-zinc-400" />}
                    label="총 스캔 기록"
                    value={daily?.total_rows != null ? daily.total_rows.toLocaleString() : "—"}
                    sub={daily ? `${fmtDate(daily.oldest_date)} ~ ${fmtDate(daily.latest_date)}` : undefined}
                />
                <SummaryCard
                    icon={<TrendingUp size={15} className="text-zinc-400" />}
                    label="고유 종목 수"
                    value={daily?.unique_tickers != null ? daily.unique_tickers.toLocaleString() : "—"}
                    sub={scan ? `전체 ${scan.totalStocks.toLocaleString()}종 중 ${Math.round((daily?.unique_tickers ?? 0) / scan.totalStocks * 100)}%` : undefined}
                />
                <SummaryCard
                    icon={<Archive size={15} className="text-zinc-400" />}
                    label="주별 아카이브"
                    value={weeklyInfo ? `${weeklyInfo.periods}주` : "—"}
                    sub={weeklyInfo ? `${weeklyInfo.total_rows.toLocaleString()}행` : undefined}
                />
                <SummaryCard
                    icon={<Archive size={15} className="text-zinc-400" />}
                    label="월별 아카이브"
                    value={monthlyInfo ? `${monthlyInfo.periods}개월` : "—"}
                    sub={monthlyInfo ? `${monthlyInfo.total_rows.toLocaleString()}행` : undefined}
                />
            </div>

            {/* ── 진행 상태 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {/* 스캔 사이클 */}
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            스캔 사이클 진행
                        </span>
                        {scan && <StatusBadge done={scan.done} />}
                    </div>
                    {scan ? (
                        <>
                            <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                                <span>스캔일: <span className="text-zinc-300">{fmtDate(scan.scanDate)}</span></span>
                                <span className="font-semibold text-zinc-200">{scan.progressPct}%</span>
                            </div>
                            <ProgressBar pct={scan.progressPct} color="bg-blue-500" />
                            <div className="mt-2 text-xs text-zinc-500">
                                {scan.lastIndex.toLocaleString()} / {scan.totalStocks.toLocaleString()}종목
                                <span className="ml-2">· 갱신: {fmtKst(scan.updatedAt)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-zinc-600">데이터 없음</div>
                    )}
                </div>

                {/* 아카이브 진행 */}
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-3">
                        롤링 아카이브 진행
                    </span>
                    {archive ? (
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                    <span className="flex items-center gap-1">
                                        주별
                                        {archive.weekDone && <CheckCircle2 size={10} className="text-emerald-400" />}
                                    </span>
                                    <span>{archive.weekLabel ?? "미시작"} · {archive.weekProgressPct}%</span>
                                </div>
                                <ProgressBar pct={archive.weekProgressPct} color="bg-blue-500" />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                    <span className="flex items-center gap-1">
                                        월별
                                        {archive.monthDone && <CheckCircle2 size={10} className="text-emerald-400" />}
                                    </span>
                                    <span>{archive.monthLabel ?? "미시작"} · {archive.monthProgressPct}%</span>
                                </div>
                                <ProgressBar pct={archive.monthProgressPct} color="bg-emerald-500" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-zinc-600">데이터 없음</div>
                    )}
                </div>
            </div>

            {/* ── 오늘의 전략별 종목 수 */}
            {latestDate && (
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            최신 스캔일 전략별 현황
                        </span>
                        <span className="text-xs text-zinc-500">{fmtDate(latestDate.scan_date)} · 총 {latestDate.total_cnt.toLocaleString()}종목</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {STRATEGY_META.map(({ key, label, color, bg }) => {
                            const cnt = latestDate[key as keyof DailyDate] as number;
                            const pct = latestDate.total_cnt > 0 ? (cnt / latestDate.total_cnt) * 100 : 0;
                            return (
                                <div key={key} className="bg-zinc-800/60 rounded-lg p-3">
                                    <div className={cn("text-2xl font-bold mb-1", color)}>
                                        {cnt.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-zinc-400 mb-2">{label}</div>
                                    <div className="w-full bg-zinc-700 rounded-full h-1">
                                        <div
                                            className={cn("h-full rounded-full", bg)}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-zinc-600 mt-1">{pct.toFixed(1)}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 날짜별 스캔 현황 테이블 */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-200">날짜별 스캔 현황</span>
                    <span className="text-xs text-zinc-500">최근 30일</span>
                </div>
                {dates.length === 0 ? (
                    <div className="p-6 text-center text-sm text-zinc-600">
                        {loading ? "로딩 중…" : "스캔 데이터가 없습니다"}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-zinc-500 border-b border-zinc-800 uppercase tracking-wider">
                                    <th className="text-left px-4 py-2.5 font-medium">스캔일</th>
                                    <th className="text-right px-3 py-2.5 font-medium">전체</th>
                                    <th className="text-right px-3 py-2.5 font-medium text-emerald-500">NCAV</th>
                                    <th className="text-right px-3 py-2.5 font-medium text-blue-500">저PBR</th>
                                    <th className="text-right px-3 py-2.5 font-medium text-orange-500">저PER</th>
                                    <th className="text-right px-3 py-2.5 font-medium text-violet-500">S-RIM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dates.map((row, i) => (
                                    <tr
                                        key={row.scan_date}
                                        className={cn(
                                            "border-b border-zinc-800/60 hover:bg-zinc-800/40 transition",
                                            i === 0 && "bg-zinc-800/20"
                                        )}
                                    >
                                        <td className="px-4 py-2.5 font-mono text-zinc-300">
                                            {fmtDate(row.scan_date)}
                                            {i === 0 && (
                                                <span className="ml-2 text-[10px] bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded">
                                                    최신
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right px-3 py-2.5 font-semibold text-zinc-200">
                                            {row.total_cnt.toLocaleString()}
                                        </td>
                                        <td className="text-right px-3 py-2.5 text-emerald-400 font-medium">
                                            {row.ncav_cnt}
                                        </td>
                                        <td className="text-right px-3 py-2.5 text-blue-400">
                                            {row.low_pbr_cnt}
                                        </td>
                                        <td className="text-right px-3 py-2.5 text-orange-400">
                                            {row.low_per_cnt}
                                        </td>
                                        <td className="text-right px-3 py-2.5 text-violet-400">
                                            {row.s_rim_cnt}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── 파이프라인 안내 */}
            <div className="mt-5 p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-500 leading-relaxed">
                <span className="font-semibold text-zinc-300">스캔 파이프라인</span>
                {" "}· 7종목/5분 롤링 스캔 (1사이클 ≈ 24h) ·{" "}
                <span className="text-blue-400">NCAV</span>{" "}
                <span className="text-blue-400">저PBR</span>{" "}
                <span className="text-blue-400">저PER</span>{" "}
                <span className="text-blue-400">S-RIM</span> 전략 태그 자동 산출 ·
                {" "}14일 일별 보존 → 주별(26주) / 월별(무기한) 아카이브
            </div>
        </div>
    );
}

// ── 요약 카드 컴포넌트 ─────────────────────────────────
function SummaryCard({
    icon, label, value, sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-1.5 mb-2 text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                {icon} {label}
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">{value}</div>
            {sub && <div className="text-xs text-zinc-500 truncate">{sub}</div>}
        </div>
    );
}
