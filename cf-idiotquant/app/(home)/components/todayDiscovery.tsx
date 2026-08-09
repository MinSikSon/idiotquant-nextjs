"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ValueMedal } from "@/components/valueMedal";
import { computeValueScore } from "@/lib/utils/valueScore";
import { STRATEGY_LABEL, STRATEGY_BADGE, STRATEGY_PRESETS_CLIENT } from "@/lib/constants/strategies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

const TOP_N = 4;

/* ─────────────────────────────────────────────────────────────────────────
   오늘의 상위 발굴 — 랜딩에서 제품 가치를 말이 아니라 결과로 보여주는 자리.
   내용이 매일 바뀌므로 재방문 이유가 되고, 가입 전에도 무엇을 얻는지 알 수 있다.
   ───────────────────────────────────────────────────────────────────────── */

// 백엔드 strategies 가 비어 있어도 전략이 하나도 없는 것처럼 보이지 않게, 발굴 화면과
// 같은 클라이언트 판정을 한 번 더 적용해 대표 전략 하나를 고른다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function primaryStrategy(item: Record<string, any>): string | null {
    const fromServer: string[] = item.strategies ?? [];
    if (fromServer.length > 0) return fromServer[0];
    return STRATEGY_PRESETS_CLIENT.find(p => p.clientFilter?.(item))?.id ?? null;
}

// Tailwind는 소스에 적힌 문자열만 추출하므로 그리드 클래스는 반드시 리터럴로 쓴다
// (문자열을 조합해 만들면 CSS가 생성되지 않아 레이아웃이 통째로 깨진다).
const ROW_GRID =
  "grid gap-3.5 items-center grid-cols-[minmax(0,1fr)_auto] " +
  "sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)_74px_62px_62px_66px]";

export function TodayDiscovery({
  list,
  totalCount,
  isLoading,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: Record<string, any>[];
  totalCount: number;
  isLoading: boolean;
}) {
  const top = [...list]
    .sort((a, b) => computeValueScore(b).score - computeValueScore(a).score)
    .slice(0, TOP_N);

  const rest = Math.max(0, totalCount - top.length);

  return (
    <section className="border-b border-neutral-100 dark:border-[#1c2f26] bg-white dark:bg-[#0a1510]/85">
      <div className="max-w-4xl mx-auto px-5 py-10">

        <div className="flex items-end justify-between gap-3 mb-3.5">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="text-[13px] font-extrabold text-neutral-900 dark:text-white shrink-0">오늘 남은 회사</h2>
            <span className="text-[11px] text-neutral-400 dark:text-white/35 shrink-0">싼 순서로</span>
          </div>
          <Link
            href="/screener"
            className="inline-flex items-center min-h-[44px] px-2 -mx-2 text-[11.5px] font-bold text-[#16a34a] dark:text-[#22c55e] hover:opacity-70 transition-opacity shrink-0"
          >
            {totalCount > 0 ? `${totalCount}개 전체 보기 →` : "발굴 결과 보기 →"}
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-[#22402f] overflow-hidden bg-white dark:bg-[#101b15]">

          {/* 헤더 행 — 좁은 폭에서는 지표 컬럼을 접고 종목·전략만 남긴다 */}
          <div className="hidden sm:grid gap-3.5 items-center sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)_74px_62px_62px_66px] px-[18px] py-2.5 bg-[#faf9f7] dark:bg-[#0c1712] border-b border-neutral-200 dark:border-[#22402f]">
            {["종목", "전략"].map(h => (
              <span key={h} className="text-[10px] font-bold text-neutral-400 dark:text-white/35 uppercase tracking-[0.07em]">{h}</span>
            ))}
            {["NCAV", "PBR", "PER", "ROE"].map(h => (
              <span key={h} className="text-[10px] font-bold text-neutral-400 dark:text-white/35 uppercase tracking-[0.07em] text-right">{h}</span>
            ))}
          </div>

          {isLoading && top.length === 0 ? (
            // 행 높이를 유지한 스켈레톤 — 데이터가 도착해도 레이아웃이 튀지 않아야 한다
            <div>
              {Array.from({ length: TOP_N }).map((_, i) => (
                <div key={i} className="px-[18px] py-[13px] border-b border-neutral-100 dark:border-[#18271f] last:border-0">
                  <div className="h-[34px] rounded-lg bg-[#f5f4f1] dark:bg-[#16231c] animate-pulse" />
                </div>
              ))}
            </div>
          ) : top.length === 0 ? (
            <p className="px-[18px] py-8 text-center text-xs text-neutral-400 dark:text-white/40">
              오늘 조건을 충족한 종목이 아직 없습니다.
            </p>
          ) : (
            <div>
              {top.map(item => {
                const strategy = primaryStrategy(item);
                const ncav = safeNum(item.ncav_ratio);
                const pbr = safeNum(item.pbr);
                const per = safeNum(item.per);
                const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;

                return (
                  <Link
                    key={item.ticker}
                    href={`/analyze?ticker=${encodeURIComponent(item.name)}`}
                    className={cn(
                      ROW_GRID,
                      "px-[18px] py-[13px] border-b border-neutral-100 dark:border-[#18271f] last:border-0",
                      "hover:bg-[#faf9f7] dark:hover:bg-[#13211a] transition-colors"
                    )}
                  >
                    {/* 종목 */}
                    <div className="flex items-center gap-2 min-w-0">
                      <ValueMedal item={item} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                        <p className="text-[10.5px] font-mono tracking-[0.05em] text-neutral-400 dark:text-white/35 mt-0.5">{item.ticker}</p>
                      </div>
                    </div>

                    {/* 전략 */}
                    <div className="min-w-0">
                      {strategy && (
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold",
                          STRATEGY_BADGE[strategy] ?? "bg-[#faf9f7] text-neutral-500 dark:bg-white/10 dark:text-white/70"
                        )}>
                          {STRATEGY_LABEL[strategy] ?? strategy}
                        </span>
                      )}
                    </div>

                    <span className="hidden sm:block text-[13px] font-mono font-extrabold tabular-nums text-[#16a34a] dark:text-[#4ade80] text-right">
                      {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
                    </span>
                    <span className="hidden sm:block text-[13px] font-mono tabular-nums text-neutral-600 dark:text-white/70 text-right">
                      {pbr > 0 ? pbr.toFixed(2) : "—"}
                    </span>
                    <span className="hidden sm:block text-[13px] font-mono tabular-nums text-neutral-600 dark:text-white/70 text-right">
                      {per > 0 ? per.toFixed(1) : "—"}
                    </span>
                    <span className="hidden sm:block text-[13px] font-mono tabular-nums text-neutral-600 dark:text-white/70 text-right">
                      {roe !== null && roe > 0 ? `${roe.toFixed(1)}%` : "—"}
                    </span>
                  </Link>
                );
              })}

              {rest > 0 && (
                <Link
                  href="/screener"
                  className="block px-[18px] py-3 bg-[#faf9f7] dark:bg-[#0c1712] text-center text-[11.5px] font-bold text-[#16a34a] dark:text-[#22c55e] hover:opacity-70 transition-opacity"
                >
                  나머지 {rest}개 종목 보기 →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
