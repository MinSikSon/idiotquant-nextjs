"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon, Tag, Card, Elevation } from "@blueprintjs/core";
import { StockCard } from '../(search)/search/components/StockCard';

// BlueprintJS CSS
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

export default function IdiotQuantReborn() {
    const [stocks] = useState([
        { id: "samsung", name: '삼성전자', isUs: false, grade: { grade: 'SSS', color: 'text-yellow-500', cardGradeColor: 'from-yellow-500/30' }, fairValue: "8.5만", undervaluedScore: 75, per: "12.5", pbr: "1.2" },
        { id: "hyundai", name: '현대차', isUs: false, grade: { grade: 'SS', color: 'text-orange-500', cardGradeColor: 'from-orange-500/20' }, fairValue: "32만", undervaluedScore: 92, per: "5.4", pbr: "0.6" },
        { id: "apple", name: 'Apple', isUs: true, grade: { grade: 'S', color: 'text-emerald-400', cardGradeColor: 'from-emerald-500/20' }, fairValue: "$215", undervaluedScore: 85, per: "28.4", pbr: "35.2" },
        { id: "tesla", name: 'Tesla', isUs: true, grade: { grade: 'A', color: 'text-blue-400', cardGradeColor: 'from-blue-500/20' }, fairValue: "$250", undervaluedScore: 40, per: "65.1", pbr: "12.4" },
        { id: "nvidia", name: 'NVIDIA', isUs: true, grade: { grade: 'SSS', color: 'text-purple-500', cardGradeColor: 'from-purple-500/20' }, fairValue: "$125", undervaluedScore: 98, per: "75.2", pbr: "45.1" },
        { id: "microsoft", name: 'Microsoft', isUs: true, grade: { grade: 'SS', color: 'text-blue-500', cardGradeColor: 'from-blue-500/20' }, fairValue: "$420", undervaluedScore: 70, per: "35.2", pbr: "12.8" },
        { id: "google", name: 'Alphabet', isUs: true, grade: { grade: 'S', color: 'text-red-400', cardGradeColor: 'from-red-500/20' }, fairValue: "$170", undervaluedScore: 65, per: "22.1", pbr: "6.4" },
        { id: "amazon", name: 'Amazon', isUs: true, grade: { grade: 'A', color: 'text-orange-300', cardGradeColor: 'from-orange-300/20' }, fairValue: "$185", undervaluedScore: 55, per: "52.4", pbr: "8.2" },
        { id: "meta", name: 'Meta', isUs: true, grade: { grade: 'S', color: 'text-blue-600', cardGradeColor: 'from-blue-600/20' }, fairValue: "$490", undervaluedScore: 88, per: "24.5", pbr: "7.1" },
    ]);

    return (
        <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-8">
            {/* 컴팩트 헤더 */}
            <header className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-2">
                    <Icon icon="style" size={18} className="text-yellow-500" />
                    <h1 className="text-sm md:text-xl font-black tracking-tight uppercase">
                        Quant <span className="opacity-40 font-light">3xN</span>
                    </h1>
                </div>
                <Tag minimal round intent="warning" className="text-[9px]">2026_LIVE</Tag>
            </header>

            {/* 초소형 3열 그리드 */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-4 max-w-5xl mx-auto">
                {stocks.map((stock) => (
                    <motion.div
                        key={stock.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.95 }} // 모바일 터치 피드백
                        className="relative w-full cursor-pointer"
                    >
                        {/* StockCard의 크기를 줄이기 위한 전략:
                          1. 부모에서 overflow-hidden으로 삐져나오는 컨텐츠 방지
                          2. 내부 텍스트 크기를 줄이기 위한 폰트 스케일링 적용
                        */}
                        <Card
                            elevation={Elevation.TWO}
                            interactive={true}
                            className="bp5-dark !p-0 !bg-transparent border-none overflow-hidden rounded-xl"
                        >
                            <div className="relative transform-gpu scale-100 sm:scale-100 text-[0.6rem] sm:text-xs">
                                {/* 기존 StockCard를 그대로 가져다 쓰되, 작은 공간에 맞춰 렌더링 */}
                                <StockCard stock={stock} />
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <footer className="mt-16 text-center opacity-20 py-8">
                <Icon icon="dot" />
                <p className="text-[8px] tracking-[0.4em] mt-2 uppercase font-bold">End of Dashboard</p>
            </footer>
        </div>
    );
}