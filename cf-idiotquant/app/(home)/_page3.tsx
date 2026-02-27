"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion'; // npm install framer-motion 필요
import { StockCard } from '../(search)/search/components/StockCard';

// 1. 객체 뒤에 'as const'를 붙여서 타입을 고정합니다.
const fadeInUp = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, margin: "-50px" },
    transition: {
        duration: 0.6,
        ease: "easeOut" // 이제 TS가 이 값이 절대 변하지 않는 "easeOut"임을 압니다.
    }
} as const; // 이 부분이 핵심입니다.

export default function IdiotQuantReborn() {
    const [stocks] = useState([
        {
            id: 1, name: '삼성전자',
            grade: { grade: 'S', color: 'text-orange-500', cardGradeColor: 'from-orange-500/20 to-transparent' },
            fairValue: 85000, undervaluedScore: 75, per: 12.5, pbr: 1.2
        },
        {
            id: 2, name: '현대차',
            grade: { grade: 'SS', color: 'text-yellow-500', cardGradeColor: 'from-yellow-500/30 via-amber-500/10 to-transparent' },
            fairValue: 320000, undervaluedScore: 92, per: 5.4, pbr: 0.6
        },
        // 스크롤 효과를 확인하기 위한 더미 데이터 추가
        { id: 3, name: 'SK하이닉스', grade: { grade: 'A', color: 'text-green-500', cardGradeColor: 'from-green-500/20' }, fairValue: 180000, undervaluedScore: 65, per: 15, pbr: 1.5 },
        { id: 4, name: 'LG에너지솔루션', grade: { grade: 'B', color: 'text-blue-500', cardGradeColor: 'from-blue-500/20' }, fairValue: 450000, undervaluedScore: 40, per: 45, pbr: 4.2 },
    ]);

    const [activeTab, setActiveTab] = useState('market');

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500 selection:text-black">
            {/* 네비게이션 */}
            <nav className="flex justify-around p-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
                {['market', 'myDeck', 'community'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative py-2 px-4 transition-all ${activeTab === tab ? 'text-yellow-400 font-black' : 'text-zinc-500 font-bold hover:text-zinc-300'}`}
                    >
                        {tab === 'market' && '마켓 탐색'}
                        {tab === 'myDeck' && '나의 카드덱'}
                        {tab === 'community' && '전략 공유소'}
                        {activeTab === tab && (
                            <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 rounded-full" />
                        )}
                    </button>
                ))}
            </nav>

            <main className="p-6 max-w-7xl mx-auto">
                {activeTab === 'market' && (
                    <div className="flex flex-col items-center">
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-3xl font-black mb-10 self-start tracking-tighter"
                        >
                            오늘의 <span className="text-yellow-500 uppercase">저평가 레이드</span> 종목
                        </motion.h2>

                        {/* 카드 리스트: 세로로 나열되면서 하나씩 튀어나옴 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {stocks.map((stock, index) => (
                                <motion.div
                                    key={stock.id}
                                    {...fadeInUp}
                                    transition={{ ...fadeInUp.transition, delay: (index % 3) * 0.1 }} // 가로 한 줄에서 순차적 등장
                                >
                                    <StockCard stock={stock} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'community' && (
                    <div className="max-w-2xl mx-auto py-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900 p-6 rounded-[2rem] mb-10 border border-white/5 shadow-2xl"
                        >
                            <textarea
                                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-zinc-600 text-lg resize-none"
                                placeholder="오늘의 투자 전략을 카드로 인증하세요..."
                                rows={3}
                            ></textarea>
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                <button className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold">
                                    <span className="text-xl">+</span> 카드 첨부
                                </button>
                                <button className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                                    포스트
                                </button>
                            </div>
                        </motion.div>

                        {/* 샘플 포스트 */}
                        <motion.div
                            {...fadeInUp}
                            className="border-t border-white/5 py-10 group"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-black text-black">Q</div>
                                <div>
                                    <p className="font-black text-blue-400 tracking-tighter">@QuantMaster</p>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">2 hours ago</p>
                                </div>
                            </div>
                            <p className="mb-6 text-zinc-300 leading-relaxed font-medium">
                                현대차 현재 <span className="text-yellow-500 font-bold italic underline underline-offset-4 font-black text-xl px-1">SS급</span> 떴네요.
                                지표상으로 완벽한 매수 타이밍입니다. NCAV 전략 기준으로 안전마진 40% 확보됨.
                            </p>
                            <div className="flex justify-start transform transition-transform group-hover:scale-[1.01] duration-500 origin-left">
                                <StockCard stock={stocks[1]} />
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* '나의 카드덱' 탭 생략 (비슷한 방식으로 구현 가능) */}
            </main>
        </div>
    );
}