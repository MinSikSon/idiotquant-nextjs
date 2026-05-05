"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';

/**
 * 섹터 테마 및 등급 설정
 */
const SECTOR_THEMES: Record<string, { bg: string; border: string; icon: string; label: string; text: string; lightBg: string; desc: string }> = {
    MOTOR: { bg: "bg-slate-500", border: "border-slate-400", icon: "🏎️", label: "강철/모터", text: "text-slate-900", lightBg: "bg-slate-50", desc: "강력한 엔진과 정밀한 부품으로 무장한 섹터입니다." },
    TECHNOLOGY: { bg: "bg-yellow-400", border: "border-yellow-300", icon: "⚡", label: "번개/IT", text: "text-yellow-900", lightBg: "bg-yellow-50", desc: "혁신적인 기술 진보가 에너지가 되는 섹터입니다." },
    FINANCIAL: { bg: "bg-blue-500", border: "border-blue-400", icon: "💎", label: "에너지/금융", text: "text-blue-900", lightBg: "bg-blue-50", desc: "자본의 흐름을 주도하는 금융 섹터입니다." },
    HEALTHCARE: { bg: "bg-green-500", border: "border-green-400", icon: "🌿", label: "풀/바이오", text: "text-green-900", lightBg: "bg-green-50", desc: "생명과 건강을 다루는 바이오 섹터입니다." },
    ENERGY: { bg: "bg-red-500", border: "border-red-400", icon: "🔥", label: "불꽃/에너지", text: "text-red-900", lightBg: "bg-red-50", desc: "강력한 화력을 지닌 에너지 섹터입니다." },
    DEFAULT: { bg: "bg-sky-400", border: "border-sky-300", icon: "💧", label: "물/기본", text: "text-sky-900", lightBg: "bg-sky-50", desc: "유연한 흐름을 가진 일반 섹터입니다." }
};

const GRADE_THEMES: Record<string, { frame: string; label: string; rarity: string }> = {
    SSS: { frame: "from-pink-300 via-purple-300 to-cyan-300 animate-gradient-x", label: "울트라 레어", rarity: "★★★" },
    SS: { frame: "from-yellow-200 via-amber-400 to-yellow-200", label: "시크릿 레어", rarity: "★★" },
    S: { frame: "from-amber-200 via-yellow-300 to-amber-500", label: "슈퍼 레어", rarity: "★" },
    A: { frame: "from-zinc-100 via-slate-200 to-zinc-300", label: "언커먼", rarity: "◆" },
    DEFAULT: { frame: "from-zinc-200 via-zinc-300 to-zinc-400", label: "커먼", rarity: "●" }
};

export const StockCard = ({ stock }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [imageStatus, setImageStatus] = useState({ loaded: false, error: false });
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // 이미지 초기화
    useEffect(() => {
        setImageStatus({ loaded: false, error: false });
    }, [stock.ticker]);

    const theme = useMemo(() => {
        const s = (stock.sector || "").toUpperCase();
        if (s.includes("자동차") || s.includes("MOTOR") || s.includes("부품")) return SECTOR_THEMES.MOTOR;
        if (s.includes("기술") || s.includes("IT") || s.includes("반도체")) return SECTOR_THEMES.TECHNOLOGY;
        if (s.includes("금융") || s.includes("은행") || s.includes("증권")) return SECTOR_THEMES.FINANCIAL;
        if (s.includes("의료") || s.includes("바이오") || s.includes("헬스")) return SECTOR_THEMES.HEALTHCARE;
        if (s.includes("에너지") || s.includes("화학") || s.includes("배터리")) return SECTOR_THEMES.ENERGY;
        return SECTOR_THEMES.DEFAULT;
    }, [stock.sector]);

    const gradeTheme = GRADE_THEMES[stock.grade?.grade] || GRADE_THEMES.DEFAULT;

    const logoUrl = useMemo(() => {
        if (!stock.ticker) return null;
        const baseUrl = stock.isUs
            ? `https://img.logo.dev/ticker/${stock.ticker.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}`
            : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}?size=300`;
        return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}v=${new Date().getTime()}`;
    }, [stock.ticker, stock.isUs]);

    // 3D 효과 핸들러
    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;
        const handleMove = (e: MouseEvent) => {
            const { left, top, width, height } = card.getBoundingClientRect();
            setRotation({ x: (height / 2 - (e.clientY - top)) / 10, y: ((e.clientX - left) - width / 2) / 10 });
            setGlare({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100, opacity: 0.7 });
        };
        const handleLeave = () => { setRotation({ x: 0, y: 0 }); setGlare(prev => ({ ...prev, opacity: 0 })); };
        card.addEventListener('mousemove', handleMove);
        card.addEventListener('mouseleave', handleLeave);
        return () => { card.removeEventListener('mousemove', handleMove); card.removeEventListener('mouseleave', handleLeave); };
    }, []);

    return (
        <div
            ref={cardRef}
            className="group/card relative w-[22.5rem] h-[31.5rem] transition-transform duration-200 ease-out select-none cursor-pointer"
            style={{ perspective: '1200px', transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
        >
            <div className={`w-full h-full p-[14px] rounded-[1.4rem] bg-[#f8d050] shadow-2xl relative overflow-hidden flex flex-col border-[2px] border-black/10`}>

                <div
                    className="absolute inset-0 z-30 pointer-events-none mix-blend-color-dodge opacity-0 group-hover/card:opacity-100"
                    style={{ background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.9) 0%, rgba(100,100,255,0.2) 40%, rgba(0,0,0,0) 70%)` }}
                />

                <div className={`relative w-full h-full rounded-[0.6rem] bg-gradient-to-br ${gradeTheme.frame} p-[3px] shadow-inner`}>
                    <div className={`w-full h-full ${theme.lightBg} rounded-[0.5rem] flex flex-col overflow-hidden relative`}>

                        {/* 헤더: HP 대신 Price 표시 */}
                        <div className="flex justify-between items-end px-3 py-1.5 bg-white/30 border-b border-black/5">
                            <div className="flex flex-col">
                                <span className="text-[7px] font-bold text-zinc-500 italic uppercase tracking-widest">IdiotQuant v2.5</span>
                                <h3 className="text-zinc-900 font-black text-xl tracking-tighter drop-shadow-sm">{stock.name}</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-red-600">Current Price:{stock.isUs ? "$" : "₩"}{stock.curPrice}</span>
                                    <span className="text-xl font-black tracking-tighter text-zinc-900">
                                        {stock.isUs ? "" : ""}{stock.fairValue?.toLocaleString()}
                                    </span>
                                </div>
                                {/* 우상단 속성 아이콘 + 툴팁 */}
                                <div
                                    className={`relative w-8 h-8 rounded-full ${theme.bg} flex items-center justify-center shadow-md border-2 border-white/90 ml-1`}
                                    onMouseEnter={() => setActiveTooltip('sector')}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                >
                                    <span className="text-lg drop-shadow-md">{theme.icon}</span>
                                    {activeTooltip === 'sector' && (
                                        <div className="absolute top-10 right-0 z-50 w-48 p-2 bg-zinc-900 text-white text-[10px] rounded-md shadow-xl border border-white/20">
                                            <p className="font-bold text-yellow-400 mb-1">{theme.label} 속성</p>
                                            {theme.desc}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 로고 영역 */}
                        <div className="mx-2.5 mt-1.5 relative h-40 border-[5px] border-[#c9c9c9] shadow-inner bg-white overflow-hidden rounded-[2px]">
                            {logoUrl && (
                                <img
                                    key={stock.ticker}
                                    src={logoUrl}
                                    alt={stock.name}
                                    onLoad={() => setImageStatus({ loaded: true, error: false })}
                                    onError={() => setImageStatus({ loaded: true, error: true })}
                                    className={`w-full h-full object-contain p-8 group-hover/card:scale-110 transition-all duration-700 ${imageStatus.loaded && !imageStatus.error ? 'opacity-100' : 'opacity-0'}`}
                                />
                            )}
                            {(!imageStatus.loaded || imageStatus.error) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-50">
                                    <span className="text-6xl grayscale opacity-10">{theme.icon}</span>
                                    <span className="absolute text-2xl font-black text-zinc-300">{stock.ticker}</span>
                                </div>
                            )}
                            <div className={`absolute bottom-0 w-full ${theme.bg} py-1 text-center border-t border-black/20 z-10`}>
                                <p className="text-[8px] font-black text-white tracking-[0.2em] uppercase">
                                    PBR: {stock.pbr} | PER: {stock.per} | EPS: {stock.eps}
                                </p>
                            </div>
                        </div>

                        {/* 기술 영역: NCAV 및 S-RIM 점수 */}
                        <div className="flex-1 px-4 py-3 flex flex-col justify-center space-y-3">

                            {/* NCAV 기술 */}
                            <div
                                className="relative flex items-center justify-between group/skill"
                                onMouseEnter={() => setActiveTooltip('ncav')}
                                onMouseLeave={() => setActiveTooltip(null)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full ${theme.bg} flex items-center justify-center text-[10px] text-white shadow-sm`}>{theme.icon}</div>
                                    <span className="font-black text-[14px] text-zinc-900 tracking-tight">NCAV</span>
                                </div>
                                <div className="font-black text-lg text-zinc-900">{stock.ncavScore || 0}%</div>

                                {activeTooltip === 'ncav' && (
                                    <div className="absolute -top-16 left-0 z-50 w-full p-2 bg-zinc-800 text-white text-[9px] rounded-md border border-white/10">
                                        <span className="text-blue-300 font-bold">[자산가치 점수]</span> 청산가치(유동자산-총부채) 대비 현재 시가총액이 얼마나 저평가되었는지 나타내는 기술입니다.
                                    </div>
                                )}
                            </div>

                            {/* S-RIM 기술 */}
                            <div
                                className="relative flex items-center justify-between group/skill"
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
                                <div className="font-black text-[9px] text-zinc-900">{stock.srimScore || 0}</div>

                                {activeTooltip === 'srim' && (
                                    <div className="absolute -top-16 left-0 z-50 w-full p-2 bg-zinc-800 text-white text-[9px] rounded-md border border-white/10">
                                        <span className="text-red-300 font-bold">[수익가치 점수]</span> 기업의 자기자본과 기대수익률을 바탕으로 도출한 내재가치 대비 현재 가격의 매력도를 측정하는 기술입니다.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 하단 상세 */}
                        <div className="px-4 pb-3 mt-auto">
                            <div className="flex justify-between text-[7px] font-black text-zinc-500 border-t-2 border-zinc-300 pt-1.5 uppercase">
                                <div className="flex flex-col">
                                    <span>Weakness</span>
                                    <span className="text-zinc-900 font-bold mt-0.5 italic text-[9px]">부채비율 🔥</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span>Resistance</span>
                                    <span className="text-zinc-900 font-bold mt-0.5 italic text-[9px]">직전고점 ⚙️</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span>Retreat</span>
                                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 mt-1 shadow-inner" />
                                </div>
                            </div>

                            <div className={`mt-2 border-[1px] ${theme.border} p-1.5 text-[9px] font-medium leading-tight text-zinc-600 italic bg-white/60 rounded-sm`}>
                                {theme.desc}
                            </div>

                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[7px] font-black text-zinc-400 italic">illus. IDIOTQUANT</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-zinc-800">{gradeTheme.rarity}</span>
                                    <span className="text-[9px] font-black text-white bg-zinc-900 px-1.5 py-0.5 rounded-[1px]">{stock.grade?.grade || "F"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};