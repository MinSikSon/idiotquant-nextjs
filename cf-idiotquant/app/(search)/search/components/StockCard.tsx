"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';

const SECTOR_THEMES: Record<string, { bg: string; border: string; icon: string; weaknessIcon: string; label: string; text: string; lightBg: string; outerBorder: string; desc: string }> = {
    MOTOR: {
        bg: "bg-slate-600", border: "border-slate-700", outerBorder: "border-slate-500",
        icon: "🏎️", weaknessIcon: "⚡", label: "자동차", text: "text-slate-900",
        lightBg: "bg-slate-300", desc: "운수장비 및 자동차 부품 섹터. 높은 기술력과 글로벌 수요를 바탕으로 움직입니다."
    },
    TECHNOLOGY: {
        bg: "bg-yellow-600", border: "border-yellow-700", outerBorder: "border-yellow-500",
        icon: "⚡", weaknessIcon: "✊", label: "기술/IT", text: "text-yellow-900",
        lightBg: "bg-yellow-300", desc: "IT, 반도체 및 전자 기기 섹터. 혁신적인 기술 진보가 핵심 동력입니다."
    },
    FINANCIAL: {
        bg: "bg-blue-600", border: "border-blue-700", outerBorder: "border-blue-500",
        icon: "💎", weaknessIcon: "🔥", label: "금융", text: "text-blue-950",
        lightBg: "bg-blue-300", desc: "금리와 자산 건전성에 민감하게 반응하는 방어적 속성입니다."
    },
    HEALTHCARE: {
        bg: "bg-green-600", border: "border-green-700", outerBorder: "border-green-500",
        icon: "🌿", weaknessIcon: "👁️", label: "헬스케어", text: "text-green-900",
        lightBg: "bg-green-300", desc: "바이오 및 신약 개발과 고령화 사회의 수혜를 받는 성장 섹터입니다."
    },
    ENERGY: {
        bg: "bg-red-600", border: "border-red-700", outerBorder: "border-red-500",
        icon: "🔥", weaknessIcon: "💧", label: "에너지", text: "text-red-900",
        lightBg: "bg-red-300", desc: "에너지, 화학 및 배터리 섹터. 강력한 폭발력을 지닌 에너지원을 다루는 기업군입니다."
    },
    CONSUMER: {
        bg: "bg-zinc-600", border: "border-zinc-700", outerBorder: "border-zinc-500",
        icon: "🔘", weaknessIcon: "🏎️", label: "소비재", text: "text-zinc-900",
        lightBg: "bg-zinc-300", desc: "필수 소비재 및 유통 섹터. 경기 변동에도 꾸준한 수요를 보입니다."
    },
    COMMUNICATION: {
        bg: "bg-pink-600", border: "border-pink-700", outerBorder: "border-pink-500",
        icon: "👁️", weaknessIcon: "🌿", label: "서비스", text: "text-pink-900",
        lightBg: "bg-pink-300", desc: "통신 및 플랫폼 섹터. 네트워크 효과를 통해 시장을 연결합니다."
    },
    INFRA: {
        bg: "bg-orange-600", border: "border-orange-700", outerBorder: "border-orange-500",
        icon: "✊", weaknessIcon: "🔘", label: "산업재", text: "text-orange-950",
        lightBg: "bg-orange-300", desc: "건설, 철강 및 기간 산업 섹터. 국가의 기반을 닦는 기업군입니다."
    },
    DEFAULT: {
        bg: "bg-sky-600", border: "border-sky-700", outerBorder: "border-sky-500",
        icon: "💧", weaknessIcon: "💎", label: "기본", text: "text-sky-950",
        lightBg: "bg-sky-300", desc: "기타 산업 섹터. 시장 상황에 따라 유연하게 대응합니다."
    }
};

const GRADE_THEMES: Record<string, any> = {
    SSS: { frame: "from-pink-300 via-purple-300 to-cyan-300", label: "울트라 레어", rarity: "★★★", desc: "전설적인 기업 가치를 지닌 최상위 등급입니다.", holo: "opacity-40", foilOpacity: "group-hover/card:opacity-100" },
    SS: { frame: "from-yellow-200 via-yellow-500 to-yellow-200", label: "시크릿 레어", rarity: "★★", desc: "시장에서 매우 희귀하며 강력한 모멘텀을 보유합니다.", holo: "opacity-30", foilOpacity: "group-hover/card:opacity-80" },
    S: { frame: "from-amber-300 via-yellow-400 to-amber-500", label: "슈퍼 레어", rarity: "★", desc: "우수한 재무 건전성과 성장성을 입증한 우량주입니다.", holo: "opacity-20", foilOpacity: "group-hover/card:opacity-50" },
    A: { frame: "from-zinc-200 via-slate-300 to-zinc-400", label: "언커먼", rarity: "◆", desc: "평균 이상의 잠재력을 가진 견실한 종목입니다.", holo: "opacity-0", foilOpacity: "opacity-0" },
    B: { frame: "from-zinc-100 via-zinc-200 to-zinc-100", label: "커먼", rarity: "●", desc: "시장에서 흔히 볼 수 있는 일반적인 상태의 종목입니다.", holo: "opacity-0", foilOpacity: "opacity-0" },
    F: { frame: "from-zinc-400 via-zinc-500 to-zinc-600", label: "베이직", rarity: "", desc: "데이터가 부족하거나 분석이 진행 중인 기초 종목입니다.", holo: "opacity-0", foilOpacity: "opacity-0" },
};

export const StockCard = ({ stock }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isError, setIsError] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => { setIsError(false); }, [stock?.ticker]);

    const theme = useMemo(() => {
        const rawSector = stock?.sector;
        if (!rawSector) return SECTOR_THEMES.DEFAULT;
        const s = rawSector.toUpperCase();
        let key = "DEFAULT";
        if (s.includes("운수장비") || s.includes("자동차") || s.includes("AUTO") || s.includes("MOTOR") || s.includes("부품")) key = "MOTOR";
        else if (s.includes("전기") || s.includes("반도체") || s.includes("IT") || s.includes("전자")) key = "TECHNOLOGY";
        else if (s.includes("금융") || s.includes("은행") || s.includes("보험") || s.includes("증권")) key = "FINANCIAL";
        else if (s.includes("의약") || s.includes("바이오") || s.includes("제약") || s.includes("헬스")) key = "HEALTHCARE";
        else if (s.includes("화학") || s.includes("에너지") || s.includes("전지") || s.includes("배터리")) key = "ENERGY";
        else if (s.includes("유통") || s.includes("식품") || s.includes("생활") || s.includes("섬유")) key = "CONSUMER";
        else if (s.includes("통신") || s.includes("서비스") || s.includes("게임") || s.includes("SOFTWARE")) key = "COMMUNICATION";
        else if (s.includes("건설") || s.includes("철강") || s.includes("기계") || s.includes("금속")) key = "INFRA";
        return SECTOR_THEMES[key];
    }, [stock?.sector]);

    const grade = stock?.grade?.grade?.toUpperCase() || 'F';
    const gradeTheme = GRADE_THEMES[grade] || GRADE_THEMES['F'];

    const logoUrl = useMemo(() => {
        if (!stock?.ticker) return "";
        return stock.isUs
            ? `https://img.logo.dev/ticker/${stock.name.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true&size=400`
            : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}?size=400`;
    }, [stock?.name, stock?.ticker, stock?.isUs]);

    const foilStyle = useMemo(() => {
        if (glare.opacity === 0 || isPaused) return {};
        const angle = (glare.x + glare.y) * 2;
        return {
            background: `
                radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 60%),
                linear-gradient(${angle}deg, 
                    rgba(255, 0, 0, 0.3) 0%, 
                    rgba(255, 255, 0, 0.3) 20%, 
                    rgba(0, 255, 0, 0.3) 40%, 
                    rgba(0, 255, 255, 0.3) 60%, 
                    rgba(0, 0, 255, 0.3) 80%, 
                    rgba(255, 0, 255, 0.3) 100%)
            `,
            mixBlendMode: 'color-dodge' as const,
        };
    }, [glare, isPaused]);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (isPaused) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setRotation({ x: (rect.height / 2 - y) / 15, y: (x - rect.width / 2) / 15 });
            setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 1 });
        };
        const handleMouseLeave = () => {
            setRotation({ x: 0, y: 0 });
            setGlare(prev => ({ ...prev, opacity: 0 }));
        };
        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            card.removeEventListener('mousemove', handleMouseMove);
            card.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [isPaused]);

    const inverseTransformStyle = {
        transform: isPaused
            ? `rotateX(0deg) rotateY(0deg) translateZ(100px)`
            : `rotateX(${-rotation.x}deg) rotateY(${-rotation.y}deg) translateZ(100px)`,
        transition: 'transform 0.3s ease-out'
    };

    const tooltipBaseClass = "absolute bg-zinc-950/95 backdrop-blur-sm text-white text-[11px] rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-auto border border-white/30 p-3 leading-relaxed font-semibold min-w-[180px]";

    const pauseRotation = () => {
        setIsPaused(true);
        setRotation({ x: 0, y: 0 });
        setGlare(prev => ({ ...prev, opacity: 0 }));
    };
    const resumeRotation = () => setIsPaused(false);

    return (
        <div
            ref={cardRef}
            className="group/card relative w-[25rem] h-[34rem] transition-transform duration-300 ease-out select-none"
            style={{
                perspective: '1200px',
                transform: isPaused ? 'rotateX(0deg) rotateY(0deg)' : `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
            }}
        >
            <div className={`w-full h-full p-3 rounded-[1.2rem] bg-gradient-to-br ${gradeTheme.frame} shadow-2xl relative overflow-hidden flex flex-col border-[16px] border-black/10 transition-colors duration-500`}>

                <div className={`absolute inset-0 z-40 pointer-events-none transition-opacity duration-300 ${gradeTheme.foilOpacity}`} style={foilStyle} />

                <div className={`absolute inset-0 z-10 pointer-events-none mix-blend-overlay opacity-30 ${gradeTheme.holo}`}
                    style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}
                />

                <div className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-300 mix-blend-overlay opacity-0 group-hover/card:opacity-100"
                    style={{ background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%)` }}
                />

                <div className={`relative w-full h-full ${theme.lightBg} rounded-none flex flex-col border-[9px] ${theme.outerBorder} overflow-hidden shadow-inner z-20`}>

                    <div className="flex justify-between items-center px-2 py-1 bg-white/40 relative z-10">
                        <div className="flex flex-col text-left">
                            <h3 className="text-zinc-950 font-black text-xl tracking-tighter leading-none">{stock.name}</h3>
                        </div>
                        <div className="relative group" onMouseEnter={pauseRotation} onMouseLeave={resumeRotation}>
                            <div className={`w-8 h-8 rounded-full ${theme.bg} flex items-center justify-center shadow-md border-2 border-white/80 cursor-help transition-transform hover:scale-110`}>
                                <span className="text-base drop-shadow-md">{theme.icon}</span>
                            </div>
                            <div className={`${tooltipBaseClass} top-full right-0 mt-2`} style={inverseTransformStyle}>
                                <div className="font-bold text-yellow-400 mb-1 border-b border-white/10 pb-1">{theme.label} 섹터</div>
                                <span className="text-zinc-100">{theme.desc}</span>
                            </div>
                        </div>
                    </div>

                    <div className={`mx-4 mt-1 relative aspect-[3/2] flex-shrink-0 border-[6px] ${theme.outerBorder} shadow-lg bg-white overflow-hidden rounded-sm flex items-center justify-center`}>
                        {logoUrl && !isError ? (
                            <img src={logoUrl} alt={stock.name} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" onError={() => setIsError(true)} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-5xl font-black text-zinc-200 uppercase">{stock.name?.[0]}</div>
                        )}
                    </div>

                    <div className={`mt-2 mx-4 ${theme.bg} p-2 text-[10px] tracking-widest font-medium leading-relaxed italic rounded-md shadow-sm`}>
                        <p className="text-[8px] font-black text-white tracking-widest uppercase shadow-sm text-center">
                            티커. {stock.ticker} _ 섹터: {theme.label}
                        </p>
                    </div>

                    <div className="px-5 py-3 mt-auto flex flex-col justify-center space-y-1 bg-white/30">
                        {/* ⭐ 기업 내재 가치 툴팁 추가 */}
                        <div className="relative group flex items-center justify-between border-zinc-400/50 pb-0 cursor-help" onMouseEnter={pauseRotation} onMouseLeave={resumeRotation}>
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full ${theme.bg} flex items-center justify-center text-xs text-white shadow-sm`}>{theme.icon}</div>
                                <span className="font-black text-[12px] text-zinc-900 underline decoration-dotted decoration-zinc-400">기업 내재 가치</span>
                            </div>
                            <div className="font-black text-[14px] text-zinc-950 tracking-tighter">{stock.fairValue?.toLocaleString()}</div>
                            <div className={`${tooltipBaseClass} bottom-full left-0 mb-2 w-64`} style={inverseTransformStyle}>
                                <div className="font-bold text-sky-400 mb-1 border-b border-white/10 pb-1 italic">NCAV Valuation</div>
                                <span className="text-zinc-100">벤자민 그레이엄의 청산가치 기반 평가액입니다.</span>
                            </div>
                        </div>

                        {/* ⭐ 종합 퀀트 점수 툴팁 추가 */}
                        <div className="relative group flex items-center justify-between pb-0 cursor-help" onMouseEnter={pauseRotation} onMouseLeave={resumeRotation}>
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                    <div className={`w-6 h-6 rounded-full ${theme.bg} flex items-center justify-center text-xs text-white border border-white/50 shadow-sm`}>{theme.icon}</div>
                                    <div className={`w-6 h-6 rounded-full ${theme.bg} flex items-center justify-center text-xs text-white border border-white/50 shadow-sm`}>{theme.icon}</div>
                                </div>
                                <span className="font-black text-[12px] text-zinc-900 tracking-tight underline decoration-dotted decoration-zinc-400">종합 퀀트 점수</span>
                            </div>
                            <div className="font-black text-[14px] text-zinc-950 tracking-tighter">{stock.undervaluedScore || "95"} 점</div>
                            <div className={`${tooltipBaseClass} bottom-full left-0 mb-2 w-64`} style={inverseTransformStyle}>
                                <div className="font-bold text-emerald-400 mb-1 border-b border-white/10 pb-1 italic">Total Quant Score</div>
                                <span className="text-zinc-100">알고리즘이 분석한 종목의 종합 투자 매력도 점수입니다.</span>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 pb-3 mt-auto bg-white/20">
                        <div className="flex justify-between text-[9px] font-black text-zinc-600 border-t-2 border-zinc-400 pt-2 uppercase tracking-tighter">
                            <div className="flex flex-col text-left">
                                <span>약점 (Weakness)</span>
                                <span className="text-zinc-900 font-bold mt-0.5 italic">{theme.weaknessIcon} ×2</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span>PER ({stock.per})</span>
                                <div className="flex gap-1 mt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 shadow-inner" />
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span>PBR ({stock.pbr})</span>
                                <div className="flex gap-1 mt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 shadow-inner" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-400 shadow-inner" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-2 relative">
                            <span className="text-[8px] font-black text-zinc-500 italic uppercase">illus. IDIOTQUANT</span>
                            <div className="flex items-center gap-2 group cursor-help" onMouseEnter={pauseRotation} onMouseLeave={resumeRotation}>
                                <span className="text-xs font-black text-zinc-800 tracking-widest">{gradeTheme.rarity}</span>
                                <span className="text-[10px] font-black text-white bg-zinc-900 px-2 py-0.5 rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.3)]">{grade}</span>
                                <div className={`${tooltipBaseClass} bottom-full right-0 mb-2`} style={inverseTransformStyle}>
                                    <div className="font-bold text-pink-400 mb-1 border-b border-white/10 pb-1 italic">{gradeTheme.label}</div>
                                    <span className="text-zinc-100">{gradeTheme.desc}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};