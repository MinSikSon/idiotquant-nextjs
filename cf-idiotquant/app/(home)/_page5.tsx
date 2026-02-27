"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StockCard } from '../(search)/search/components/StockCard';

export default function IdiotQuantReborn() {
    const [stocks] = useState([
        { id: "samsung", name: '삼성전자', isUs: false, grade: { grade: 'SSS', color: 'text-yellow-500', cardGradeColor: 'from-yellow-500/30 via-amber-500/10 to-transparent' }, fairValue: "85,000", undervaluedScore: 75, per: "12.5", pbr: "1.2" },
        { id: "hyundai", name: '현대차', isUs: false, grade: { grade: 'SS', color: 'text-orange-500', cardGradeColor: 'from-orange-500/20 to-transparent' }, fairValue: "320,000", undervaluedScore: 92, per: "5.4", pbr: "0.6" },
        { id: "apple", name: 'Apple', isUs: true, grade: { grade: 'S', color: 'text-emerald-400', cardGradeColor: 'from-emerald-500/20 to-transparent' }, fairValue: "$215", undervaluedScore: 85, per: "28.4", pbr: "35.2" },
        { id: "tesla", name: 'Tesla', isUs: true, grade: { grade: 'A', color: 'text-blue-400', cardGradeColor: 'from-blue-500/20' }, fairValue: "$250", undervaluedScore: 40, per: "65.1", pbr: "12.4" },
        { id: "nvidia", name: 'NVIDIA', isUs: true, grade: { grade: 'SSS', color: 'text-purple-500', cardGradeColor: 'from-purple-500/20' }, fairValue: "$125", undervaluedScore: 98, per: "75.2", pbr: "45.1" },
    ]);

    // 현재 어떤 카드가 확장되어 있는지 관리
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
        <div className="h-screen bg-black text-white overflow-y-auto scroll-snap-type-y-mandatory scrollbar-hide">
            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                html { scroll-snap-type: y mandatory; }
            `}</style>

            <div className="flex flex-col items-center">
                {stocks.map((stock, index) => (
                    <CardWrapper
                        key={stock.id}
                        stock={stock}
                        index={index}
                        total={stocks.length}
                        isExpanded={expandedId === stock.id}
                        onExpand={() => setExpandedId(stock.id === expandedId ? null : stock.id)}
                        onCollapse={() => setExpandedId(null)}
                    />
                ))}
                <div className="h-[30vh] w-full" />
            </div>
        </div>
    );
}

const CardWrapper = ({ stock, index, total, isExpanded, onExpand, onCollapse }: any) => {
    return (
        <section
            className="h-screen w-full flex items-center justify-center sticky top-0 transition-all duration-700 ease-in-out px-6"
            style={{
                scrollSnapAlign: 'center',
                // 확장되었을 때는 마진을 0으로 만들어 다음 카드들을 아래로 밀어냄
                marginBottom: isExpanded || index === total - 1 ? '0vh' : '-68vh',
                zIndex: isExpanded ? 100 : 10 + index
            }}
        >
            <motion.div
                // 슬라이드 시 상태 초기화 (화면에서 벗어나면 자동으로 접힘)
                onViewportLeave={() => onCollapse()}
                initial={{ opacity: 0, y: 80, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ amount: 0.5 }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                onClick={onExpand}
                className="relative w-full max-w-sm cursor-pointer"
            >
                <motion.div
                    // 클릭 시 살짝 커지거나 강조되는 효과
                    animate={{
                        scale: isExpanded ? 1.05 : 1,
                        y: isExpanded ? -20 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative transition-shadow duration-500"
                    style={{
                        boxShadow: isExpanded ? '0 0 50px rgba(255,255,255,0.1)' : 'none'
                    }}
                >
                    <StockCard stock={stock} />

                    {/* 확장 시 나타나는 상세 안내 문구 (선택 사항) */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="absolute -bottom-12 left-0 right-0 text-center"
                            >
                                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest animate-pulse">
                                    Full Analysis View
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* 위치 표시기 */}
                {!isExpanded && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 translate-x-full hidden md:flex">
                        <div className="h-12 w-[2px] bg-zinc-800 rounded-full" />
                        <span className="text-[10px] font-mono font-bold text-zinc-600">
                            {String(index + 1).padStart(2, '0')}
                        </span>
                    </div>
                )}
            </motion.div>
        </section>
    );
};