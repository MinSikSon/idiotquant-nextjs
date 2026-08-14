"use client";

import { cn } from "@/lib/utils";
import { STRATEGY_LABEL, STRATEGY_PRESETS_CLIENT } from "@/lib/constants/strategies";
import SectorSprite, { sectorAccent } from "./SectorSprite";

/* 결과를 묶어 읽게 만드는 부분. 낱개 147행을 훑는 것보다 "이 전략 12개는 PBR 중위 0.4" 처럼
   덩어리로 읽는 편이 판단이 빠르다. */

export type GroupMode = "none" | "sector" | "strategy";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;
const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };
const roeOf = (i: Item) => (num(i.bps) > 0 ? (num(i.eps) / num(i.bps)) * 100 : 0);

// 평균이 아니라 중위값 — 저PBR 모집단은 이상치가 많아 평균이 쉽게 왜곡된다
function median(xs: number[]): number {
    const v = xs.filter(x => x > 0).sort((a, b) => a - b);
    if (v.length === 0) return 0;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export interface Group {
    key: string;
    label: string;
    sector?: string;
    rows: Item[];
    medPbr: number;
    medRoe: number;
}

export function buildGroups(list: Item[], mode: GroupMode): Group[] | null {
    if (mode === "none") return null;
    const keyOf = (i: Item): string =>
        mode === "sector"
            ? (i.sector ?? i.industry ?? "기타")
            : (STRATEGY_PRESETS_CLIENT.find(p => p.clientFilter?.(i))?.id ?? i.strategies?.[0] ?? "미분류");

    const map = new Map<string, Item[]>();
    for (const i of list) {
        const k = keyOf(i);
        const bucket = map.get(k);
        if (bucket) bucket.push(i);
        else map.set(k, [i]);
    }
    return [...map.entries()]
        .map(([key, rows]) => ({
            key,
            label: mode === "strategy" ? (STRATEGY_LABEL[key] ?? key) : key,
            sector: mode === "sector" ? key : undefined,
            rows,
            medPbr: median(rows.map(r => num(r.pbr))),
            medRoe: median(rows.map(r => roeOf(r))),
        }))
        .sort((a, b) => b.rows.length - a.rows.length);
}

// 기본 펼침 = 상위 2개 그룹. 전부 펼치면 묶은 의미가 없고, 전부 접으면 한 번 더 클릭해야 한다.
export const defaultOpenGroups = (groups: Group[] | null) =>
    new Set((groups ?? []).slice(0, 2).map(g => g.key));

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="hidden sm:flex items-baseline gap-1 shrink-0">
            <span className="text-[10px] text-neutral-400">{label}</span>
            <span className={cn(
                "text-[11px] font-mono font-bold tabular-nums",
                accent ? "text-[#16a34a]" : "text-neutral-600 dark:text-neutral-300"
            )}>{value}</span>
        </div>
    );
}

export function GroupedResults({
    groups, open, onToggle, renderRow, hint, bodyClassName = "pl-[30px]",
}: {
    groups: Group[];
    open: Set<string>;
    onToggle: (key: string) => void;
    renderRow: (item: Item) => React.ReactNode;
    hint?: (g: Group) => string;
    /** 그룹 본문 감싸개. 카드·비율 뷰는 격자라 그 격자 클래스를 그대로 넘긴다. */
    bodyClassName?: string;
}) {
    const hiddenCount = groups.filter(g => !open.has(g.key)).length;

    return (
        <div>
            {groups.map(g => {
                const isOpen = open.has(g.key);
                return (
                    <div key={g.key}>
                        <button
                            onClick={() => onToggle(g.key)}
                            className="w-full flex items-center gap-2.5 px-[18px] py-2.5 bg-[#fbfbf9] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e] hover:bg-[#f5f4f1] dark:hover:bg-[#2c2b27] transition-colors text-left"
                        >
                            <span className={cn("text-[10px] text-neutral-400 transition-transform shrink-0", !isOpen && "-rotate-90")}>▾</span>
                            {/* 폰에서는 한 줄에 이름·개수까지 들어가야 해서 아이콘을 한 단계 줄인다.
                                20×14 격자 비율(1.4)은 유지해야 도트가 정수 배로 떨어진다. */}
                            {g.sector && (
                                <span className="w-[30px] h-[21px] sm:w-[42px] sm:h-[30px] shrink-0 rounded-[5px] overflow-hidden border border-neutral-200 dark:border-[#35332e]">
                                    <SectorSprite sector={g.sector} color={sectorAccent(g.sector)} />
                                </span>
                            )}
                            <span className="text-[12.5px] font-extrabold text-neutral-900 dark:text-neutral-100 shrink-0">{g.label}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] text-[10px] font-mono font-bold shrink-0">
                                {g.rows.length}개
                            </span>
                            {hint && (
                                <span className="text-[10.5px] text-neutral-400 truncate min-w-0">{hint(g)}</span>
                            )}
                            <span className="flex-1" />
                            <Stat label="PBR 중위" value={g.medPbr > 0 ? g.medPbr.toFixed(2) : "—"} />
                            <Stat label="ROE 중위" value={g.medRoe > 0 ? `${g.medRoe.toFixed(1)}%` : "—"} />
                        </button>
                        {isOpen && <div className={bodyClassName}>{g.rows.map(renderRow)}</div>}
                    </div>
                );
            })}
            {hiddenCount > 0 && (
                <p className="px-[18px] py-3 bg-[#faf9f7] dark:bg-[#1f1e1b] text-center text-[11.5px] font-bold text-neutral-500 dark:text-neutral-400">
                    접힌 {hiddenCount}개 그룹은 헤더를 눌러 펼칠 수 있습니다
                </p>
            )}
        </div>
    );
}
