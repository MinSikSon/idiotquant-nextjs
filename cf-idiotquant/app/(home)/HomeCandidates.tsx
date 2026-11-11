"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleHelp } from "lucide-react";
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
            <div className={styles.mobilePick} aria-label="오늘의 추천 요약">
                <div><span>오늘의 추천 종목</span><strong>{loading ? "후보 점검 중" : recommendation?.name ?? "선정 보류"}</strong><small>{recommendation ? `기본 점검 통과 · 가격 조건 ${homeCandidateFacts(recommendation, now).matched}/3 충족` : "선정 근거는 아래에서 확인하세요"}</small></div>
                {recommendation && <Link href={`/analyze?ticker=${encodeURIComponent(recommendation.ticker)}`} aria-label={`오늘의 추천 ${recommendation.name} 분석`}>{price(recommendation, market)}<ArrowRight size={14} aria-hidden="true" /></Link>}
            </div>
            <div className={styles.results} aria-busy={loading}>
                {loading ? <div role="status" className={styles.loading}>가격과 재무 조건을 불러오고 있습니다…</div>
                    : failed ? <div role="alert" className={styles.empty}><h3>후보를 불러오지 못했습니다</h3><p>연결 상태를 확인하고 다시 시도해 주세요.</p><button type="button" onClick={() => { setFailure(null); setAttempt(value => value + 1); }}>다시 불러오기</button></div>
                        : !items.length ? <div className={styles.empty}><h3>현재 조건에 맞는 후보가 없습니다</h3><p>{checkedOnly ? "기본 점검 필터를 해제하거나 다른 전략을 골라보세요." : "다른 전략을 골라 후보를 살펴보세요."}</p></div>
                            : <div className={styles.cardGrid} aria-label="로고형 후보 목록">
                                {items.map(item => (
                                    <article key={`${market}:${item.ticker}`} className={styles.candidate} data-ticker={item.ticker}>
                                        <Link href={`/analyze?ticker=${encodeURIComponent(item.ticker)}`} className={styles.candidateLink} aria-label={`${item.name} 상세 분석`} />
                                        <div className={styles.logo}><StockLogo key={`${market}:${item.ticker}`} ticker={item.ticker} name={item.name} isUs={market === "US"} /></div>
                                        <span className={styles.company}>{item.name}</span>
                                        <strong className={styles.price}>{price(item, market)}</strong>
                                    </article>
                                ))}
                            </div>}
                <div className={styles.resultsFooter}><p>수집 {number(data?.total, 0)}개 중 {selectedFilter.label} 상위 {candidates.length}개 미리보기</p><Link href={resultsHref}>{isLoggedIn ? "전체 후보 보기" : "후보 더 살펴보기"}<ArrowRight size={15} aria-hidden="true" /></Link></div>
            </div>
            <aside className={styles.recommendation} aria-labelledby="recommendation-title">
                <div className={styles.recommendationLabel}><span className={styles.todayDot} />오늘 먼저 살펴볼 한 종목</div>
                <h2 id="recommendation-title">오늘의 추천 종목</h2>
                <p className={styles.recommendationContext}>{market === "KR" ? "국장" : "미장"} · {selectedFilter.label} 후보 중 자동 선정</p>
                {loading ? <p role="status" className={styles.recommendationEmpty}>후보를 점검하고 있습니다…</p> : recommendation ? <>
                    <div className={styles.pickCompany}><StockLogo key={`${market}:${recommendation.ticker}`} ticker={recommendation.ticker} name={recommendation.name} isUs={market === "US"} /><div><h3>{recommendation.name}</h3><p>{recommendation.ticker}</p></div></div>
                    <strong className={styles.pickPrice}>{price(recommendation, market)}</strong>
                    <p className={styles.pickReason}>{homeCandidateFacts(recommendation, now).conditions.filter(condition => condition.met === true).map(condition => condition.label).join(" · ")} 조건을 충족하고 기본 점검을 통과했습니다. 적격 후보 중 조건 충족 수, 시가총액 순으로 골랐습니다.</p>
                    <div className={styles.pickFacts}><span><Check size={14} aria-hidden="true" />기본 점검 통과</span><span>가격 조건 {homeCandidateFacts(recommendation, now).matched}/3 충족</span></div>
                    <Link href={`/analyze?ticker=${encodeURIComponent(recommendation.ticker)}`} className={styles.pickAction}>추천 근거 자세히 보기<ArrowRight size={16} aria-hidden="true" /></Link>
                </> : <div className={styles.recommendationEmpty}><CircleHelp size={22} aria-hidden="true" /><h3>오늘은 선정을 보류합니다</h3><p>{failed ? "수집 데이터가 없어 후보를 선정할 수 없습니다." : "현재 후보 중 기본 점검을 통과하고 가격 조건을 1개 이상 충족한 종목이 없습니다."}</p></div>}
                <details className={styles.method}><summary>선정·위험 점검 기준</summary><p>표시 중인 후보에서 가격 조건 1개 이상 충족, 흑자, BPS 양수, 순유동자산 0 이상, 유효한 PER·PBR, 최근 3년 이내 재무 기준일, 3일 이내 수집 주가를 확인합니다. 조건 충족 수가 같으면 시총이 큰 종목을 선정합니다. 미래 수집일·기준일 미확인 종목은 제외합니다.</p><p>저PER: 0 &lt; PER ≤ 10 · 저PBR: 0 &lt; PBR &lt; 0.5 · NCAV: 순유동자산/시총 ≥ 100%. 이 세 조건은 가격 조건이며 흑자 여부는 별도 점검합니다.</p><p>기본 통과는 종합 위험등급이 아닙니다. 매수 전 실시간 가격과 최신 공시를 확인하세요.</p></details>
                <p className={styles.pickNote}>수집 데이터로 고른 탐색 후보입니다. 내일의 수익을 예측하지 않습니다.</p>
            </aside>
        </div>
    </section>;
}
