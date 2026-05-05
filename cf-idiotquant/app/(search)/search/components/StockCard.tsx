"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image'; // Image 컴포넌트 추가
import Link from 'next/link';

/**
 * 현실 산업군을 반영한 커스텀 섹터 테마
 */
const SECTOR_THEMES: Record<string, { bg: string; border: string; icon: string; label: string; text: string; lightBg: string; desc: string }> = {
    IRON: { bg: "bg-zinc-500", border: "border-zinc-400", icon: "⚙️", label: "IRON", text: "text-zinc-900", lightBg: "bg-zinc-50", desc: "단단한 강철로 문명을 지탱하는 제조/부품 섹터입니다." },
    CHIP: { bg: "bg-amber-400", border: "border-amber-300", icon: "💾", label: "CHIP", text: "text-amber-900", lightBg: "bg-amber-50", desc: "미세한 회로 속에 무한한 가능성을 담은 반도체 섹터입니다." },
    NET: { bg: "bg-indigo-500", border: "border-indigo-400", icon: "🌐", label: "NET", text: "text-indigo-900", lightBg: "bg-indigo-50", desc: "디지털 세계를 연결하고 새로운 문화를 만드는 플랫폼 섹터입니다." },
    BIO: { bg: "bg-emerald-500", border: "border-emerald-400", icon: "🧬", label: "BIO", text: "text-emerald-900", lightBg: "bg-emerald-50", desc: "인류의 건강과 생명의 신비를 연구하는 헬스케어 섹터입니다." },
    FUEL: { bg: "bg-orange-600", border: "border-orange-500", icon: "🔋", label: "FUEL", text: "text-orange-950", lightBg: "bg-orange-50", desc: "미래를 움직이는 거대한 에너지와 화학의 힘, 연료 섹터입니다." },
    FLOW: { bg: "bg-cyan-500", border: "border-cyan-400", icon: "💸", label: "FLOW", text: "text-cyan-900", lightBg: "bg-cyan-50", desc: "전 세계 자본의 흐름을 조절하는 금융과 투자 섹터입니다." },
    BASE: { bg: "bg-stone-600", border: "border-stone-500", icon: "🏗️", label: "BASE", text: "text-stone-950", lightBg: "bg-stone-50", desc: "도시를 세우고 안전을 책임지는 건설과 인프라 섹터입니다." },
    STAR: { bg: "bg-rose-400", border: "border-rose-300", icon: "✨", label: "STAR", text: "text-rose-900", lightBg: "bg-rose-50", desc: "대중의 사랑과 영감을 먹고 자라는 미디어/엔터 섹터입니다." },
    LIFE: { bg: "bg-lime-400", border: "border-lime-300", icon: "🍎", label: "LIFE", text: "text-lime-900", lightBg: "bg-lime-50", desc: "우리의 일상을 풍요롭게 채워주는 유통과 소비재 섹터입니다." }
};

const GRADE_THEMES: Record<string, { frame: string; label: string; rarity: string; color: string }> = {
    SSS: { frame: "from-pink-300 via-purple-300 to-cyan-300 animate-gradient-x", label: "울트라", rarity: "★★★", color: "#f472b6" }, // pink-400
    SS: { frame: "from-yellow-200 via-amber-400 to-yellow-200", label: "시크릿", rarity: "★★", color: "#fbbf24" },  // amber-400
    S: { frame: "from-amber-200 via-yellow-300 to-amber-500", label: "슈퍼", rarity: "★", color: "#f59e0b" },    // amber-500
    A: { frame: "from-zinc-100 via-slate-200 to-zinc-300", label: "언커먼", rarity: "◆", color: "#94a3b8" },    // slate-400
    DEFAULT: { frame: "from-zinc-200 via-zinc-300 to-zinc-400", label: "커먼", rarity: "●", color: "#71717a" }  // zinc-500
};

// 점수에 따른 등급 판별 함수
const getGradeByScore = (score: number) => {
    if (score >= 150) return GRADE_THEMES.SSS;
    if (score >= 120) return GRADE_THEMES.SS;
    if (score >= 100) return GRADE_THEMES.S;
    if (score >= 70) return GRADE_THEMES.A;
    return GRADE_THEMES.DEFAULT;
};

export const StockCard = ({ stock, rawData }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [imageStatus, setImageStatus] = useState({ loaded: false, error: false });
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    const theme = useMemo(() => {
        const s = (stock.sector || "").toUpperCase();
        if (s.includes("자동차") || s.includes("기계") || s.includes("부품") || s.includes("운수장비")) return SECTOR_THEMES.IRON;
        if (s.includes("반도체") || s.includes("전자") || s.includes("전기") || s.includes("전자제품") || s.includes("IT장비")) return SECTOR_THEMES.CHIP;
        if (s.includes("서비스") || s.includes("소프트웨어") || s.includes("인터넷") || s.includes("게임")) return SECTOR_THEMES.NET;
        if (s.includes("제약") || s.includes("바이오") || s.includes("의료") || s.includes("생명공학")) return SECTOR_THEMES.BIO;
        if (s.includes("화학") || s.includes("에너지") || s.includes("전기차") || s.includes("배터리")) return SECTOR_THEMES.FUEL;
        if (s.includes("금융") || s.includes("은행") || s.includes("증권") || s.includes("보험")) return SECTOR_THEMES.FLOW;
        if (s.includes("건설") || s.includes("방산") || s.includes("철강") || s.includes("중공업") || s.includes("종이") || s.includes("목재")) return SECTOR_THEMES.BASE;
        if (s.includes("미디어") || s.includes("엔터") || s.includes("문화") || s.includes("화장품")) return SECTOR_THEMES.STAR;
        return SECTOR_THEMES.LIFE;
    }, [stock.sector]);

    const gradeTheme = GRADE_THEMES[stock.grade?.grade] || GRADE_THEMES.DEFAULT;

    const analysis = useMemo(() => {
        let debtRatio = 0;
        let highPrice = 0;
        let lowPrice = 0;
        let currentPrice = 0;

        if (stock?.isUs) {
            const info = rawData?.usSearchInfo?.output;
            const detail = rawData?.usDetail?.output;
            const dailyHistory = rawData?.usDaily?.output2 || [];

            // --- 유연한 부채비율 계산 (Finnhub BS 리포트) ---
            const finnhubReport = rawData?.finnhubData?.data?.[0]?.report?.bs || [];

            if (finnhubReport.length > 0) {
                // 1. 부채(Liabilities) 찾기: 'us-gaap_Liabilities' 또는 'Liabilities' (완전 일치 혹은 접두사 포함)
                const totalLiabilities = finnhubReport.find((item: any) =>
                    item.concept === "us-gaap_Liabilities" ||
                    item.concept === "Liabilities" ||
                    item.concept.endsWith("_Liabilities")
                )?.value || 0;

                // 2. 자본(StockholdersEquity) 찾기
                const totalEquity = finnhubReport.find((item: any) =>
                    item.concept === "us-gaap_StockholdersEquity" ||
                    item.concept === "StockholdersEquity" ||
                    item.concept.endsWith("_StockholdersEquity")
                )?.value || 1; // 분모 0 방지

                debtRatio = (totalLiabilities / totalEquity) * 100;
            } else {
                debtRatio = parseFloat(stock?.debtRatio || "0");
            }

            currentPrice = parseFloat(detail?.last || info?.ovrs_now_pric1 || stock?.curPrice || "0");

            if (dailyHistory.length > 0) {
                const highs = dailyHistory.map((d: any) => parseFloat(d.high));
                const lows = dailyHistory.map((d: any) => parseFloat(d.low));
                highPrice = Math.max(...highs);
                lowPrice = Math.min(...lows);
            } else {
                highPrice = parseFloat(info?.h52p || "0");
                lowPrice = parseFloat(info?.l52p || "0");
            }

        } else {
            // [국내장] 로직
            const latestBS = rawData?.kiBS?.output?.[0];
            const totalLblt = parseFloat(latestBS?.total_lblt || "0");
            const totalCptl = parseFloat(latestBS?.total_cptl || "1");
            debtRatio = (totalLblt / totalCptl) * 100;

            const priceInfo = rawData?.kiPrice?.output;
            highPrice = parseFloat(priceInfo?.d250_hgpr || "0");
            lowPrice = parseFloat(priceInfo?.d250_lwpr || "0");
            currentPrice = parseFloat(priceInfo?.stck_prpr || "0");
        }

        // [공통 계산 레이어]
        let debtColor = "text-blue-600";
        if (debtRatio > 200) debtColor = "text-red-600";
        else if (debtRatio > 100) debtColor = "text-orange-500";

        const dropRate = highPrice > 0 ? ((highPrice - currentPrice) / highPrice) * 100 : 0;
        const gapToHigh = currentPrice > 0 ? ((highPrice / currentPrice) - 1) * 100 : 0;
        const retreatMargin = (currentPrice > 0 && lowPrice > 0) ? ((currentPrice - lowPrice) / currentPrice) * 100 : 0;
        const supportStrength = Math.max(0, 100 - retreatMargin);

        // 테두리용 그라데이션 스타일

        return {
            debtRatio: debtRatio.toFixed(1),
            debtColor,
            dropRate: dropRate.toFixed(1),
            gapToHigh: gapToHigh.toFixed(1),
            highPrice: highPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            lowPrice: lowPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            retreatMargin: retreatMargin.toFixed(1),
            supportStrength,
        };
    }, [rawData, stock?.isUs, stock?.curPrice]);

    const ncavGrade = useMemo(() => getGradeByScore(Number(stock.ncavScore || 0)), [stock.ncavScore]);
    const srimGrade = useMemo(() => getGradeByScore(Number(stock.srimScore || 0)), [stock.srimScore]);
    const borderStyle = useMemo(() => {
        // conic-gradient를 사용하여 모서리를 따라 색상이 회전하며 섞이는 효과
        return {
            background: `conic-gradient(from 0deg, ${ncavGrade.color}, ${srimGrade.color}, ${ncavGrade.color})`,
        };
    }, [ncavGrade.color, srimGrade.color]);
    // 1. 티커가 변경될 때마다 이미지 상태를 리셋합니다.
    useEffect(() => {
        setImageStatus({ loaded: false, error: false });
    }, [stock.ticker]); // 티커가 바뀌면 다시 로딩 상태로 돌아감

    const logoUrl = useMemo(() => {
        if (!stock.ticker) return null;

        // 미국 주식
        if (stock.isUs) {
            return `https://img.logo.dev/ticker/${stock.ticker.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=512`;
        }

        // 한국 주식 (URL 끝에 티커가 붙는 구조라면)
        const krBaseUrl = process.env.NEXT_PUBLIC_KR_LOGO_API;
        return krBaseUrl ? `${krBaseUrl}/${stock.ticker}?size=300` : null;
    }, [stock.ticker, stock.isUs]);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        let frameId: number;

        const handleMove = (e: MouseEvent) => {
            // requestAnimationFrame을 사용하여 브라우저 주사율에 맞춰 부드럽게 업데이트
            frameId = requestAnimationFrame(() => {
                const { left, top, width, height } = card.getBoundingClientRect();

                // 중심점으로부터의 상대적 거리 계산 (-0.5 ~ 0.5 범위)
                const xRel = (e.clientX - left) / width - 0.5;
                const yRel = (e.clientY - top) / height - 0.5;

                // 기울기 감도 조절 (기존 25보다 조금 더 세밀한 제어 가능)
                // yRel이 x축 회전(rotateX)에 영향을 주고, xRel이 y축 회전(rotateY)에 영향을 줍니다.
                const intensity = 15;
                setRotation({
                    x: -(yRel * intensity), // 위아래 기울기
                    y: xRel * intensity     // 좌우 기울기
                });

                setGlare({
                    x: (xRel + 0.5) * 100,
                    y: (yRel + 0.5) * 100,
                    opacity: 0.2
                });
            });
        };

        const handleLeave = () => {
            cancelAnimationFrame(frameId);
            // 마우스를 뗐을 때 자연스럽게 중앙으로 복귀
            setRotation({ x: 0, y: 0 });
            setGlare(prev => ({ ...prev, opacity: 0 }));
        };

        card.addEventListener('mousemove', handleMove);
        card.addEventListener('mouseleave', handleLeave);

        return () => {
            card.removeEventListener('mousemove', handleMove);
            card.removeEventListener('mouseleave', handleLeave);
            cancelAnimationFrame(frameId);
        };
    }, []);

    return (
        <div
            ref={cardRef}
            className="group/card relative w-[22.5rem] h-[31.5rem] transition-transform duration-200 ease-out select-none cursor-pointer"
            style={{ perspective: '1200px', transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
        >
            <div className={`w-full h-full p-[14px] rounded-[1.4rem] shadow-2xl relative flex flex-col border-[2px] border-black/10`}
                style={borderStyle}>

                <div
                    className="absolute inset-0 z-[60] pointer-events-none mix-blend-color-dodge opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 rounded-[1.4rem]"
                    style={{
                        background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.4) 0%, rgba(100,100,255,0.1) 40%, rgba(0,0,0,0) 70%)`
                    }}
                />

                <div className={`relative w-full h-full rounded-[0.6rem] bg-gradient-to-br ${gradeTheme.frame} p-[3px] shadow-inner`}>
                    <div className={`w-full h-full ${theme.lightBg} rounded-[0.5rem] flex flex-col relative`}>

                        {/* [HEADER] */}
                        <div className="relative flex justify-between items-end px-3 py-1.5 bg-white/30 border-b border-black/5 rounded-t-[0.5rem] z-[50]">
                            <div className="flex flex-col">
                                <span className="text-[7px] font-bold text-zinc-500 italic uppercase tracking-widest">IdiotQuant v2.5</span>
                                <h3 className="text-zinc-900 font-black text-xl tracking-tighter drop-shadow-sm">{stock.name}</h3>
                            </div>
                            <div className="flex items-center gap-1 text-right">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-red-600 tracking-tighter uppercase">PRICE</span>
                                    <span className="text-xl font-black tracking-tighter text-zinc-900">
                                        {stock.isUs ? "$" : "₩"}{stock.curPrice}
                                    </span>
                                </div>
                                <div
                                    className={`relative w-8 h-8 rounded-full ${theme.bg} flex items-center justify-center shadow-md border-2 border-white/90 ml-1 cursor-help transition-transform hover:scale-110 z-[100]`}
                                    onMouseEnter={() => setActiveTooltip('sector')}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                >
                                    <span className="text-lg drop-shadow-md">{theme.icon}</span>
                                    {activeTooltip === 'sector' && (
                                        <div className="absolute top-10 right-0 z-[110] w-56 p-3 bg-zinc-900 text-white text-[11px] rounded-lg shadow-2xl border border-white/20 leading-relaxed animate-in fade-in zoom-in-95 backdrop-blur-md">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-base">{theme.icon}</span>
                                                <p className="font-black text-yellow-400 uppercase tracking-tighter">{theme.label} Attribute</p>
                                            </div>
                                            <p className="text-zinc-300 font-medium">{theme.desc}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* [IMAGE] 로고 영역 */}
                        <div className="mx-2.5 mt-1.5 relative h-40 border-[5px] border-[#c9c9c9] shadow-inner bg-white overflow-hidden rounded-[2px] z-[10] group/logo">
                            {/* 국가별 메인 출처 링크 설정 */}
                            <Link
                                href={stock.isUs ? "https://logo.dev" : "https://logo.idiotquant.com"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full h-full relative"
                            >
                                {logoUrl && !imageStatus.error ? (
                                    <Image
                                        key={stock.ticker}
                                        src={logoUrl}
                                        alt={stock.name}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                        className={`group-hover/logo:scale-110 transition-all duration-700 ${imageStatus.loaded ? 'opacity-100' : 'opacity-0'}`}
                                        onLoad={() => setImageStatus(prev => ({ ...prev, loaded: true }))}
                                        onError={() => setImageStatus({ loaded: true, error: true })}
                                        unoptimized
                                    />
                                ) : null}

                                {/* [워터마크] 국장: idiotquant / 미장: logo.dev */}
                                {imageStatus.loaded && !imageStatus.error && (
                                    <div className="absolute top-2 left-2 opacity-30 group-hover/logo:opacity-70 transition-opacity pointer-events-none">
                                        <div className="flex flex-col gap-0">
                                            <span className="text-[6px] font-black text-zinc-400 uppercase leading-none">Powered by</span>
                                            <span className="text-[8px] font-black text-black tracking-tighter mix-blend-multiply">
                                                {stock.isUs ? 'logo.dev' : 'logo.idiotquant.com'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* 호버 시 나타나는 가이드 UI */}
                                <div className="absolute inset-0 bg-black/0 group-hover/logo:bg-black/5 transition-colors pointer-events-none" />
                            </Link>

                            {/* 로딩/에러 Fallback */}
                            {(!imageStatus.loaded || imageStatus.error) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 transition-opacity duration-300">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-6xl grayscale opacity-10 animate-pulse">{theme.icon}</span>
                                        <span className="text-[10px] font-black text-zinc-300 tracking-tighter uppercase">{stock.ticker}</span>
                                    </div>
                                </div>
                            )}

                            {/* 하단 지표 정보 바 (디자인 유지) */}
                            <div className={`absolute bottom-0 w-full ${theme.bg} py-1 text-center border-t border-black/20 z-20 pointer-events-none`}>
                                <p className="text-[8px] font-black text-white tracking-[0.2em] uppercase">
                                    PBR: {stock.pbr} | PER: {stock.per} | EPS: {stock.eps}
                                </p>
                            </div>
                        </div>

                        {/* [SKILLS] */}
                        <div className="flex-1 px-4 py-3 flex flex-col justify-center space-y-3 z-[20]">
                            <div
                                className="relative flex items-center justify-between group/skill cursor-help p-1 hover:bg-white/40 rounded-lg transition-colors"
                                onMouseEnter={() => setActiveTooltip('ncav')}
                                onMouseLeave={() => setActiveTooltip(null)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full ${theme.bg} flex items-center justify-center text-[10px] text-white shadow-sm`}>{theme.icon}</div>
                                    <span className="font-black text-[14px] text-zinc-900 tracking-tight">NCAV</span>
                                </div>
                                        
                                <div className="font-black text-[9px] text-zinc-900">({stock.ncavScore || 0}%) 적정주가:{stock.fairValue?.toLocaleString()}</div>
                                {activeTooltip === 'ncav' && (
                                    <div className="absolute -top-14 left-0 z-[110] w-full p-2.5 bg-zinc-800/95 text-white text-[10px] rounded-md border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 backdrop-blur-sm">
                                        <span className="text-blue-300 font-black tracking-widest">[ASSET VALUE]</span>
                                        <p className="mt-1 text-zinc-300">청산가치 대비 시가총액 비율입니다. 100% 이상일 경우 기업을 통째로 사고도 현금이 남는 마법의 안전마진을 의미합니다.</p>
                                    </div>
                                )}
                            </div>

                            <div
                                className="relative flex items-center justify-between group/skill cursor-help p-1 hover:bg-white/40 rounded-lg transition-colors"
                                onMouseEnter={() => setActiveTooltip('srim')}
                                onMouseLeave={() => setActiveTooltip(null)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-1.5">
                                        <div className={`w-6 h-6 rounded-full ${theme.bg} border border-white/50 flex items-center justify-center text-[10px] text-white shadow-sm`}>{theme.icon}</div>
                                        <div className={`w-6 h-6 rounded-full ${theme.bg} border border-white/50 flex items-center justify-center text-[10px] text-white shadow-sm`}>{theme.icon}</div>
                                    </div>
                                    <span className="font-black text-[14px] text-zinc-900 tracking-tight">S-RIM</span>
                                </div>
                                <div className="font-black text-[9px] text-zinc-900">{stock.srimScore || "N/A"}</div>
                                {activeTooltip === 'srim' && (
                                    <div className="absolute -top-14 left-0 z-[110] w-full p-2.5 bg-zinc-800/95 text-white text-[10px] rounded-md border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 backdrop-blur-sm">
                                        <span className="text-red-300 font-black tracking-widest">[PROFIT VALUE]</span>
                                        <p className="mt-1 text-zinc-300">초과이익 모델 기반 적정주가입니다. 기업이 자본을 활용해 기대치 이상의 수익을 얼마나 내는지를 가치로 환산합니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* [STATS] */}
                        <div className="px-4 pb-3 mt-auto z-[20]">
                            <div className="flex justify-between text-[7px] font-black text-zinc-500 border-t-2 border-zinc-300 pt-1.5 uppercase relative">
                                <div
                                    className="flex flex-col cursor-help group/weakness"
                                    onMouseEnter={() => setActiveTooltip('weakness')}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                >
                                    <span>Weakness</span>
                                    <span className={`${analysis.debtColor} font-bold mt-0.5 italic text-[9px]`}>
                                        부채 {analysis.debtRatio}% 🔥
                                    </span>
                                    {activeTooltip === 'weakness' && (
                                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-zinc-900/95 text-white text-[10px] rounded-md shadow-2xl z-[110] leading-snug border border-white/10 animate-in fade-in slide-in-from-bottom-1 backdrop-blur-sm">
                                            <p className="text-orange-400 font-black mb-1 italic">DEBT RISK</p>
                                            자본 대비 부채 비중입니다. 100% 미만을 권장하며, 수치가 높을수록 재무적 타격을 입기 쉽습니다.
                                        </div>
                                    )}
                                </div>

                                <div
                                    className="flex flex-col items-center cursor-help group/resistance"
                                    onMouseEnter={() => setActiveTooltip('resistance')}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                >
                                    <span>Resistance</span>
                                    <span className="text-zinc-900 font-bold mt-0.5 italic text-[9px]">
                                        저항 -{analysis.dropRate}% ⚙️
                                    </span>
                                    {activeTooltip === 'resistance' && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-zinc-900/95 text-white text-[10px] rounded-md shadow-2xl z-[110] leading-snug border border-white/10 animate-in fade-in slide-in-from-bottom-1 text-center backdrop-blur-sm">
                                            <p className="text-yellow-400 font-black mb-1 italic">CEILING</p>
                                            전고점 대비 하락폭입니다. 수치가 클수록 위에 쌓인 매물대 저항이 강할 수 있음을 뜻합니다.
                                        </div>
                                    )}
                                </div>

                                <div
                                    className="flex flex-col items-end cursor-help group/retreat"
                                    onMouseEnter={() => setActiveTooltip('retreat')}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                >
                                    <span>Retreat</span>
                                    <div className="flex items-center gap-1 mt-0.5 text-right">
                                        <span className="text-zinc-900 font-bold italic text-[9px] leading-none">{analysis.retreatMargin}%</span>
                                        <div className="w-2.5 h-4 border border-zinc-400 rounded-[2px] p-[1px] relative overflow-hidden flex flex-col justify-end bg-zinc-100 shadow-inner">
                                            <div
                                                className={`w-full transition-all duration-1000 ${analysis.supportStrength > 70 ? 'bg-green-500' : analysis.supportStrength > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ height: `${analysis.supportStrength}%` }}
                                            />
                                        </div>
                                    </div>
                                    {activeTooltip === 'retreat' && (
                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-zinc-900/95 text-white text-[10px] rounded-md shadow-2xl z-[110] leading-snug border border-white/10 animate-in fade-in slide-in-from-bottom-1 text-right backdrop-blur-sm">
                                            <p className="text-green-400 font-black mb-1 italic">FLOOR</p>
                                            최저가 대비 현재 높이입니다. 이 수치가 낮을수록 역사적 바닥에 근접하여 추가 하락 위험이 적습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`mt-2 border-[1px] ${theme.border} p-1.5 text-[9px] font-medium leading-tight text-zinc-600 italic bg-white/60 rounded-sm`}>
                                {theme.desc}
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[7px] font-black text-zinc-400 italic tracking-tighter uppercase">illus. IDIOTQUANT</span>

                                {/* 우하단 이중 등급 표시 */}
                                <div className="flex gap-1.5">
                                    {/* NCAV 등급 배지 */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[6px] font-bold text-zinc-400 uppercase">NCAV</span>
                                        <div className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded-[1px] shadow-sm" style={{ backgroundColor: ncavGrade.color }}>
                                            <span className="text-[8px] font-black text-white/70">{ncavGrade.rarity}</span>
                                            <span className="text-[9px] font-black text-white">{ncavGrade.label[0]}</span>
                                        </div>
                                    </div>
                                    {/* S-RIM 등급 배지 */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[6px] font-bold text-zinc-400 uppercase">S-RIM</span>
                                        <div className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded-[1px] shadow-sm" style={{ backgroundColor: srimGrade.color }}>
                                            <span className="text-[8px] font-black text-white/70">{srimGrade.rarity}</span>
                                            <span className="text-[9px] font-black text-white">{srimGrade.label[0]}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};