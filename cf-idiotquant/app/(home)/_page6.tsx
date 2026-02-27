"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Elevation, Tag, Icon, Divider } from "@blueprintjs/core";

// BlueprintJS CSS
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

export default function IdiotQuantReborn() {
    const [stocks] = useState([
        { id: "samsung", name: '삼성전자', ticker: '005930', isUs: false, grade: 'SSS', color: 'text-yellow-500', score: 98, price: "72,400", change: "+1.2%" },
        { id: "apple", name: 'Apple', ticker: 'AAPL', isUs: true, grade: 'S', color: 'text-emerald-400', score: 85, price: "$214.3", change: "-0.5%" },
        { id: "tesla", name: 'Tesla', ticker: 'TSLA', isUs: true, grade: 'A', color: 'text-blue-400', score: 40, price: "$248.1", change: "+4.2%" },
        { id: "nvidia", name: 'NVIDIA', ticker: 'NVDA', isUs: true, grade: 'SSS', color: 'text-purple-500', score: 99, price: "$124.5", change: "+2.8%" },
        { id: "hyundai", name: '현대차', ticker: '005380', isUs: false, grade: 'SS', color: 'text-orange-500', score: 92, price: "245,000", change: "+0.8%" },
        { id: "meta", name: 'Meta', ticker: 'META', isUs: true, grade: 'S', color: 'text-blue-600', score: 88, price: "$492.4", change: "-1.1%" },
    ]);

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 p-3 md:p-10 font-sans">
            {/* Header Area */}
            <header className="max-w-7xl mx-auto mb-10 flex justify-between items-end px-2">
                <div>
                    <h1 className="text-2xl font-black tracking-tight mb-1">MARKET ANALYTICS</h1>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Real-time Quant Scoring System</p>
                </div>
                <div className="hidden md:block">
                    <Tag large minimal round intent="primary" icon="refresh">UPDATED 2026.02.27</Tag>
                </div>
            </header>

            {/* Grid System (Mobile 3-cols) */}
            <div className="grid grid-cols-3 gap-2 md:gap-6 max-w-7xl mx-auto">
                {stocks.map((stock) => (
                    <StockGridCard key={stock.id} stock={stock} />
                ))}
            </div>
        </div>
    );
}

const StockGridCard = ({ stock }: any) => {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <Card
                elevation={Elevation.THREE}
                interactive={true}
                className="!p-0 !bg-[#16161a] border border-white/5 rounded-2xl overflow-hidden group"
            >
                {/* 상단 장식바 (등급별 색상) */}
                <div className={`h-1 w-full bg-current ${stock.color}`} />

                <div className="p-2.5 md:p-5">
                    {/* Top Section: Ticker & Flag */}
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 tracking-tighter uppercase leading-none mb-1">
                                {stock.ticker}
                            </span>
                            <h3 className="text-[10px] md:text-lg font-black tracking-tight truncate max-w-[60px] md:max-w-none">
                                {stock.name}
                            </h3>
                        </div>
                        <Icon icon={stock.isUs ? "globe-network" : "map-marker"} size={12} className="opacity-20 hidden md:block" />
                    </div>

                    {/* Middle Section: Grade & Score */}
                    <div className="flex items-center gap-2 mb-3 md:mb-5">
                        <div className={`text-xl md:text-4xl font-black italic tracking-tighter ${stock.color}`}>
                            {stock.grade}
                        </div>
                        <div className="h-6 md:h-10 w-[1px] bg-zinc-800" />
                        <div className="flex flex-col">
                            <span className="text-[7px] md:text-[9px] font-bold text-zinc-600 leading-none mb-1 uppercase">Score</span>
                            <span className="text-xs md:text-xl font-bold tracking-tight text-zinc-300">{stock.score}</span>
                        </div>
                    </div>

                    <Divider className="opacity-10 mb-2 md:mb-4" />

                    {/* Bottom Section: Price & Change */}
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase leading-none mb-1">Price</span>
                            <span className="text-[10px] md:text-base font-black tracking-tight">{stock.price}</span>
                        </div>
                        <div className={`px-1.5 py-0.5 rounded text-[8px] md:text-xs font-bold ${stock.change.includes('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {stock.change}
                        </div>
                    </div>
                </div>

                {/* Hover Reveal Bottom Bar */}
                <div className="bg-zinc-800/50 py-1 text-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                    <span className="text-[8px] font-black tracking-[0.3em] text-zinc-400 uppercase">Analysis Report</span>
                </div>
            </Card>
        </motion.div>
    );
};