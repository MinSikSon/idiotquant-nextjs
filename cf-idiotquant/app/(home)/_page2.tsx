"use client";
import React, { useState, useEffect } from 'react';
import { StockCard } from '../(search)/search/components/StockCard';



// 2. 메인 페이지 컴포넌트
export default function IdiotQuantReborn() {
    const [stocks, setStocks] = useState([
        { id: 1, name: '삼성전자', grade: 'S', fairValue: 85000, undervaluedScore: 75, per: 12.5, pbr: 1.2 },
        { id: 2, name: '현대차', grade: 'SS', fairValue: 320000, undervaluedScore: 92, per: 5.4, pbr: 0.6 },
    ]);

    const [activeTab, setActiveTab] = useState('market'); // market, myDeck, community

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            {/* 네비게이션 */}
            <nav className="flex justify-around p-4 border-b border-gray-800 bg-gray-900 sticky top-0 z-50">
                <button onClick={() => setActiveTab('market')} className={`${activeTab === 'market' ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>마켓 탐색</button>
                <button onClick={() => setActiveTab('myDeck')} className={`${activeTab === 'myDeck' ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>나의 카드덱</button>
                <button onClick={() => setActiveTab('community')} className={`${activeTab === 'community' ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>전략 공유소</button>
            </nav>

            <main className="p-6">
                {activeTab === 'market' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-6">오늘의 저평가 레이드 종목</h2>
                        <div className="flex flex-wrap gap-6 justify-center">
                            {stocks.map(stock => <StockCard key={stock.id} stock={stock} />)}
                        </div>
                    </div>
                )}

                {activeTab === 'community' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gray-900 p-4 rounded-lg mb-6 border border-gray-800">
                            <textarea
                                className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500"
                                placeholder="오늘의 투자 전략을 카드로 인증하세요..."
                            // rows="3"
                            ></textarea>
                            <div className="flex justify-between mt-2">
                                <button className="bg-gray-800 px-3 py-1 rounded text-sm text-gray-300">+ 카드 첨부</button>
                                <button className="bg-yellow-500 text-black px-4 py-1 rounded font-bold">포스트</button>
                            </div>
                        </div>

                        {/* 샘플 포스트 */}
                        <div className="border-b border-gray-800 py-4">
                            <p className="font-bold text-sm text-blue-400">@QuantMaster</p>
                            <p className="mt-2 text-gray-300">현대차 현재 SS급 떴네요. 지표상으로 완벽한 매수 타이밍입니다.</p>
                            <div className="mt-3 flex justify-center scale-75 origin-top-left">
                                <StockCard stock={stocks[1]} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'myDeck' && (
                    <div className="text-center py-20">
                        <h2 className="text-xl text-gray-500 font-bold italic">"수집한 카드가 없습니다. 첫 종목을 탐색해보세요!"</h2>
                        <button
                            onClick={() => setActiveTab('market')}
                            className="mt-4 bg-yellow-500 text-black px-6 py-2 rounded-full font-bold"
                        >
                            종목 뽑으러 가기
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}