"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LikedStockItem } from "@/lib/features/stockLikes/stockLikesSlice";
import { readWatchSnapshot, watchSnapshot, watchChanges, type WatchSnapshot, type WatchChange } from "@/lib/features/stockLikes/changes";
import { STRATEGY_LABEL } from "@/lib/constants/strategies";

const number = (value: number | null) => value === null ? "—" : value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
const strategyName = (id: string) => STRATEGY_LABEL[id] || id;

export default function WatchlistChanges({ items, userId, country }: { items: LikedStockItem[]; userId: string; country: "KR" | "US" }) {
    const key = `idiotquant:watch-changes:v1:${userId}:${country}`;
    const previous = useRef<{ key: string; items: WatchSnapshot[] } | null>(null);
    const [result, setResult] = useState<{ changes: WatchChange[]; first: boolean; failed: boolean } | null>(null);
    useEffect(() => {
        const current = watchSnapshot(items.filter(item => Boolean(item.is_us) === (country === "US")));
        if (!current.length) { setResult(null); return; }
        let failed = false;
        if (previous.current?.key !== key) {
            let saved: WatchSnapshot[] = [];
            try { saved = readWatchSnapshot(localStorage.getItem(key)); } catch { failed = true; }
            previous.current = { key, items: saved };
        }
        const baseline = previous.current.items;
        const changes = watchChanges(baseline, current);
        try { localStorage.setItem(key, JSON.stringify({ version: 1, items: current })); } catch { failed = true; }
        setResult({ changes, first: !baseline.length, failed });
    }, [items, key, country]);
    if (!result) return null;

    return <section aria-label="관심종목 변화" className="mb-5 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <h2 className="text-sm font-semibold">지난 조회 이후 관심종목 변화{result.changes.length > 0 && ` · ${result.changes.length}종목`}</h2>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
            {result.failed ? "브라우저 저장을 사용할 수 없어 다음 조회와 비교하지 못할 수 있습니다." : result.first
                ? "첫 조회 기준을 이 브라우저에 저장했습니다. 다음 조회부터 전략 편입·이탈과 지표 변화를 보여드립니다."
                : "이 브라우저의 이전 조회값과 비교합니다. 전략 변화는 매수·매도 권유가 아닙니다."}
        </p>
        {!result.first && !result.changes.length && <p className="mt-3 text-sm text-neutral-500">이전에 조회한 관심종목의 전략·가격·지표 변화가 없습니다.</p>}
        {result.changes.length > 0 && <div className="mt-3 max-h-80 overflow-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
                <thead><tr className="text-neutral-500"><th className="py-2">종목 / 기준일</th><th>전략 변화</th><th>가격 변화</th><th>PBR</th><th>PER</th><th>NCAV</th></tr></thead>
                <tbody>{result.changes.map(change => <tr key={change.after.ticker} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="py-3 pr-3"><Link className="font-semibold hover:underline" href={`/analyze?ticker=${encodeURIComponent(change.after.ticker)}`}>{change.after.name}</Link><span className="mt-1 block text-[10px] text-neutral-500">{change.before.scanDate} → {change.after.scanDate}</span></td>
                    <td className="pr-3">{change.entered.map(id => <span key={`in-${id}`} className="block">+ {strategyName(id)} 편입</span>)}{change.exited.map(id => <span key={`out-${id}`} className="block">− {strategyName(id)} 이탈</span>)}{!change.entered.length && !change.exited.length && "변화 없음"}</td>
                    <td className="pr-3 tabular-nums">{change.pricePercent === null ? "—" : `${change.pricePercent > 0 ? "+" : ""}${change.pricePercent.toFixed(2)}%`}</td>
                    {(["pbr", "per", "ncav"] as const).map(field => <td key={field} className="pr-3 tabular-nums">{number(change.before[field])} → {number(change.after[field])}</td>)}
                </tr>)}</tbody>
            </table>
        </div>}
    </section>;
}
