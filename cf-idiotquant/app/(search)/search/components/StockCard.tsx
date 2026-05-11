"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
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
    SSS: { frame: "from-pink-300 via-purple-300 to-cyan-300 animate-gradient-x", label: "울트라", rarity: "★★★", color: "#f472b6" },
    SS: { frame: "from-yellow-200 via-amber-400 to-yellow-200", label: "시크릿", rarity: "★★", color: "#fbbf24" },
    S: { frame: "from-amber-200 via-yellow-300 to-amber-500", label: "슈퍼", rarity: "★", color: "#f59e0b" },
    A: { frame: "from-zinc-100 via-slate-200 to-zinc-300", label: "언커먼", rarity: "◆", color: "#94a3b8" },
    DEFAULT: { frame: "from-zinc-200 via-zinc-300 to-zinc-400", label: "커먼", rarity: "●", color: "#71717a" }
};

const getGradeByScore = (score: number) => {
    const s = Number(score) || 0;
    if (s >= 150) return GRADE_THEMES.SSS;
    if (s >= 120) return GRADE_THEMES.SS;
    if (s >= 100) return GRADE_THEMES.S;
    if (s >= 70) return GRADE_THEMES.A;
    return GRADE_THEMES.DEFAULT;
};

export const StockCard = ({ stock, rawData }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [imageStatus, setImageStatus] = useState({ loaded: false, error: false });
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // [Safety] stock 객체가 없을 경우 대비
    if (!stock) return null;

    const theme = useMemo(() => {
        const s = (stock?.sector || "").toUpperCase();
        if (s.includes("자동차") || s.includes("기계") || s.includes("부품") || s.includes("운수장비")) return SECTOR_THEMES.IRON;
        if (s.includes("반도체") || s.includes("전자") || s.includes("전기") || s.includes("전자제품") || s.includes("IT장비")) return SECTOR_THEMES.CHIP;
        if (s.includes("서비스") || s.includes("소프트웨어") || s.includes("인터넷") || s.includes("게임")) return SECTOR_THEMES.NET;
        if (s.includes("제약") || s.includes("바이오") || s.includes("의료") || s.includes("생명공학")) return SECTOR_THEMES.BIO;
        if (s.includes("화학") || s.includes("에너지") || s.includes("전기차") || s.includes("배터리")) return SECTOR_THEMES.FUEL;
        if (s.includes("금융") || s.includes("은행") || s.includes("증권") || s.includes("보험")) return SECTOR_THEMES.FLOW;
        if (s.includes("건설") || s.includes("방산") || s.includes("철강") || s.includes("중공업") || s.includes("종이") || s.includes("목재")) return SECTOR_THEMES.BASE;
        if (s.includes("미디어") || s.includes("엔터") || s.includes("문화") || s.includes("화장품")) return SECTOR_THEMES.STAR;
        return SECTOR_THEMES.LIFE;
    }, [stock?.sector]);

    const gradeTheme = GRADE_THEMES[stock?.grade?.grade] || GRADE_THEMES.DEFAULT;

    const analysis = useMemo(() => {
        let debtRatio = 0;
        let highPrice = 0;
        let lowPrice = 0;
        let currentPrice = 0;

        try {
            if (stock?.isUs) {
                const info = rawData?.usSearchInfo?.output;
                const detail = rawData?.usDetail?.output;
                const dailyHistory = rawData?.usDaily?.output2 || [];

                // --- 유연한 부채비율 계산 (Finnhub BS 리포트) ---
                const finnhubReport = rawData?.finnhubData?.data?.[0]?.report?.bs || [];

                if (finnhubReport.length > 0) {
                    const totalLiabilities = finnhubReport.find((item: any) =>
                        item?.concept === "us-gaap_Liabilities" ||
                        item?.concept === "Liabilities" ||
                        item?.concept?.endsWith("_Liabilities")
                    )?.value || 0;

                    const totalEquity = finnhubReport.find((item: any) =>
                        item?.concept === "us-gaap_StockholdersEquity" ||
                        item?.concept === "StockholdersEquity" ||
                        item?.concept?.endsWith("_StockholdersEquity")
                    )?.value || 1;

                    debtRatio = (totalLiabilities / totalEquity) * 100;
                } else {
                    debtRatio = parseFloat(stock?.debtRatio || "0");
                }

                currentPrice = parseFloat(detail?.last || info?.ovrs_now_pric1 || stock?.curPrice || "0");

                if (dailyHistory.length > 0) {
                    // [Safety] 값이 숫자가 아닐 경우 대비
                    const highs = dailyHistory.map((d: any) => parseFloat(d?.high || "0"));
                    const lows = dailyHistory.map((d: any) => parseFloat(d?.low || "0"));
                    highPrice = Math.max(...highs, 0);
                    lowPrice = Math.min(...lows, currentPrice);
                } else {
                    highPrice = parseFloat(info?.h52p || "0");
                    lowPrice = parseFloat(info?.l52p || "0");
                }
            } else {
                // [국내장] 로직 - output이 배열인지 확인 필수
                const latestBS = rawData?.kiBS?.output?.[0] || rawData?.kiBS?.output; 
                const totalLblt = parseFloat(latestBS?.total_lblt || "0");
                const totalCptl = parseFloat(latestBS?.total_cptl || "1");
                debtRatio = (totalLblt / totalCptl) * 100;

                const priceInfo = rawData?.kiPrice?.output;
                highPrice = parseFloat(priceInfo?.d250_hgpr || "0");
                lowPrice = parseFloat(priceInfo?.d250_lwpr || "0");
                currentPrice = parseFloat(priceInfo?.stck_prpr || "0");
            }
        } catch (e) {
            console.error("Analysis calculation error:", e);
        }

        // [Safety] 나눗셈 0 방지 및 유효값 체크
        const safeHigh = highPrice || currentPrice || 1;
        const safeCurrent = currentPrice || 1;

        const debtColor = debtRatio > 200 ? "text-red-600" : debtRatio > 100 ? "text-orange-500" : "text-blue-600";
        const dropRate = ((safeHigh - currentPrice) / safeHigh) * 100;
        const gapToHigh = ((safeHigh / safeCurrent) - 1) * 100;
        const retreatMargin = lowPrice > 0 ? ((currentPrice - lowPrice) / safeCurrent) * 100 : 0;
        const supportStrength = Math.max(0, 100 - retreatMargin);

        return {
            debtRatio: (debtRatio || 0).toFixed(1),
            debtColor,
            dropRate: (dropRate || 0).toFixed(1),
            gapToHigh: (gapToHigh || 0).toFixed(1),
            highPrice: (highPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 0 }),
            lowPrice: (lowPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 0 }),
            retreatMargin: (retreatMargin || 0).toFixed(1),
            supportStrength,
        };
    }, [rawData, stock?.isUs, stock?.curPrice, stock?.debtRatio]);

    const ncavGrade = useMemo(() => getGradeByScore(Number(stock?.ncavScore || 0)), [stock?.ncavScore]);
    const srimGrade = useMemo(() => getGradeByScore(Number(stock?.srimScore || 0)), [stock?.srimScore]);
    
    const borderStyle = useMemo(() => ({
        background: `conic-gradient(from 0deg, ${ncavGrade.color}, ${srimGrade.color}, ${ncavGrade.color})`,
    }), [ncavGrade.color, srimGrade.color]);

    useEffect(() => {
        setImageStatus({ loaded: false, error: false });
    }, [stock?.ticker]);

    const logoUrl = useMemo(() => {
        if (!stock?.ticker) return null;
        if (stock.isUs) {
            return `https://img.logo.dev/ticker/${stock.ticker.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=512`;
        }
        const krBaseUrl = process.env.NEXT_PUBLIC_KR_LOGO_API;
        return krBaseUrl ? `${krBaseUrl}/${stock.ticker}?size=300` : null;
    }, [stock?.ticker, stock?.isUs]);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;
        let frameId: number;
        const handleMove = (e: MouseEvent) => {
            frameId = requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const xRel = (e.clientX - rect.left) / rect.width - 0.5;
                const yRel = (e.clientY - rect.top) / rect.height - 0.5;
                setRotation({ x: -(yRel * 15), y: xRel * 15 });
                setGlare({ x: (xRel + 0.5) * 100, y: (yRel + 0.5) * 100, opacity: 0.2 });
            });
        };
        const handleLeave = () => {
            cancelAnimationFrame(frameId);
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
                                <h3 className="text-zinc-900 font-black text-xl tracking-tighter drop-shadow-sm">{stock?.name || "Unknown"}</h3>
                            </div>
                            <div className="flex items-center gap-1 text-right">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-red-600 tracking-tighter uppercase">PRICE</span>
                                    <span className="text-xl font-black tracking-tighter text-zinc-900">
                                        {stock?.isUs ? "$" : "₩"}{stock?.curPrice || 0}
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

                        {/* [IMAGE] */}
                        <div className="mx-2.5 mt-1.5 relative h-48 border-[5px] border-[#c9c9c9] shadow-inner bg-white overflow-hidden rounded-[2px] z-[10] group/logo"
                            style={{ perspective: '1000px' }}
                        >
                            <div
                                className={`relative w-full h-full transition-all duration-500 transform-gpu cursor-pointer ${activeTooltip === 'showMetrics' ? '[transform:rotateY(180deg)]' : ''}`}
                                style={{ transformStyle: 'preserve-3d' }}
                                onClick={() => setActiveTooltip(activeTooltip === 'showMetrics' ? null : 'showMetrics')}
                            >
                                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                                    {logoUrl && !imageStatus.error ? (
                                        <Image
                                            src={logoUrl}
                                            alt={stock?.name || "logo"}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            className={`transition-all duration-700 ${imageStatus.loaded ? 'opacity-100' : 'opacity-0'}`}
                                            onLoad={() => setImageStatus(prev => ({ ...prev, loaded: true }))}
                                            onError={() => setImageStatus({ loaded: true, error: true })}
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full bg-zinc-50">
                                            <span className="text-6xl grayscale opacity-10">{theme.icon}</span>
                                        </div>
                                    )}
                                    <div className={`absolute bottom-0 w-full ${theme.bg} py-0 text-center border-t border-black/20 opacity-80`}>
                                        <p className="text-[8px] font-black text-white tracking-[0.2em] uppercase">CLICK TO VIEW METRICS</p>
                                    </div>
                                </div>

                                <div className={`absolute inset-0 w-full h-full ${theme.lightBg} [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center p-4 border-2 ${theme.border}`}>
                                    <div className="flex flex-col w-full space-y-3">
                                        <div className="flex justify-between items-end border-b border-zinc-200 pb-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase">PBR</span>
                                            <span className="text-3xl font-black tracking-tighter text-zinc-900">{stock?.pbr || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-zinc-200 pb-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase">PER</span>
                                            <span className="text-3xl font-black tracking-tighter text-zinc-900">{stock?.per || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-zinc-200 pb-1">
                                            <span className="text-[10px] font-black text-zinc-400 uppercase">EPS</span>
                                            <span className="text-2xl font-black tracking-tighter text-zinc-900">{stock?.eps || 0}</span>
                                        </div>
                                    </div>
                                </div>
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
                                <div className="font-black text-[9px] text-zinc-900">({stock?.ncavScore || 0}%) 적정주가:{stock?.fairValue?.toLocaleString() || 0}</div>
                            </div>

                            <div
                                className="relative flex items-center justify-between group/skill cursor-help p-1 hover:bg-white/40 rounded-lg transition-colors"
                                onMouseEnter={() => setActiveTooltip('srim')}
                                onMouseLeave={() => setActiveTooltip(null)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full ${theme.bg} border border-white/50 flex items-center justify-center text-[10px] text-white shadow-sm`}>{theme.icon}</div>
                                    <span className="font-black text-[14px] text-zinc-900 tracking-tight">S-RIM</span>
                                </div>
                                <div className="font-black text-[9px] text-zinc-900">{stock?.srimScore || "N/A"}</div>
                            </div>
                        </div>

                        {/* [STATS] */}
                        <div className="px-4 pb-3 mt-auto z-[20]">
                            <div className="flex justify-between text-[7px] font-black text-zinc-500 border-t-2 border-zinc-300 pt-1.5 uppercase relative">
                                <div className="flex flex-col">
                                    <span>Weakness</span>
                                    <span className={`${analysis.debtColor} font-bold mt-0.5 italic text-[9px]`}>부채 {analysis.debtRatio}% 🔥</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span>Resistance</span>
                                    <span className="text-zinc-900 font-bold mt-0.5 italic text-[9px]">저항 -{analysis.dropRate}% ⚙️</span>
                                </div>
                                <div className="flex flex-col items-end">
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
                                </div>
                            </div>

                            <div className={`mt-2 border-[1px] ${theme.border} p-1.5 text-[9px] font-medium leading-tight text-zinc-600 italic bg-white/60 rounded-sm`}>
                                {theme.desc}
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[7px] font-black text-zinc-400 italic tracking-tighter uppercase">illus. IDIOTQUANT</span>
                                <div className="flex gap-1.5">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[6px] font-bold text-zinc-400 uppercase">NCAV</span>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[1px] shadow-sm" style={{ backgroundColor: ncavGrade.color }}>
                                            <span className="text-[8px] font-black text-white/70">{ncavGrade.rarity}</span>
                                            <span className="text-[9px] font-black text-white">{ncavGrade.label[0]}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[6px] font-bold text-zinc-400 uppercase">S-RIM</span>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[1px] shadow-sm" style={{ backgroundColor: srimGrade.color }}>
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