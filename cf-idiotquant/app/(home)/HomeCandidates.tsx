"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { StockLogo } from "@/components/stockLogo";
import { homeCandidateFacts, pickHomeCandidate } from "@/lib/utils/homeCandidateFacts";
import { HOME_STOCK_FILTERS, homeResultsHref, type HomeStock, type HomeStockFilter, type HomeStockPreview } from "@/lib/utils/homeStockPreview";
import styles from "./candidates.module.css";

const number = (value: number | null | undefined, digits = 1) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("ko-KR", { maximumFractionDigits: digits }) : "—";
const price = (item: HomeStock, market: "KR" | "US") => `${market === "KR" ? "₩" : "$"}${number(item.last_price, market === "KR" ? 0 : 2)}`;
const date = (value: string | null | undefined) => value ? value.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1.$2.$3") : "미확인";

type Props = { isLoggedIn: boolean };

export default function HomeCandidates({ isLoggedIn }: Props) {
    const [market, setMarket] = useState<"KR" | "US">("KR");
    const [filter, setFilter] = useState<HomeStockFilter>("large_cap");
    const [checkedOnly, setCheckedOnly] = useState(false);
    const [snapshot, setSnapshot] = useState<{ market: string; data: HomeStockPreview } | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        fetch(`/api/public/home-stocks?country=${market}`, { signal: controller.signal, cache: attempt ? "reload" : "default" })
            .then(async response => {
                const data = await response.json();
                if (!response.ok || !data.groups) throw new Error("unavailable");
                if (!controller.signal.aborted) { setSnapshot({ market, data }); setFailure(null); }
            }).catch(() => { if (!controller.signal.aborted) setFailure(market); });
        return () => controller.abort();
    }, [market, attempt]);
    const data = snapshot?.market === market ? snapshot.data : null;
    const failed = failure === market;
    const loading = !data && !failed;
    const now = new Date();
    const candidates = data?.groups[filter] ?? [];
    const items = checkedOnly ? candidates.filter(item => homeCandidateFacts(item, now).status === "checked") : candidates;
    const recommendation = pickHomeCandidate(items, now);
    const selectedFilter = HOME_STOCK_FILTERS.find(item => item.id === filter)!;
    const resultsHref = homeResultsHref(filter, market);

    return <section id="stock-preview" className={styles.discovery} aria-labelledby="candidates-title">
        <div className={styles.filters}>
            <div className={styles.filterLine}>
                <div className="discovery-filters" role="group" aria-label="종목 시장">
                    {(["KR", "US"] as const).map(country => <button key={country} type="button" aria-pressed={market === country} onClick={() => { setMarket(country); }}>{country === "KR" ? "국장" : "미장"}</button>)}
                </div>
                <span className={styles.collection}>주가 수집 {date(data?.scanDate)} · 실시간 아님</span>
            </div>
            <div className={styles.filterLine}>
                <div className="discovery-filters" role="group" aria-label="후보 전략 조건">
                    {HOME_STOCK_FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); }}>{item.label}</button>)}
                </div>
                <details className={styles.riskControls}><summary>위험 필터{checkedOnly ? " ✓" : ""}<ChevronDown size={14} aria-hidden="true" /></summary><div><label className={styles.riskFilter}><input type="checkbox" checked={checkedOnly} onChange={event => { setCheckedOnly(event.target.checked); }} />기본 점검 통과만</label><p>적자·자본잠식·기준일 미확인 종목을 제외합니다.</p></div></details>
            </div>
        </div>
        <div className={styles.toolbar}>
            <div><h2 id="candidates-title">{market === "KR" ? "국장" : "미장"} 투자 후보 <span>{items.length}</span></h2><p>{selectedFilter.description}{checkedOnly ? " · 미리보기 내 기본 점검 통과 종목" : ""}</p></div>
        </div>
        <div className={styles.workspace}>
            <div className={styles.results} aria-busy={loading}>
                {loading ? <div role="status" className={styles.loading}>가격과 재무 조건을 불러오고 있습니다…</div>
                    : failed ? <div role="alert" className={styles.empty}><h3>후보를 불러오지 못했습니다</h3><p>연결 상태를 확인하고 다시 시도해 주세요.</p><button type="button" onClick={() => { setFailure(null); setAttempt(value => value + 1); }}>다시 불러오기</button></div>
                        : !items.length ? <div className={styles.empty}><h3>현재 조건에 맞는 후보가 없습니다</h3><p>{checkedOnly ? "기본 점검 필터를 해제하거나 다른 전략을 골라보세요." : "다른 전략을 골라 후보를 살펴보세요."}</p></div>
                            : <div className={styles.cardGrid} aria-label="로고형 후보 목록">
                                {items.map(item => (
                                    <article key={`${market}:${item.ticker}`} className={styles.candidate} data-ticker={item.ticker} data-selected={item.ticker === recommendation?.ticker || undefined}>
                                        <Link href={`/analyze?ticker=${encodeURIComponent(item.ticker)}`} className={styles.candidateLink} aria-label={`${item.name}${item.ticker === recommendation?.ticker ? " · 선정 종목" : ""} 상세 분석`} />
                                        <div className={styles.logo}><StockLogo key={`${market}:${item.ticker}`} ticker={item.ticker} name={item.name} isUs={market === "US"} /></div>
                                        <span className={styles.company}>{item.name}</span>
                                        <strong className={styles.price}>{price(item, market)}</strong>
                                    </article>
                                ))}
                            </div>}
                {recommendation && <p className={styles.selectionHint}>강조 테두리: 기본 점검을 통과한 선정 종목</p>}
                <div className={styles.resultsFooter}><p>수집 {number(data?.total, 0)}개 중 {selectedFilter.label} 상위 {candidates.length}개 미리보기</p><Link href={resultsHref}>{isLoggedIn ? "전체 후보 보기" : "후보 더 살펴보기"}<ArrowRight size={15} aria-hidden="true" /></Link></div>
            </div>

        </div>
    </section>;
}
